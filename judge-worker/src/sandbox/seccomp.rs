use anyhow::Result;

// Stub implementation for seccomp security
// TODO: Implement proper seccomp filter when libseccomp-sys API is clear
pub fn apply_seccomp(_pid: u32) -> Result<()> {
    Ok(())
}
