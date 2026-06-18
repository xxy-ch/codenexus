use anyhow::{Context, Result};
use nix::unistd::{chdir, chroot, setgid, setuid, Gid, Uid};
use std::{fs, path::Path, path::PathBuf};

const SANDBOX_USER: Uid = Uid::from_raw(1000);
const SANDBOX_GROUP: Gid = Gid::from_raw(1000);

pub struct ChrootEnvironment {
    pub root_path: PathBuf,
    pub original_pid: i32,
}

impl ChrootEnvironment {
    pub fn new(root_path: &Path, original_pid: i32) -> Result<Self> {
        if !root_path.exists() {
            fs::create_dir_all(root_path).with_context(|| {
                format!("Failed to create sandbox root directory: {:?}", root_path)
            })?;
        }

        let proc_path = root_path.join("proc");
        fs::create_dir_all(&proc_path)
            .with_context(|| format!("Failed to create proc directory: {:?}", proc_path))?;

        let sys_path = root_path.join("sys");
        fs::create_dir_all(&sys_path)
            .with_context(|| format!("Failed to create sys directory: {:?}", sys_path))?;

        Ok(Self {
            root_path: root_path.to_path_buf(),
            original_pid,
        })
    }

    pub fn setup(&self) -> Result<()> {
        chroot(&self.root_path)
            .with_context(|| format!("Failed to chroot to {:?}", self.root_path))?;
        chdir("/").with_context(|| "Failed to chdir to /")?;

        // Drop group BEFORE user: once setuid discards root we lose CAP_SETGID,
        // so a subsequent setgid would fail. Order must be setgid -> setuid.
        setgid(SANDBOX_GROUP).with_context(|| "Failed to set GID")?;
        setuid(SANDBOX_USER).with_context(|| "Failed to set UID")?;

        Ok(())
    }

    pub fn enter(&self) -> Result<()> {
        let uid = unsafe { libc::getuid() };
        let gid = unsafe { libc::getgid() };

        tracing::debug!("Dropped to UID={:?}, GID={:?}", uid, gid);

        Ok(())
    }
}

/// Drop privileges to the nobody user in a child process.
///
/// Called from pre_exec to ensure user-submitted code runs as an
/// unprivileged user, not root. Combined with no-new-privs and seccomp,
/// this prevents privilege escalation from submitted code.
///
/// Returns an error if privilege drop fails — the process will abort
/// rather than run as root.
pub fn drop_privileges_to_nobody() -> Result<()> {
    #[cfg(target_os = "linux")]
    {
        let current_uid = unsafe { libc::getuid() };
        let current_gid = unsafe { libc::getgid() };

        if current_uid != 0 {
            if current_gid == 0 {
                return Err(anyhow::anyhow!(
                    "Privilege drop verification failed: running with root group (uid={}, gid={})",
                    current_uid,
                    current_gid
                ));
            }
            return Ok(());
        }

        let nobody_uid = Uid::from_raw(65534);
        let nobody_gid = Gid::from_raw(65534);

        setgid(nobody_gid).with_context(|| "Failed to drop GID to nobody")?;
        setuid(nobody_uid).with_context(|| "Failed to drop UID to nobody")?;

        // Verify we actually dropped
        let uid = unsafe { libc::getuid() };
        let gid = unsafe { libc::getgid() };
        if uid == 0 || gid == 0 {
            return Err(anyhow::anyhow!(
                "Privilege drop verification failed: still running as root (uid={}, gid={})",
                uid,
                gid
            ));
        }
    }

    Ok(())
}

