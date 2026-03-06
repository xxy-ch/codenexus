use std::process::Command;

#[test]
fn test_docker_available() {
    let output = Command::new("docker").arg("--version").output();

    match output {
        Ok(output) => {
            assert!(output.status.success(), "Docker should be available");
            println!(
                "Docker version: {}",
                String::from_utf8_lossy(&output.stdout)
            );
        }
        Err(_) => {
            panic!("Docker is not available: {:?}", output);
        }
    }
}
