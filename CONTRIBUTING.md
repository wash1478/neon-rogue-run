# Contributing — Neon Rogue Run

Thanks for contributing! This document explains our lightweight workflow and expectations.

Branches & workflow
- main: always stable and deployable (production). Only merged changes via PR.
- develop: integration/testing branch. Merge feature branches here for QA before merging to main.
- feature/<name>: short-lived branches for individual features or bug fixes.

Pull requests
- Open a PR from your feature branch to develop (or main if urgent).
- In PR description include: what changed, how to test, and any risk notes.
- Keep PRs small and focused; aim for changes that are easy to review.

Commits
- Use short, descriptive commit messages:
  - Feature: Added dual joystick aiming
  - Fix: Fixed game-over condition
  - Chore: Update dependencies

Code quality
- Keep logic simple and avoid large single-file edits when possible.
- Document non-obvious choices in PR description or inline comments.

Testing & deployment
- Merge into develop for integration testing.
- After QA, create a PR from develop → main and merge when ready.
- Tag releases on main using semantic versioning (v0.1.0).

Pushing changes
- git checkout -b feature/<name>
- make changes, git add, git commit
- git push origin feature/<name>
- Open a PR to develop

Security
- Do not commit secrets, keys, or tokens to the repo. Use deploy keys or GitHub Secrets for CI.

Thanks — keep PRs small, testable, and well-documented.
