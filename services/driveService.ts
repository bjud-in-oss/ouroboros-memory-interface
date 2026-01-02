import { AppData } from '../types';
import { INITIAL_MEMORY, INITIAL_FOCUS } from '../constants';

// Robust environment variable access for various environments (Vite, Process, etc.)
const getEnvVar = (name: string) => {
  const vitePrefix = `VITE_${name}`;
  return (import.meta as any).env?.[vitePrefix] || 
         (import.meta as any).env?.[name] || 
         process.env[vitePrefix] || 
         process.env[name] || 
         '';
};

const CLIENT_ID = getEnvVar('GOOGLE_CLIENT_ID');

const DISCOVERY_DOCS = ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'];
const SCOPES = 'https://www.googleapis.com/auth/drive.file';
const FOLDER_NAME = 'Ouroboros';
const FILE_NAME = 'app-data.json';

let tokenClient: any;
let gapiInited = false;
let gisInited = false;

export class SessionExpiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SessionExpiredError";
  }
}

export const checkConfig = () => {
  const id = getEnvVar('GOOGLE_CLIENT_ID');
  if (!id || id.length < 10) {
    throw new Error("Missing VITE_GOOGLE_CLIENT_ID. Please check your .env file or Netlify environment variables.");
  }
};

const accessToken = () => {
  const token = (window as any).gapi?.client?.getToken();
  if (!token) throw new SessionExpiredError("No access token available");
  return token.access_token;
};

const wrapFetch = async (url: string, options: RequestInit) => {
  const response = await fetch(url, options);
  if (response.status === 401) {
    throw new SessionExpiredError("Session Token Expired");
  }
  return response;
};

export const loadGoogleScripts = (callback: () => void) => {
  const script1 = document.createElement('script');
  script1.src = 'https://apis.google.com/js/api.js';
  script1.async = true;
  script1.defer = true;
  script1.onload = () => {
    (window as any).gapi.load('client', async () => {
      try {
        await (window as any).gapi.client.init({ discoveryDocs: DISCOVERY_DOCS });
        gapiInited = true;
        if (gisInited) callback();
      } catch (err) { console.error("GAPI Init Error:", err); }
    });
  };
  document.body.appendChild(script1);

  const script2 = document.createElement('script');
  script2.src = 'https://accounts.google.com/gsi/client';
  script2.async = true;
  script2.defer = true;
  script2.onload = () => {
    try {
      const id = getEnvVar('GOOGLE_CLIENT_ID');
      if (id) {
        tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
          client_id: id,
          scope: SCOPES,
          callback: () => {}, 
        });
      }
      gisInited = true;
      if (gapiInited) callback();
    } catch (err) { 
      console.error("GIS Init Error:", err);
    }
  };
  document.body.appendChild(script2);
};

export const authenticate = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      checkConfig();
      if (!tokenClient) {
        // Retry initialization if scripts are loaded but tokenClient wasn't created
        const id = getEnvVar('GOOGLE_CLIENT_ID');
        if (id && (window as any).google?.accounts?.oauth2) {
           tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
            client_id: id,
            scope: SCOPES,
            callback: () => {}, 
          });
        } else {
          return reject(new Error('Google Identity Services not initialized. Check your Client ID.'));
        }
      }
      
      tokenClient.callback = async (resp: any) => {
        if (resp.error) reject(resp);
        else resolve();
      };
      tokenClient.requestAccessToken({ prompt: 'consent' });
    } catch (e) {
      reject(e);
    }
  });
};

export const ensureFolderExists = async (): Promise<string> => {
  try {
    const response = await (window as any).gapi.client.drive.files.list({
      q: `mimeType = 'application/vnd.google-apps.folder' and name = '${FOLDER_NAME}' and trashed = false`,
      fields: 'files(id, name)',
      spaces: 'drive',
    });
    
    if (response.status === 401) throw new SessionExpiredError("Session Expired during folder check");
    
    const files = response.result.files;
    if (files && files.length > 0) return files[0].id;

    const createResponse = await (window as any).gapi.client.drive.files.create({
      resource: { name: FOLDER_NAME, mimeType: 'application/vnd.google-apps.folder' },
      fields: 'id',
    });
    return createResponse.result.id;
  } catch (err: any) {
    if (err.name === "SessionExpiredError" || err.status === 401) throw new SessionExpiredError("Session Expired");
    throw new Error("Failed to initialize Ouroboros folder structure.");
  }
};

const findFileId = async (fileName: string, folderId: string, partial: boolean = false): Promise<string | null> => {
  try {
    const operator = partial ? 'contains' : '=';
    const response = await (window as any).gapi.client.drive.files.list({
      q: `name ${operator} '${fileName}' and '${folderId}' in parents and trashed = false`,
      fields: 'files(id, name)',
      spaces: 'drive',
    });
    if (response.status === 401) throw new SessionExpiredError("Session Expired during file search");
    const files = response.result.files;
    return (files && files.length > 0) ? files[0].id : null;
  } catch (err: any) { 
    if (err.status === 401 || err.name === "SessionExpiredError") throw new SessionExpiredError("Session Expired");
    return null; 
  }
};

