# Research Index

Use this file to track reusable research artifacts so future work can find them without re-reading everything.

## Entries
- Topic: Interface redesign baseline versus lecture-recording branch map
  Date: 2026-03-05
  Source files: /Users/isaiahrivera/Documents/GitHubProjects/Koda/macOS/Sources/Koda/KodaApp.swift, /Users/isaiahrivera/Documents/GitHubProjects/Koda/macOS/Sources/Koda/InterfaceManager.swift, /Users/isaiahrivera/Documents/GitHubProjects/Koda/macOS/Sources/Koda/InterfaceView.swift, /Users/isaiahrivera/Documents/GitHubProjects/Koda/macOS/Sources/Koda/InterfaceWindowCoordinator.swift, /Users/isaiahrivera/Documents/GitHubProjects/Koda/macOS/Sources/Koda/NativeInterfaceWindow.swift, /Users/isaiahrivera/Documents/GitHubProjects/Koda/macOS/Sources/Koda/SettingsNavigation.swift, /Users/isaiahrivera/Documents/GitHubProjects/Koda/Planning/interface-popup-redesign-cleanup-plan.md, /Users/isaiahrivera/Documents/GitHubProjects/Koda/Planning/interface-window-unification-rpi-plan.md, /Users/isaiahrivera/Documents/GitHubProjects/Koda/Planning/interface-window-hybrid-host-rpi-plan.md, /Users/isaiahrivera/Documents/GitHubProjects/Koda/Planning/lecture-mode-long-form-transcription-plan.md, /Users/isaiahrivera/Documents/GitHubProjects/Koda/thoughts/shared/handoffs/general/2026-02-24_13-16-10_koda-interface-redesign-ai-merge.md, /Users/isaiahrivera/Documents/GitHubProjects/Koda/thoughts/shared/handoffs/general/2026-02-27_13-20-40_lecture-recording-interface-workflow.md, /Users/isaiahrivera/Documents/GitHubProjects/Koda/thoughts/shared/handoffs/general/2026-02-27_15-05-24_interface-window-unification-rpi.md, /Users/isaiahrivera/Documents/GitHubProjects/Koda/thoughts/shared/handoffs/general/2026-02-27_15-30-07_interface-window-hybrid-host-phase-2.md, /Users/isaiahrivera/Documents/GitHubProjects/Koda/thoughts/shared/handoffs/general/2026-02-27_16-22-43_hotkey-transcript-ui-followups.md
  Artifact path: /Users/isaiahrivera/.agents/thoughts/research/2026-03-05-interface-redesign-vs-lecture-branch-map.md
  Summary: Documented `feat/redesign-interface` as the pre-lecture baseline, mapped the 15 commits added on `feat/lecture-recording`, classified interface-focused versus lecture-coupled changes, and described the current hybrid interface architecture plus where lecture state is currently coupled into it.

- Topic: Homepage AI economy workflow/backend contract truth
  Date: 2026-03-05
  Source files: /Users/isaiahrivera/Documents/GitHubProjects/openville/app/api/search/ranked/route.ts, /Users/isaiahrivera/Documents/GitHubProjects/openville/app/api/agents/search-and-select/route.ts, /Users/isaiahrivera/Documents/GitHubProjects/openville/app/api/agents/negotiate/run/route.ts, /Users/isaiahrivera/Documents/GitHubProjects/openville/app/api/agents/negotiate/[id]/route.ts, /Users/isaiahrivera/Documents/GitHubProjects/openville/app/api/agents/select-winner/route.ts, /Users/isaiahrivera/Documents/GitHubProjects/openville/features/workflow/client/types.ts, /Users/isaiahrivera/Documents/GitHubProjects/openville/features/workflow/client/repository.ts, /Users/isaiahrivera/Documents/GitHubProjects/openville/features/workflow/client/adapters.ts, /Users/isaiahrivera/Documents/GitHubProjects/openville/features/workflow/hooks/useOpenvilleFlow.ts, /Users/isaiahrivera/Documents/GitHubProjects/openville/features/landing/hooks/useLiveFunnel.ts
  Artifact path: /Users/isaiahrivera/Documents/GitHubProjects/openville/thoughts/research/2026-03-05-homepage-ai-economy-contracts.md
  Summary: Documented the live request/response contracts for search, shortlist, negotiation run, transcript fetch, and winner selection. Confirmed degraded and empty states, identified transcript id/shape mismatch in the current frontend client, and mapped which homepage workflow surfaces are already supportable without backend changes.

