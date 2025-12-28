# AGENT_MEMORY

## System Status
- **Phase:** 3 (The Autonomous Loop)
- **Architecture:** Drive-Augmented Ouroboros (React 19 + Vite + Netlify + Drive API)
- **Current Focus:** Operational. The Neural Interface now actively syncs state with Google Drive.

## Architecture Guidelines (Immutable)
1. **Frontend:** React 19+ (Vite/TypeScript). No custom backend.
2. **Database:** Google Drive (via GSI/Drive API). `app-data.json` holds the master state.
3. **Deployment:** Netlify. `scripts/init-netlify.js` MUST run before build.
4. **Environment:** Map `VITE_` vars to `process.env` in `vite.config.ts`.
5. **Auth:** Incremental Authentication. `drive.file` scope requested only on user action.

## Lessons Learned
- **Schema Validation:** Gemini API requires strictly typed objects in response schemas. Empty properties cause 400 errors.
- **Persistence:** LocalStorage has been deprecated. Real Drive API integration is active using `multipart/related` uploads for atomic JSON updates.
- **Identity:** Using Google Identity Services (GIS) for auth and `gapi.client` for Drive discovery/actions creates a hybrid but robust flow.
- **Statelessness:** We do not store the File ID locally. We search for `app-data.json` by name on every session start to ensure true device agnosticism.
- **Deployment:** Netlify SPA routing requires `_redirects` to prevent 404s on refresh.
- **Build Environment:** Project uses Vite. Do NOT use `importmap` in index.html; let the bundler handle dependencies.

## Active Modules
- `services/geminiService.ts`: Neural Interface (Ouroboros Loop).
- `services/driveService.ts`: Backend Persistence (Drive API v3).
- `components/MemoryPanel.tsx`: Visualizer for `LONG_TERM_MEMORY.json`.
- `components/FocusPanel.tsx`: Log viewer for `CURRENT_FOCUS.md`.