export const listJSONFiles = async (): Promise<{id: string, name: string}[]> => {
  try {
    const folderId = await ensureFolderExists();
    const response = await (window as any).gapi.client.drive.files.list({
      q: `'${folderId}' in parents and mimeType = 'application/json' and trashed = false`,
      fields: 'files(id, name)',
      orderBy: 'modifiedTime desc'
    });
    if (response.status === 401) throw new SessionExpiredError("Session Expired during list");
    return response.result.files || [];
  } catch (err: any) {
    if (err.status === 401 || err.name === "SessionExpiredError") throw new SessionExpiredError("Session Expired");
    return []; 
  }
};

export const listAllFiles = async (): Promise<{id: string, name: string, mimeType: string}[]> => {
  try {
    const folderId = await ensureFolderExists();
    // Fetch all files in folder, excluding the folders themselves
    const response = await (window as any).gapi.client.drive.files.list({
      q: `'${folderId}' in parents and mimeType != 'application/vnd.google-apps.folder' and trashed = false`,
      fields: 'files(id, name, mimeType)',
      orderBy: 'modifiedTime desc',
      pageSize: 100 
    });
    if (response.status === 401) throw new SessionExpiredError("Session Expired during list");
    return response.result.files || [];
  } catch (err: any) {
    if (err.status === 401 || err.name === "SessionExpiredError") throw new SessionExpiredError("Session Expired");
    return []; 
  }
};

export const readFile = async (fileId: string): Promise<string> => {
  const response = await wrapFetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { 'Authorization': `Bearer ${accessToken()}` }
  });
  if (!response.ok) throw new Error("Read File Failed");
  return await response.text();
};

export const createFile = async (name: string, content: string | object, folderId: string, mimeType: string): Promise<string> => {
  const metadata = { name, mimeType, parents: [folderId] };
  const bodyContent = typeof content === 'object' ? JSON.stringify(content, null, 2) : content;
  const multipartRequestBody = `--foo_bar_baz\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--foo_bar_baz\r\nContent-Type: ${mimeType}\r\n\r\n${bodyContent}\r\n--foo_bar_baz--`;
  
  const response = await wrapFetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${accessToken()}`, 'Content-Type': 'multipart/related; boundary=foo_bar_baz' },
    body: multipartRequestBody,
  });
  const result = await response.json();
  return result.id;
};

// New function to handle raw file uploads (Blobs/Files)
export const uploadArtifact = async (file: File): Promise<string> => {
  const folderId = await ensureFolderExists();
  const metadata = { name: file.name, parents: [folderId] };
  
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', file);

  const response = await wrapFetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${accessToken()}` },
    body: form,
  });
  
  if (!response.ok) throw new Error(`Artifact Upload Failed: ${response.statusText}`);
  const result = await response.json();
  return result.id;
};

export const saveState = async (data: AppData, isBackup: boolean = false): Promise<string> => {
  if (!data.memory.active_projects || !data.memory.core_instructions) {
      throw new Error("Integrity check failed: Attempted to save malformed state.");
  }

  const folderId = await ensureFolderExists();
  const name = isBackup ? `app-data.backup.${new Date().toISOString().replace(/:/g, '-')}.json` : FILE_NAME;
  
  let url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
  let method = 'POST';
  const metadata: any = { name, mimeType: 'application/json' };

  if (!isBackup) {
    const existingId = await findFileId(FILE_NAME, folderId);
    if (existingId) {
      url = `https://www.googleapis.com/upload/drive/v3/files/${existingId}?uploadType=multipart`;
      method = 'PATCH';
    } else {
      metadata.parents = [folderId];
    }
  } else {
    metadata.parents = [folderId];
  }

  const bodyContent = JSON.stringify(data, null, 2);
  const multipartRequestBody = `--foo_bar_baz\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--foo_bar_baz\r\nContent-Type: application/json\r\n\r\n${bodyContent}\r\n--foo_bar_baz--`;

  const response = await wrapFetch(url, {
    method,
    headers: { 'Authorization': `Bearer ${accessToken()}`, 'Content-Type': 'multipart/related; boundary=foo_bar_baz' },
    body: multipartRequestBody,
  });
  
  if (!response.ok) throw new Error(`Drive Upload Failed: ${response.statusText}`);
  const res = await response.json();
  return res.id;
};

export const loadState = async (fileId?: string): Promise<AppData | null> => {
  const folderId = await ensureFolderExists();
  const targetId = fileId || await findFileId(FILE_NAME, folderId);
  if (!targetId) return null;
  try {
    const content = await readFile(targetId);
    return JSON.parse(content);
  } catch (err: any) {
    if (err.name === "SessionExpiredError") throw err;
    return null;
  }
};

export const findFile = async (name: string): Promise<string | null> => {
  const folderId = await ensureFolderExists();
  return await findFileId(name, folderId, true);
};