- Topic: Neovim file rendering, file icons, and git review UI
  Date: 2026-03-05
  Source files: /Users/isaiahrivera/.config/nvim/init.lua, /Users/isaiahrivera/.config/nvim/lazy-lock.json
  Artifact path: /Users/isaiahrivera/.agents/thoughts/research/2026-03-05-nvim-file-rendering-and-git-ui.md
  Summary: Documented the live Neovim setup for file icons and git review surfaces. Confirmed `nvim-web-devicons` is the only file-icon provider, Neo-tree overrides only git-status letters, and the git workflow is currently split across Neo-tree, Neogit, Diffview, Gitsigns, which-key, and a custom cheatsheet.

- Topic: external workflow repo comparison for SSOT upgrade
  Date: 2026-03-02
  Source files: local `/Users/isaiahrivera/.agents/*`, external `everything-claude-code`
  Artifact path: conversation plan and implemented SSOT workflow upgrade
  Summary: Compared the current provider-agnostic agent architecture with a Claude-first workflow repo, then adopted explicit contexts, reusable rule cards, adapter isolation, and validation scripts.

- Topic: Mobile responsiveness audit — iPhone SE (375px) — dashboard
  Date: 2026-03-04
  Source files: frontend/src/app/dashboard/layout.tsx, page.tsx, Navbar.tsx, MobileMenu.tsx, ProjectionTileGrid.tsx, DashboardWatchlist.tsx, SocialPanel.tsx, FriendActivityFeed.tsx, DailyMissionStrip.tsx, TrendingTickerTape.tsx, ArcadeButton.tsx, SlipDrawer.tsx, MobileBottomNav.tsx
  Artifact path: ~/.agents/thoughts/research/2026-03-04-mobile-responsiveness-iphone-se.md
  Summary: Full audit of mobile layout at 375px. Key findings: (1) LOGOUT missing on mobile — dashboard navbar never mounts MobileMenu; (2) watchlist/social hidden behind MobileBottomNav tabs (default view is "picks"); (3) SlipDrawer expansion (h-40) overflows pb-16 clearance when 3+ picks selected; (4) text-2xl price in 155px-wide tiles; (5) ArcadeButton px-4 py-2 with no min-h touch target.

## Entry Template
- Topic:
- Date:
- Source files:
- Artifact path:
- Summary:

- Topic: Frontend security vulnerabilities and missing security/edge-case tests
  Date: 2026-03-05
  Source files: frontend/src/app/page.tsx, frontend/src/app/dashboard/layout.tsx, frontend/src/components/landing/nav/MobileMenu.tsx, frontend/next.config.mjs, frontend/src/tests/page.test.tsx, frontend/src/tests/landing-page.test.tsx, frontend/src/tests/mobile-menu.test.tsx, frontend/src/tests/dashboard-page.test.tsx, frontend/e2e/landing.spec.ts
  Artifact path: thoughts/shared/research/2026-03-05-frontend-security-testing-gaps.md
  Summary: Identified key frontend security gaps (missing dashboard auth guard, absent form validation/sanitization, potential untrusted href sink, missing Next.js security headers) and mapped missing security-focused test inventory.

- Topic: Pipeline E2E crash analysis — what's fixed, what's still broken, fix plan
  Date: 2026-03-05
  Source files: features/landing/hooks/useLiveFunnel.ts, features/landing/adapters/liveFunnelAdapters.ts, features/landing/components/market/HologramNode.tsx, features/landing/components/market/NeonFlowCanvas.tsx, features/workflow/client/repository.ts, features/workflow/client/types.ts, app/api/agents/search-and-select/route.ts, app/api/agents/negotiate/run/route.ts, app/api/agents/negotiate/[id]/route.ts, features/agents/negotiation/runNegotiations.ts
  Artifact path: ~/.agents/thoughts/research/2026-03-05-pipeline-e2e-crash-analysis.md
  Summary: Confirmed 5 bugs already fixed. Identified 3 remaining frontend-only bugs: (B) getNegotiationTranscript passes agentId but backend expects negotiationId, (C) transcript response shape mismatch ({negotiation,messages} vs {history}), (A) two independent RAG searches cause ID mismatch in visual. Plus (D) binary elimination animation needs staggering.
