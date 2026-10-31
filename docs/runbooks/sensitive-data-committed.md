<!--
SPDX-FileCopyrightText: 2026 CancelSpec contributors
SPDX-License-Identifier: CC-BY-4.0
-->

# Runbook: Emergency Removal of Committed Sensitive Data

## Context

CancelSpec strictly mandates synthetic test data only. However, if a contributor accidentally commits personal banking information, account numbers, or real credentials to the public git repository, immediate containment is required.

## Response Procedures

### 1. Identify the Offending Commit & Scope
1. Locate the exact commit hash and affected files:
   ```bash
   git log -S "sensitive_string" --source --all
   ```
2. Check if the commit has been pushed to the remote `origin/main` or PR branches.

### 2. Immediate Token / Credential Revocation (If Applicable)
If an API key, signing credential, or auth token was committed:
- **Immediately revoke the credential at the provider.** Do not wait for git history rewriting to revoke the token.

### 3. Git History Rewrite using git-filter-repo
Do not use `git rm` (which leaves the file in past history). Use `git-filter-repo`:

```bash
# 1. Install git-filter-repo (Python tool)
pip install git-filter-repo

# 2. Make a fresh mirror clone of the repo in a clean directory
git clone --mirror git@github.com:cancelspec/cancelspec.git repo-cleanup
cd repo-cleanup

# 3. Completely scrub the offending file across all history
git filter-repo --invert-paths --path path/to/sensitive-file.csv

# 4. Or scrub a specific string/pattern across all files
# (Create a replace text file: regex:SENSITIVE_STRING==>REDACTED)
git filter-repo --replace-text expressions.txt

# 5. Re-add origin and force push all branches and tags
git remote add origin git@github.com:cancelspec/cancelspec.git
git push origin --force --all
git push origin --force --tags
```

### 4. GitHub Cache Purge & Verification
1. Contact GitHub Support or use GitHub repository settings to request garbage collection and purge cached PR diffs.
2. Verify with `git log` that the sensitive data no longer appears in any commit history.
3. Notify all contributors to re-clone or re-base their local working trees.
