# IUGA Website Agent Guide

## What IUGA is

The Informatics Undergraduate Association (IUGA) is a student-led registered student organization at the University of Washington Information School. It serves Informatics undergraduates as a student government: representing student interests, creating communication between students and the iSchool, advocating for current and prospective Informatics students, and building community through social, educational, and professional opportunities.

This website is IUGA’s public front door and participation hub. It is not the iSchool’s official administration site and IUGA does not own every service or organization listed here. IUGA is specifically an undergraduate association; do not present graduate-student groups or another RSO’s programs as IUGA’s own. When an event is co-hosted, identify the hosts and intended audience accurately.

## Who the site serves

- **Current UW Informatics undergraduates** are the primary audience. They need to find events, connect with peers, discover useful support and student organizations, share their perspective, and take part in student governance.
- **Prospective Informatics students and recent admits** may use public pages to understand the student community and find relevant opportunities. Do not imply that every event or resource is intended for them; follow each listing’s eligibility.
- **IUGA officers and volunteers** use the site to communicate what the association is doing, invite participation, and keep public information dependable.
- **Other iSchool students, organizations, and industry guests** may be partners or event attendees when a specific offering includes them. They are not a reason to lose focus on Informatics undergraduates.

## What the website should help people do

A visitor should be able to understand who IUGA is, see how it can be useful to them, and choose a clear next step. The site should make it easy to:

1. Find upcoming **academic, social, and professional** events—from town halls and workshops to game nights, company panels, and networking.
2. Find relevant academic, career, wellbeing, and community resources, including other iSchool student organizations.
3. Share feedback that can help IUGA represent Informatics students.
4. Join a committee, help with an event, or bring an idea to IUGA.
5. Learn who represents students, understand elections, and explore current IUGA merchandise.

The value is broader than event promotion: IUGA helps students feel connected, informed, represented, and able to shape their Informatics experience.

## Product intent by page

| Page | Job it should do |
|---|---|
| **Home** (`/`) | Be the centerpiece and orientation point. Explain IUGA plainly, introduce the main things it offers, and guide visitors to a useful next step. Make current events and other important destinations easy to discover. It should feel like a welcome and a map—not only a campaign poster or a generic hero. |
| **Events** (`/events`) | Help students discover and act on IUGA events. Keep academic, social, and professional opportunities visible; IUGA is not only a career-networking organization. Make dates, times, location or format, audience, cost, and RSVP details clear when known. |
| **Resources** (`/resources`) | Curate routes to useful iSchool resources and student organizations. Make clear who provides each resource; a link in IUGA’s directory does not mean IUGA operates or guarantees that service. |
| **Student Voice** (`/student-voice`) | Give students a clear way to share input that informs IUGA’s advocacy and programming. The current page requires UW sign-in. Do not promise anonymity, confidentiality, or a particular response unless the specific form says so. |
| **Get Involved** (`/get-involved`) | Turn interest into participation: explain current committees and ways to help with events or propose ideas. Keep openings and contact routes current. |
| **About** (`/about`) | Explain IUGA and introduce the current student leadership. Officer names and terms change; verify them rather than carrying old rosters forward. |
| **Elections / Election FAQ** (`/elections`, `/electionfaq`) | Support informed participation in IUGA student governance. These routes currently exist even though navigation visibility may differ; check `docs/FRONTEND.md` before changing how people reach them. |
| **Shop** (`/shop`) | Let students browse current IUGA/Informatics merchandise. Prices, sizes, sale dates, and availability must come from the current catalog; do not promise stock or ordering windows in copy. |

Routes and features can change. Treat this table as product context, then confirm current behavior in the app and `docs/FRONTEND.md` before implementing a page change.

## IUGA worktree workflow

Create IUGA worktrees with the IUGA-specific setup script, not raw `git worktree add` or the generic `new-worktree.sh`:

```sh
IUGA_AGENT_TEMPLATE="$HOME/.agents/iuga-agents.md" \
  ~/.agents/scripts/iuga-worktree.sh <branch> [start-point] [dest-dir]
```

The script provisions the schema submodule and dependencies, links the shared `context/` directory, copies backend environment files from the source checkout, and installs agent instructions. `IUGA_AGENT_TEMPLATE` defaults to `~/.agents/AGENTS.md`; use `~/.agents/iuga-agents.md` so each new worktree receives this IUGA-specific context. Keep the project-local `AGENTS.md` and this backup/template copy in sync when updating the guide. Existing branches need only the branch name; creating a new branch requires an explicit start point. The default destination is the sibling `iuga-web-app-worktrees/` directory, organized by branch path.

After a worktree is merged, use `~/.agents/scripts/cleanup-worktree.sh <branch>` to clean it up. Do not use its force option to discard uncommitted work without explicit authorization.

## Principles for product decisions

- **Orient before promoting.** On the home page, answer “What is IUGA?” and “What can I do here?” before asking visitors to click. Use clear destinations and real, current examples.
- **Serve the whole student experience.** Preserve the balance between academic support, social connection, professional growth, student voice, and governance. Do not let one event type stand in for all of IUGA.
- **Make participation understandable.** A student should know what an event or opportunity is, who it is for, what to do next, and whether sign-in or RSVP is required.
- **Be accurate about ownership.** Distinguish IUGA-run events and committees from iSchool services, peer organizations, and co-hosted programs. Attribute partners clearly.
- **Earn trust with current information.** Never invent an event, date, RSVP link, eligibility rule, officer, resource, merchandise price, or availability. If a detail is unknown, label it as unknown or omit it rather than guessing. Treat the website’s event records as the source of truth for event details; a social post is promotion, not a structured event listing.
- **Welcome the range of Informatics students.** Use plain, inclusive language and authentic community context. Avoid implying that every student has the same schedule, interests, background, or access to an opportunity.
- **Keep essential paths usable on small screens and with assistive technology.** Events and next steps are core functions, not decorative content. Preserve clear labels, readable details, keyboard access, and responsive layouts when changing the experience.

For event categories, use the current public labels **Academic**, **Social**, and **Professional**. Some existing event data may use the legacy label **Career**; follow the app’s existing normalization rather than creating a duplicate category.

## Sources and project references

- Official IUGA website: <https://iuga.info/>
- UW Information School profile of IUGA and its goals: <https://ischool.uw.edu/diversity/resources/student-groups/iuga>
- Project setup and document index: [`README.md`](README.md)
- Current routes and frontend behavior: [`docs/FRONTEND.md`](docs/FRONTEND.md)
- System boundaries and data flow: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)

Use official sources for public claims about IUGA and confirm time-sensitive details before publishing them. This file provides product context; the project documentation remains the source for implementation and development instructions.
