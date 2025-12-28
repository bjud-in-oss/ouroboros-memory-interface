import { AppData } from '../types';

// Fallback ID to ensure GIS never fails due to missing env var
const ENV_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const FALLBACK_CLIENT_ID = '765827205160-ft7dv2ud5ruf2tgft4jvt68dm7eboei6.apps.googleusercontent.com';
const CLIENT_ID = ENV_CLIENT_ID && ENV_CLIENT_ID.length > 5 ? ENV_CLIENT_ID : FALLBACK_CLIENT_ID;

// Note: We do NOT use the API_KEY for GAPI init anymore to prevent "Invalid Key" errors 
// if the key is restricted to Gemini only. GAPI can load discovery docs anonymously or via the token later.
const DISCOVERY_DOCS = ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'];
const SCOPES = 'https://www.googleapis.com/auth/drive.file';
const FILE_NAME = 'app-data.json';

let tokenClient: any;
let gapiInited = false;
let gisInited = false;

/**
 * Loads the Google API scripts dynamically.
 */
export const loadGoogleScripts = (callback: () => void) => {
  const script1 = document.createElement('script');
  script1.src = 'https://apis.google.com/js/api.js';
  script1.async = true;
  script1.defer = true;
  script1.onerror = () => console.error("Failed to load gapi script");
  script1.onload = () => {
    window.gapi.load('client', async () => {
      try {
        // We init GAPI without the API Key to avoid restriction errors.
        // The Auth token from GIS will handle permissions later.
        await window.gapi.client.init({
          discoveryDocs: DISCOVERY_DOCS,
        });
        gapiInited = true;
        if (gisInited) callback();
      } catch (err) {
        console.error("GAPI Init Error:", err);
      }
    });
  };
  document.body.appendChild(script1);

  const script2 = document.createElement('script');
  script2.src = 'https://accounts.google.com/gsi/client';
  script2.async = true;
  script2.defer = true;
  script2.onerror = () => console.error("Failed to load GIS script");
  script2.onload = () => {
    try {
      if (!CLIENT_ID) throw new Error("CLIENT_ID is undefined");
      
      tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: () => {}, // Must be a function, even if empty initially
      });
      gisInited = true;
      if (gapiInited) callback();
    } catch (err) {
      console.error("GIS Init Error:", err);
    }
  };
  document.body.appendChild(script2);
};

/**
 * Authenticates the user using Google Identity Services.
 */
export const authenticate = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!tokenClient) return reject('Google Scripts not loaded');
    
    // Override the callback for this specific request
    tokenClient.callback = async (resp: any) => {
      if (resp.error) {
        reject(resp);
      }
      resolve();
    };

    // Request access token with prompt if needed
    tokenClient.requestAccessToken({ prompt: 'consent' });
  });
};

/**
 * Helper to find the existing app-data.json file ID.
 * Returns null if not found.
 */
const findFileId = async (): Promise<string | null> => {
  try {
    const response = await window.gapi.client.drive.files.list({
      q: `name = '${FILE_NAME}' and trashed = false and 'root' in parents`,
      fields: 'files(id, name)',
      spaces: 'drive',
    });
    const files = response.result.files;
    if (files && files.length > 0) {
      return files[0].id;
    }
    return null;
  } catch (err) {
    console.error("Error finding file:", err);
    throw err;
  }
};

/**
 * Saves the full AppData to Google Drive.
 * Uses multipart/related to upload JSON content.
 * If file exists -> Update (PATCH).
 * If not -> Create (POST).
 */
export const saveState = async (data: AppData): Promise<void> => {
  const fileId = await findFileId();
  
  const metadata = {
    name: FILE_NAME,
    mimeType: 'application/json',
  };

  const multipartRequestBody =
    `--foo_bar_baz\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${JSON.stringify(metadata)}\r\n` +
    `--foo_bar_baz\r\n` +
    `Content-Type: application/json\r\n\r\n` +
    `${JSON.stringify(data, null, 2)}\r\n` +
    `--foo_bar_baz--`;

  const accessToken = window.gapi.client.getToken().access_token;
  
  let url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
  let method = 'POST';

  if (fileId) {
    url = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`;
    method = 'PATCH';
  }

  const response = await fetch(url, {
    method: method,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'multipart/related; boundary=foo_bar_baz',
    },
    body: multipartRequestBody,
  });

  if (!response.ok) {
    throw new Error(`Drive Upload Failed: ${response.statusText}`);
  }
};

/**
 * Loads the AppData from Google Drive.
 * Returns null if file does not exist.
 */
export const loadState = async (): Promise<AppData | null> => {
  const fileId = await findFileId();
  if (!fileId) return null;

  const response = await window.gapi.client.drive.files.get({
    fileId: fileId,
    alt: 'media',
  });

  // The result body is the JSON object directly
  return response.result as AppData;
};

// Global types for window extension
declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}