/// Apply hard resource limits in the child process (pre_exec).
///
/// These RLIMITs are independent of cgroups and provide defense-in-depth:
/// - RLIMIT_NOFILE: caps the number of open file descriptors, preventing
///   FD exhaustion and DoS.
/// - RLIMIT_FSIZE: caps the maximum file size a process can create,
///   preventing /tmp and workdir disk exhaustion.
///
/// The limits are set BEFORE drop_privileges_to_nobody, so the child
/// inherits them. Because `prlimit64` is removed from the seccomp
/// allow-list, user code cannot raise these limits after exec.
#[cfg(target_os = "linux")]
pub fn apply_rlimits() -> Result<()> {
    use libc::{setrlimit, rlimit};

    // Max 256 open file descriptors (generous for any real program).
    let nofile = rlimit {
        rlim_cur: 256,
        rlim_max: 256,
    };
    let ret = unsafe { setrlimit(libc::RLIMIT_NOFILE, &nofile) };
    if ret != 0 {
        return Err(anyhow::anyhow!(
            "setrlimit(RLIMIT_NOFILE) failed: errno {}",
            unsafe { *libc::__errno_location() }
        ));
    }

    // Max 64 MiB per file write — prevents disk exhaustion via large writes.
    let fsize = rlimit {
        rlim_cur: 64 * 1024 * 1024,
        rlim_max: 64 * 1024 * 1024,
    };
    let ret = unsafe { setrlimit(libc::RLIMIT_FSIZE, &fsize) };
    if ret != 0 {
        return Err(anyhow::anyhow!(
            "setrlimit(RLIMIT_FSIZE) failed: errno {}",
            unsafe { *libc::__errno_location() }
        ));
    }

    // Max 64 processes/threads — defense-in-depth alongside cgroup pids.max.
    let nproc = rlimit {
        rlim_cur: 64,
        rlim_max: 64,
    };
    let ret = unsafe { setrlimit(libc::RLIMIT_NPROC, &nproc) };
    if ret != 0 {
        // RLIMIT_NPROC applies to the real UID; as nobody it may already be
        // near the limit from other submissions. Log but do not abort — the
        // cgroup pids.max is the authoritative control.
        tracing::warn!(
            "setrlimit(RLIMIT_NPROC) failed (errno {}), relying on cgroup pids.max",
            unsafe { *libc::__errno_location() }
        );
    }

    Ok(())
}

#[cfg(not(target_os = "linux"))]
pub fn apply_rlimits() -> Result<()> {
    Ok(())
}

// ---------------------------------------------------------------------------
// Filesystem isolation via chroot with minimal rootfs
// ---------------------------------------------------------------------------

/// Prepare a minimal chroot rootfs for running user-submitted code.
///
/// Creates a temporary directory containing:
/// - The user's work directory (source, executable, test I/O files)
/// - Bind-mounted system libraries (libc, ld-linux, libm, libpthread, etc.)
/// - /dev/null (for stdin redirection)
/// - A writable /tmp inside the chroot
///
/// This prevents the submission from accessing the host filesystem
/// (/etc/passwd, /proc/1/environ, other submissions, DB credentials).
/// The function is called by the PARENT process (requires root for mount);
/// the child then calls `enter_chroot` in pre_exec.
#[cfg(target_os = "linux")]
pub fn prepare_chroot_rootfs(work_dir: &Path) -> Result<PathBuf> {
    use std::os::unix::fs::PermissionsExt;

    // Create a per-submission rootfs under the work_dir's parent.
    let rootfs = work_dir.parent().unwrap_or(Path::new("/tmp/judge"))
        .join(format!("rootfs-{}", uuid::Uuid::new_v4().simple()));
    fs::create_dir_all(&rootfs)
        .with_context(|| format!("Failed to create rootfs at {:?}", rootfs))?;

    // Create essential directories inside the rootfs.
    for dir in &["work", "tmp", "lib", "lib64", "usr/lib", "usr/lib64", "dev"] {
        fs::create_dir_all(rootfs.join(dir))
            .with_context(|| format!("Failed to create rootfs dir: {}", dir))?;
    }

    // Copy the work directory contents into rootfs/work
    copy_dir_recursive(work_dir, &rootfs.join("work"))?;

    // Make /tmp writable by nobody (uid 65534) so the submission can use it.
    fs::set_permissions(rootfs.join("tmp"), fs::Permissions::from_mode(0o1777))?;

    copy_runtime_into_rootfs(&rootfs)?;

    // Create /dev/null inside the chroot.
    let dev_null = rootfs.join("dev/null");
    if !dev_null.exists() {
        use std::os::unix::fs::OpenOptionsExt;
        let _ = std::fs::OpenOptions::new()
            .create(true)
            .write(true)
            .mode(0o666)
            .open(&dev_null);
    }

    Ok(rootfs)
}

