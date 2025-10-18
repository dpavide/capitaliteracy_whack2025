# Copilot / AI agent instructions for whack2025

These notes give targeted, actionable context so an AI coding agent can be productive quickly in this frontend React + Vite repo.

High-level architecture
- Single-page React app (React 18) built with Vite. Entry point: `src/main.jsx` which mounts `AppRouter` from `src/Router.jsx`.
- App shell: `src/App.jsx` provides MUI theme, `ColorModeContext`, and a `ToggledContext` used by the UI. `Navbar` and page content are rendered via `Outlet` from React Router.
- Routing: `src/Router.jsx` defines a top-level route where `/` renders `App` and the dashboard. The `src/scenes` folder exports named scenes (see `src/scenes/index.js`).
- UI library: Material UI (MUI v5) plus tokens/theme helpers in `src/theme.js`. Charts use Nivo, ApexCharts and Plotly in specific components under `src/scenes` and `src/components`.

Where state and data come from
- Local static mocks live under `src/data/` (e.g. `fleetData.js`, `mockData.js`, `allGeneratorsData.js`) and are imported directly by scene components.
- No visible global store (Redux) — components use React state and contexts (`ToggledContext`, MUI theme context).

Build / dev / test workflows
- Developer commands (package.json):
  - Start dev server: `npm run dev` (runs `vite`).
  - Build production bundle: `npm run build` (runs `vite build`).
  - Preview production build: `npm run preview` (runs `vite preview`).
  - Lint: `npm run lint` (eslint configured for .js/.jsx).
- Python: README shows optional Python venv setup for other tooling/tests (see top-level `README.md`). Not required for frontend dev.

Project-specific conventions and patterns
- File exports: `src/scenes/index.js` and `src/components/index.jsx` re-export modules — prefer editing those index files when adding new top-level exports.
- Styling: MUI theme tokens live in `src/theme.js`. Use `tokens(theme.palette.mode)` to get color tokens (see `src/scenes/dashboard/index.jsx`).
- Responsive layout: scenes often use MUI `useMediaQuery` with explicit breakpoints (examples in `src/scenes/dashboard/index.jsx`). Follow the same pattern for new responsive components.
- Charts: Examples in `src/scenes/dashboard/*` and `src/components/GeographyChart.jsx`. Follow props patterns used there (pass `theme`, `colors`, and data via `selectedData` or specific prop names).
- Context usage: `ToggledContext` (declared in `src/App.jsx`) is used to share sidebar state. When adding components that interact with layout, read/write via that context.

Integration points & external deps
- React Router v6 (see `src/Router.jsx`).
- MUI v5 for layout and theming.
- Charting libraries: `@nivo/*`, `apexcharts`, `plotly.js`, `react-plotly.js`, `react-apexcharts` — locate usage under `src/scenes` and `src/components` before adding new chart deps.

Coding agent rules (concise and actionable)
- Keep changes small and focused. Edit existing component files rather than changing multiple unrelated files.
- When adding routes, update `src/scenes/index.js` to export the new scene and add a matching `<Route>` in `src/Router.jsx` with the scene nested under `/` (same structure as Dashboard).
- Use existing mock data in `src/data/` for UI work unless the task explicitly needs live APIs. Mock files match the shapes scenes expect (inspect `fleetData.js`, `allGeneratorsData.js`).
- Follow existing responsive/layout patterns: MUI `Box` grid with `gridTemplateColumns` and `gridAutoRows` as used in `src/scenes/dashboard/index.jsx`.
- Do not introduce a global state manager. Prefer React context or local state unless a task specifically requests a store.

Key files to inspect for examples
- Routing + entry: `src/main.jsx`, `src/Router.jsx`, `src/App.jsx`
- Theme + tokens: `src/theme.js`
- Scenes: `src/scenes/index.js`, `src/scenes/dashboard/index.jsx`, `src/scenes/geography/index.jsx`
- Components: `src/components/index.jsx`, `src/components/GeographyChart.jsx`, `src/components/Header.jsx`
- Mock data: `src/data/fleetData.js`, `src/data/allGeneratorsData.js`, `src/data/mockData.js`

If you need more context
- Open the scene file that is being changed to find the expected prop names and data shapes (mock data files show the shapes).
- Prefer small PRs with a clear, runnable dev step: `npm run dev` should start the Vite server and allow visual verification.

Feedback request
- Tell me which areas you'd like expanded (examples for chart components, a sample route addition, or data-shape documentation) and I'll iterate.
