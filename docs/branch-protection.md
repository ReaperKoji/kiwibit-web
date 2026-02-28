# Branch Protection (Enterprise Baseline)

Apply this policy to `main` and `release`:

1. Require pull request before merging.
2. Require approvals: minimum 2 reviewers.
3. Require review from Code Owners.
4. Dismiss stale reviews on new commits.
5. Require conversation resolution before merge.
6. Require status checks to pass:
   `CI / quality`
   `Smoke / smoke`
7. Require branches to be up to date before merge.
8. Restrict who can push directly:
   no direct push for non-admin users.
9. Enable merge queue (if available).
10. Block force-push and branch deletion.

Recommended release policy:

1. `main` accepts PRs only.
2. `release` accepts PRs from `main` only.
3. Tag releases after smoke workflow passes.
