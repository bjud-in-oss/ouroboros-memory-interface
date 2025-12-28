# AGENT_MEMORY

## System Status
- **Phase:** 3 (The Autonomous Loop - Stable)
- **Architecture:** Drive-Augmented Ouroboros (React 19 + Vite + Netlify + Drive API)
- **Current Focus:** Ensuring robust persistence via "Folder Awareness" and strict API protocols.

## Architecture Guidelines (Immutable)
1. **Frontend:** React 19+ (Vite/TypeScript). No custom backend.
2. **Database:** Google Drive (via GSI/Drive API). `app-data.json` holds the master state.
3. **Deployment:** Netlify. `scripts/init-netlify.js` MUST run before build to generate `_redirects`.
4. **Environment:** Map `VITE_` vars to `process.env` in `vite.config.ts`.
5. **Auth:** Incremental Authentication. `drive.file` scope requested only on user action.

## Critical Technical Laws (The "Ouroboros" Protocol)

### 1. The Drive ID Law
Google Drive is **NOT** a file system with paths (e.g., `/Ouroboros/data.json`). It is a flat, ID-based database.
- **Rule:** Never attempt to save to a path string.
- **Requirement:** Always resolve `folderId` via a search query (`mimeType = folder and name = 'Ouroboros'`) before any file operation.

### 2. The Scope Visibility Strategy
We use the restricted `drive.file` scope for user trust. This means the app *cannot see* folders created by the user outside the app.
- **Strategy:** The `ensureFolderExists` function is mandatory. It attempts to find the folder; if it returns null (due to scope visibility), it **MUST** create a new folder that the app owns.

### 3. The Multipart PATCH Rule
When updating existing files using the Drive API `multipart/related` method:
- **Rule:** Do **NOT** include the `parents` field in the metadata during a `PATCH` request.
- **Reason:** Including parents implies a "move" operation, which triggers strict validation and often results in `400 Bad Request`. Only use `parents` during `POST` (creation).

### 4. Build & Environment Logic
- **Vite Config:** `process.env` is not available in the browser by default. We explicitly map `VITE_API_KEY` and `VITE_GOOGLE_CLIENT_ID` inside `vite.config.ts`.
- **Netlify Routing:** Single Page Applications (SPA) require a `public/_redirects` file (`/* /index.html 200`) to handle browser refreshes. This is generated automatically by `scripts/init-netlify.js`.
- **Import Maps:** Do NOT use `<script type="importmap">` in `index.html`. Let Vite handle dependency resolution to avoid conflicts.

## Active Modules
- `services/geminiService.ts`: Neural Interface (Ouroboros Loop).
- `services/driveService.ts`: Backend Persistence (Drive API v3) - **UPDATED** with Folder Awareness.
- `components/MemoryPanel.tsx`: Visualizer for `LONG_TERM_MEMORY.json`.
- `components/FocusPanel.tsx`: Log viewer for `CURRENT_FOCUS.md`.
