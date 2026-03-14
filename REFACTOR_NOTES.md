# monitoring-next final redesign

This package focuses on:
- new responsive app shell
- sticky topbar and sticky desktop sidebar
- off-canvas mobile sidebar
- centralized theme/lang state
- stronger dark mode support
- improved driver statistics responsive CSS

Main updated files:
- app/globals.css
- app/layout.tsx
- components/RoleShell.tsx
- components/Sidebar.tsx
- components/Topbar.tsx
- components/ui/AppShellContext.tsx
- components/panels/driver-statistics.module.css

Notes:
- `public/monitoring.js` is still present for map interaction logic.
- This redesign improves the shell and responsiveness without removing existing API behavior.
