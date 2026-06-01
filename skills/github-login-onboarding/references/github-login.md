# GitHub Login Reference

Primary source: `github-login-setup-guide.md`.

## Read First

```text
github-login-setup-guide.md
```

## Common Checks

```bash
git --version
ssh -V
gh --version
gh auth status -h github.com
ssh -T github.com
```

## Completion

Setup is complete when the learner can run the repository's GitHub login check successfully and GitHub connectivity is confirmed.

For repository operations, also verify:

```bash
git remote -v
git status --short --branch
git pull
git push
```
