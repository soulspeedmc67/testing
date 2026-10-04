# DASHit Agent Instructions

## App Store & Google Play Compliance (Mandatory Gate)
For any iOS or Android work, always adhere to the Apple App Store Review Guidelines and Google Play Developer Program Policies. Run the pre-submission compliance audit (`bash ~/.claude/hooks/app-store-compliance-guard.sh .` or using the `app-store-compliance` skill) before any release or submission. Never report an app clear to submit while a critical rejection risk stands.

## Git Commit & Author Identity (Strict Requirement)
All commits, git operations, and pushes MUST strictly use the official verified GitHub author credentials:
- **Author Name**: `AleemKanyu`
- **Author Email**: `kanyualeem416@gmail.com`
- **GitHub Account**: `@AleemKanyu`

Never commit using arbitrary, unverified, or agent-default emails (e.g. `noreply@anthropic.com`, `aleemkanyu@gmail.com`, or local machine accounts). When making commits, ensure:
```bash
git -c user.name="AleemKanyu" -c user.email="kanyualeem416@gmail.com" commit -m "<message>"
```
or verify `git config user.email` returns `kanyualeem416@gmail.com` prior to committing, so all contributions and streaks are properly credited to the official GitHub profile.
