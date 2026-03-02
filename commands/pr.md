---
description: Generate a GitHub pull request description using a structured template
---

# PR Guidelines:

Use the git cli to make a pr request. Make sure to wait for me verify if we can commit it. Dont commit without my authorization. Look at git diff from the main and our current branch to make this pr request.

Title
Short, descriptive title of the change.

Summary
What does this PR do?

What problem does it solve?

Context / Background
Link to issue(s), ticket(s), or spec.

Any relevant decisions or prior work.

Changes
Main change 1

Main change 2

Main change 3

Implementation Details
Key design choices.

Important tradeoffs or constraints.

Any new patterns, libraries, or APIs introduced.

Tests
Added new tests

Updated existing tests

Manually tested

How to test:

Step 1

Step 2

Expected result

Impact / Risk
What could go wrong?

Any migrations, data changes, or rollout concerns?

Screenshots / Logs (if UI or bugfix) (if needed most of the time not needed)
Before:

After:

Using the following PR template, generate a GitHub pull request description for this diff: <paste diff>

Checklist
Code builds and passes linters

Tests pass locally

Documentation updated (if needed)

Breaking changes documented/communicated

---