# Security Policy

We take the security of CodeNexus seriously. If you believe you have found a security vulnerability in this project, please report it to us privately as described below.

## Supported Versions

Only the latest release/branch is actively supported for security updates.

| Version | Supported |
| ------- | --------- |
| >= 0.1.0| ✅ Yes     |
| < 0.1.0 | ❌ No      |

## Reporting a Vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

If you discover a vulnerability, please report it privately to our maintainer at:
📧 **[titaniumxie@icloud.com](mailto:titaniumxie@icloud.com)**

Please include the following information in your report:
* A detailed description of the vulnerability.
* Steps to reproduce the issue (including proof of concept scripts or screenshots if applicable).
* The potential impact of the vulnerability.

We will acknowledge receipt of your report within **48 hours** and provide a status update along with an estimated timeline for a fix. We ask that you keep the report confidential until we can address and resolve the vulnerability.

## Our Security Standards

CodeNexus implements several advanced security mechanisms to safeguard execution:
* **Privilege Dropping**: Sandbox processes drop privileges to `nobody:nogroup`.
* **Seccomp Filters**: System calls are locked down with a strict deny-by-default filter limiting execution to only what is necessary.
* **Namespaces & CGroups**: Kernel-level isolation is applied to CPU, memory, and networking parameters to prevent resource-exhaustion and local network breakout attacks.

If you find ways to bypass these layers (e.g., escaping the Rust judge-worker sandbox), we are highly interested in your report!
