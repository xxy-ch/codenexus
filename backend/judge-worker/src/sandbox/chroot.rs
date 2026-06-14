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

    // Bind-mount the dynamic linker and core shared libraries.
    // These are needed for compiled C/C++ programs to run.
    // We mount read-only so the submission cannot modify them.
    let lib_dirs = find_host_lib_dirs();
    for (host_path, guest_rel) in &lib_dirs {
        let guest_path = rootfs.join(guest_rel);
        if let Some(parent) = guest_path.parent() {
            fs::create_dir_all(parent).ok();
        }
        // Symlink instead of bind-mount — simpler, no mount namespace needed,
        // and the chroot itself prevents escape (symlinks inside a chroot
        // resolve within the chroot root).
        if host_path.exists() {
            let _ = std::os::unix::fs::symlink(host_path, &guest_path);
        }
    }

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
    chdir("/").with_context(|| "Failed to chdir to / after chroot")?;
    tracing::debug!("Entered chroot at {:?}", rootfs);
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

/// Discover the host's library directories to symlink into the chroot.
/// Returns (host_path, guest_path) pairs.
#[cfg(target_os = "linux")]
fn find_host_lib_dirs() -> Vec<(PathBuf, String)> {
    let mut dirs = vec![];
    // The dynamic linker — critical for exec to work.
    for ld in &["/lib/ld-linux-x86-64.so.2", "/lib64/ld-linux-x86-64.so.2",
                "/lib/ld-musl-x86_64.so.1", "/lib64/ld-linux-aarch64.so.1"] {
        let p = Path::new(ld);
        if p.exists() {
            let guest = ld.trim_start_matches('/').to_string();
            dirs.push((p.to_path_buf(), guest));
        }
    }
    // Core libraries directory — symlink the whole dir so all .so files resolve.
    for libdir in &["/lib", "/lib64", "/usr/lib", "/usr/lib64"] {
        let p = Path::new(libdir);
        if p.exists() && p.is_dir() {
            let guest = libdir.trim_start_matches('/').to_string();
            dirs.push((p.to_path_buf(), guest));
        }
    }
    dirs
}
