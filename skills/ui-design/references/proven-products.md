# Study proven products

Before designing a new screen or flow, study how products that already do the same job organize it. Their information architecture has survived real users; yours has not yet. `inspiration.md` is for visual mechanics; this step is for **structure**: what exists, where it lives, what it is called, and the path through it.

Skip it for a component inside an existing screen, or a restyle that keeps the structure.

## Pick the products

Choose 3-5 products whose users do **the same job**, not products that merely look good:

- **Direct**: products that offer this exact service (an RSVP flow → Luma, Partiful, Eventbrite, Meetup).
- **Adjacent**: products that solve the same underlying task in another domain (a waitlist → restaurant booking, course enrollment).
- **The platform's own pattern** when one exists (iOS settings, GitHub's issue page), because users bring those habits with them.

Prefer screens you can actually see: the live product, its public pages, or captured screens (Mobbin, Nicelydone, Page Flows). Never describe a product from memory as if you had looked; say when a claim is unverified.

## Map how each one organizes the job

For each product, record the same rows so they can be compared:

| Row | What to note |
|---|---|
| **Entry point** | Where the job starts and what the user sees first. |
| **First screen** | The one thing it leads with, and what it hides. |
| **Main action** | Its label, placement, and how many steps it takes to finish. |
| **Navigation** | Top-level sections and their names. |
| **Grouping and order** | What sits together, what comes first, and what is deferred behind a click. |
| **Labels** | The words used for the core objects and actions. |
| **States** | Empty, loading, error, success, and how they recover. |
| **Path to done** | Each step from entry to finished, including confirmation. |

## Read the comparison

- **Where they all agree, follow the convention.** Users already know it; departing from it is a cost you must justify.
- **Where they differ, it is a real choice.** Pick a side and write one line on why it fits this product's users.
- **Where one stands out**, ask what job that difference solves and whether your users have that job.
- **Borrow structure, never the brand.** Keep the product's own color, type, and voice.

## Write it down

Add a short block to the design note:

```markdown
**Proven products studied:** Luma, Partiful, Eventbrite (screens viewed 2026-11-15)
- Convention followed: RSVP is the single primary action on the event page; all three do this.
- Choice made: show the attendee list before RSVP (Partiful) rather than after (Eventbrite), because members decide by who is going.
- Deliberately different: no account required to view an event, since sharing links is how events spread here.
```

A reviewer can check "all three put RSVP first"; nobody can check "felt like Luma".
