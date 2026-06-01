---
name: github-login-onboarding
description: Safely guide GitHub setup for the lesson. Use when the user needs GitHub CLI, SSH key, gh auth, github-login, clone, pull, push, remote, or GitHub connectivity setup and verification for WSL/Ubuntu without exposing secrets or duplicating existing configuration.
---

# GitHub Login Onboarding

## Workflow

1. Read `AGENTS.MD`.
2. Use `github-login-setup-guide.md` as the source of truth.
3. Ask one question at a time.
4. Never ask for passwords, SSH passphrases, 2FA codes, or OAuth device codes.
5. Check existing `git`, `ssh`, `gh`, SSH keys, SSH config, Git identity, and `gh auth status` before creating anything.
6. Reuse existing valid configuration when the learner approves it.
7. Add GitHub SSH keys with `gh ssh-key add` when possible.
8. Treat `github-login` success as the setup completion signal.

## Safety Rules

- Do not print private key contents.
- Do not overwrite `~/.ssh/config` or shell startup files.
- Do not duplicate aliases or config blocks.
- Explain authentication steps briefly and let the learner type secrets directly in the terminal or browser.

## References

Read `references/github-login.md` for the command sequence and completion checks.
