# Ouroboros AI Interface

A recursive memory interface for autonomous agents using a Drive-Augmented architecture.

## Setup for Developers (BYOK)

To run this application, you must provide your own Google Cloud and Gemini API credentials.

### Step 1: Create a Google Cloud Project
1.  Go to the [Google Cloud Console](https://console.cloud.google.com/).
2.  Create a new project (e.g., "Ouroboros-AI").
3.  Enable the following APIs:
    *   **Google Drive API** (For memory persistence).
    *   **Generative Language API** (Google Gemini API).

### Step 2: Obtain Credentials
1.  **API Key:**
    *   Navigate to **APIs & Services > Credentials**.
    *   Click **Create Credentials > API Key**.
    *   This will be your `VITE_API_KEY`.
2.  **OAuth 2.0 Client ID:**
    *   Navigate to **APIs & Services > OAuth consent screen**. Configure it (Internal/External) and add the scope `.../auth/drive.file`.
    *   Navigate to **APIs & Services > Credentials**.
    *   Click **Create Credentials > OAuth client ID**. Select **Web application**.
    *   **Authorized JavaScript origins:**
        *   `http://localhost:5173` (for local development)
        *   `https://your-app-name.netlify.app` (for production)
    *   **Authorized redirect URIs:**
        *   `http://localhost:5173`
        *   `https://your-app-name.netlify.app`
    *   Copy the Client ID. This will be your `VITE_GOOGLE_CLIENT_ID`.

### Step 3: Environment Configuration
Create a `.env` file in the project root:

```env
VITE_API_KEY=your_gemini_api_key_here
VITE_GOOGLE_CLIENT_ID=your_oauth_client_id_here
```

For production (Netlify), add these as **Build Environment Variables** in the Netlify Dashboard under Site Settings.

## Architecture
*   **Neural Core:** Gemini 3 Pro (Text/Reasoning).
*   **Long-term Memory:** Distributed JSON/Markdown on Google Drive.
*   **State Management:** Atomic React state with LocalStorage recovery.
