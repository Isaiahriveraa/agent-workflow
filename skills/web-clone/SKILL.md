---
name: web-clone
description: "Website cloning pipeline. Triggers: 'web-clone', 'clone site', 'clone website', 'copy webpage'. Start website cloning pipeline."
---

# Web Clone Skill

## Purpose

Clone or replicate a website's visual design and structure into clean, functional code. The pipeline captures the visual essence of a target site and produces implementation-ready code (HTML/CSS/React/etc.) that reproduces the design.

## Pipeline Steps

### Step 1: Analyze Target
- Fetch the target URL via browser automation
- Capture full-page screenshots (desktop and mobile viewports)
- Extract DOM structure, metadata, and asset references
- Identify technology stack where possible (framework, CMS, etc.)

### Step 2: Identify Design System
- Extract color palette from screenshots and CSS
- Identify typography (font families, sizes, weights, line heights)
- Document spacing system (margins, padding, gaps)
- Catalog reusable components (buttons, cards, navbars, forms, modals)
- Note layout patterns (grid, flexbox, sidebar configs)

### Step 3: Generate Implementation
- Produce clean semantic HTML structure
- Write CSS that mirrors the extracted design system (or use Tailwind/utility classes)
- If applicable, generate React/Next.js component code
- Preserve accessibility attributes and semantic markup
- Use the `frontend-design` skill for aesthetic guidance and implementation quality

### Step 4: Verify
- Compare generated screenshots against the original
- Check layout consistency across viewports
- Validate responsive behavior
- Verify typography, color matching, and spacing accuracy
- Run browser automation tests to confirm visual fidelity

## Tools Used

- **Browser automation (Playwright MCP)**: Screenshots, DOM extraction, viewport testing
- **Frontend design skill**: Aesthetic implementation, component architecture, responsive patterns
- **Web fetch**: Content and asset retrieval from target URLs

## Output

Functional code that reproduces the visual design of the target website:
- Semantic HTML structure
- CSS (vanilla, Tailwind, or component-scoped styles)
- Optional React/Next.js components
- Responsive and accessible implementation

## Ethics

**Only clone sites you own or have explicit permission to replicate.**
Do not copy copyrighted content, proprietary text, or protected intellectual property. The skill is intended for:
- Personal portfolio sites you have permission to reference
- Open-source or public-domain website designs
- Inspirational recreation for educational purposes
- Your own websites or designs you are authorized to use

Always respect copyright and terms of service.
