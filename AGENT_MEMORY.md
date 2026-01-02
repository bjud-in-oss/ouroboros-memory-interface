# AGENT_MEMORY

## System Status
- **Phase:** 4 (Optimization - Stable)
- **Architecture:** Drive-Augmented Ouroboros (React 19 + Vite + Netlify + Drive API)
- **Latest Upgrade:** Prompt Engineering V2 (XML Tagging + Positive Retention Laws).
- **Core Reasoning:** Upgraded to Gemini 3 Pro for complex state preservation.

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

### 3. The Digital Sleep Protocol
- **Heartbeat:** 401 errors trigger `SessionExpiredError`.
- **Dream State:** `localStorage` saves volatile state (input/focus) on every keystroke.

### 4. Prompt Engineering V2 (The Amnesia Patch)
- **XML Tagging:** All instructions and state data are wrapped in XML tags to prevent context pollution.
- **Positive Persistence:** The agent is instructed to COPY every existing project/truth to the output JSON before making changes.
- **CoT Anchoring:** Every interaction begins with a mandatory Memory Audit ("I have read N projects...").

## Active Modules
- `services/geminiService.ts`: Neural Core (v2.2).
- `services/driveService.ts`: Backend Persistence.
- `App.tsx`: Main Controller with Sleep/Wake logic.