/// Enter the chroot in a child process (pre_exec). Must be called BEFORE
/// drop_privileges_to_nobody (chroot requires root).
#[cfg(target_os = "linux")]
pub fn enter_chroot(rootfs: &Path) -> Result<()> {
    chroot(rootfs).with_context(|| format!("Failed to chroot to {:?}", rootfs))?;
    chdir("/work")
        .or_else(|_| chdir("/"))
        .with_context(|| "Failed to chdir after chroot")?;
    Ok(())
}

#[cfg(not(target_os = "linux"))]
pub fn prepare_chroot_rootfs(_work_dir: &Path) -> Result<PathBuf> {
    Ok(PathBuf::from("/"))
}

#[cfg(not(target_os = "linux"))]
pub fn enter_chroot(_rootfs: &Path) -> Result<()> {
    Ok(())
}

/// Recursively copy a directory's contents.
#[cfg(target_os = "linux")]
fn copy_dir_recursive(src: &Path, dst: &Path) -> Result<()> {
    fs::create_dir_all(dst)?;
    for entry in fs::read_dir(src)? {
        let entry = entry?;
        let src_path = entry.path();
        let dst_path = dst.join(entry.file_name());
        let ft = entry.file_type()?;
        if ft.is_dir() {
            copy_dir_recursive(&src_path, &dst_path)?;
        } else if ft.is_file() {
            fs::copy(&src_path, &dst_path)?;
        } else if ft.is_symlink() {
            let target = fs::read_link(&src_path)?;
            let _ = std::os::unix::fs::symlink(target, &dst_path);
        }
    }
    Ok(())
}

/// Copy the minimal runtime needed by currently accepted submission languages.
///
/// Absolute symlinks into the host do not work after chroot, and bind mounts
/// would require mount cleanup on every submission. Copying these small runtime
/// slices keeps the rootfs self-contained while still avoiding a full /usr/lib
/// copy.
#[cfg(target_os = "linux")]
fn copy_runtime_into_rootfs(rootfs: &Path) -> Result<()> {
    for path in [
        "/lib",
        "/lib64",
        "/usr/lib/python3.11",
        "/usr/lib/libpython3.11.so.1.0",
        "/usr/lib/libstdc++.so",
        "/usr/lib/libstdc++.so.6",
        "/usr/lib/libstdc++.so.6.0.32",
        "/usr/lib/libgcc_s.so",
        "/usr/lib/libgcc_s.so.1",
        "/usr/bin/python3.11",
    ] {
        copy_host_path_into_rootfs(rootfs, Path::new(path))?;
    }

    let python_link = rootfs.join("usr/bin/python3");
    if !python_link.exists() {
        std::os::unix::fs::symlink("python3.11", &python_link)
            .with_context(|| format!("Failed to create {:?}", python_link))?;
    }

    Ok(())
}

#[cfg(target_os = "linux")]
fn copy_host_path_into_rootfs(rootfs: &Path, host_path: &Path) -> Result<()> {
    if !host_path.exists() {
        return Ok(());
    }

    let relative = host_path.strip_prefix("/").unwrap_or(host_path);
    let guest_path = rootfs.join(relative);
    if let Some(parent) = guest_path.parent() {
        fs::create_dir_all(parent)
            .with_context(|| format!("Failed to create runtime parent: {:?}", parent))?;
    }

    let metadata = fs::symlink_metadata(host_path)
        .with_context(|| format!("Failed to stat runtime path: {:?}", host_path))?;

    if metadata.file_type().is_symlink() {
        let target = fs::read_link(host_path)
            .with_context(|| format!("Failed to read symlink: {:?}", host_path))?;
        let _ = fs::remove_file(&guest_path);
        std::os::unix::fs::symlink(&target, &guest_path)
            .with_context(|| format!("Failed to copy symlink into rootfs: {:?}", guest_path))?;
    } else if metadata.is_dir() {
        copy_dir_recursive(host_path, &guest_path)?;
    } else if metadata.is_file() {
        fs::copy(host_path, &guest_path).with_context(|| {
            format!(
                "Failed to copy runtime file {:?} into {:?}",
                host_path, guest_path
            )
        })?;
        fs::set_permissions(&guest_path, metadata.permissions()).ok();
    }

    Ok(())
}
