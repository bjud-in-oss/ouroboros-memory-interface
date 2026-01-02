# AGENT_MEMORY

## System Status
- **Phase:** 3 (The Autonomous Loop - Stable)
- **Architecture:** Drive-Augmented Ouroboros (React 19 + Vite + Netlify + Drive API)
- **Latest Upgrade:** Digital Sleep Protocol & COOP Security Headers.

## Architecture Guidelines (Immutable)
1. **Frontend:** React 19+ (Vite/TypeScript). Tailwind via PostCSS (Vite).
2. **Database:** Google Drive (via GSI/Drive API). `app-data.json` holds the master state.
3. **Deployment:** Netlify. `scripts/init-netlify.js` MUST run before build.
4. **Environment:** Map `VITE_` vars to `process.env` in `vite.config.ts`.

## Critical Technical Laws

### 1. The Drive ID Law
Drive is flat. Always resolve `folderId` via search before writing.

### 2. The COOP/Security Law
Google Auth popups require specific headers to communicate with the host.
- **Requirement:** `Cross-Origin-Opener-Policy` MUST be set to `same-origin-allow-popups` in `netlify.toml`.
- **Note:** COEP should remain `unsafe-none` to allow external assets like Google Scripts.

### 3. The Digital Sleep Protocol
- **Heartbeat:** 401 errors trigger `SessionExpiredError`.
- **Dream State:** `localStorage` saves volatile state (input/focus) on every keystroke.
- **Coma:** UI shows an overlay during expiry to prevent state corruption.

### 4. Build Logic
Tailwind CDN is FORBIDDEN in production. Use Vite's native processing.

## Active Modules
- `services/geminiService.ts`: Neural Core.
- `services/driveService.ts`: Backend Persistence with 401 logic.
- `App.tsx`: Main Controller with Sleep/Wake logic.