import { AppData } from '../types';
import { INITIAL_MEMORY, INITIAL_FOCUS } from '../constants';

const ENV_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const FALLBACK_CLIENT_ID = '765827205160-ft7dv2ud5ruf2tgft4jvt68dm7eboei6.apps.googleusercontent.com';
const CLIENT_ID = ENV_CLIENT_ID && ENV_CLIENT_ID.length > 5 ? ENV_CLIENT_ID : FALLBACK_CLIENT_ID;

const DISCOVERY_DOCS = ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'];
const SCOPES = 'https://www.googleapis.com/auth/drive.file';
const FOLDER_NAME = 'Ouroboros';
const FILE_NAME = 'app-data.json';

let tokenClient: any;
let gapiInited = false;
let gisInited = false;

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
      tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: () => {}, 
      });
      gisInited = true;
      if (gapiInited) callback();
    } catch (err) { console.error("GIS Init Error:", err); }
  };
  document.body.appendChild(script2);
};

export const authenticate = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!tokenClient) return reject('Google Scripts not loaded');
    tokenClient.callback = async (resp: any) => {
      if (resp.error) reject(resp);
      else resolve();
    };
    tokenClient.requestAccessToken({ prompt: 'consent' });
  });
};

export const ensureFolderExists = async (): Promise<string> => {
  try {
    const response = await (window as any).gapi.client.drive.files.list({
      q: `mimeType = 'application/vnd.google-apps.folder' and name = '${FOLDER_NAME}' and trashed = false`,
      fields: 'files(id, name)',
      spaces: 'drive',
    });
    const files = response.result.files;
    if (files && files.length > 0) return files[0].id;

    const createResponse = await (window as any).gapi.client.drive.files.create({
      resource: { name: FOLDER_NAME, mimeType: 'application/vnd.google-apps.folder' },
      fields: 'id',
    });
    return createResponse.result.id;
  } catch (err) {
    throw new Error("Failed to initialize Ouroboros folder structure.");
  }
};

const findFileId = async (fileName: string, folderId: string): Promise<string | null> => {
  try {
    const response = await (window as any).gapi.client.drive.files.list({
      q: `name = '${fileName}' and '${folderId}' in parents and trashed = false`,
      fields: 'files(id, name)',
      spaces: 'drive',
    });
    const files = response.result.files;
    return (files && files.length > 0) ? files[0].id : null;
  } catch (err) { return null; }
};

export const listJSONFiles = async (): Promise<{id: string, name: string}[]> => {
  try {
    const folderId = await ensureFolderExists();
    const response = await (window as any).gapi.client.drive.files.list({
      q: `'${folderId}' in parents and mimeType = 'application/json' and trashed = false`,
      fields: 'files(id, name)',
      orderBy: 'modifiedTime desc'
    });
    return response.result.files || [];
  } catch (err) { return []; }
};

export const readFile = async (fileId: string): Promise<string> => {
  try {
    const accessToken = (window as any).gapi.client.getToken().access_token;
    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    if (!response.ok) throw new Error("Read File Failed");
    return await response.text();
  } catch (error) { throw error; }
};

export const createFile = async (name: string, content: string | object, folderId: string, mimeType: string): Promise<string> => {
  try {
    const metadata = { name, mimeType, parents: [folderId] };
    const accessToken = (window as any).gapi.client.getToken().access_token;
    const bodyContent = typeof content === 'object' ? JSON.stringify(content) : content;
    const multipartRequestBody = `--foo_bar_baz\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--foo_bar_baz\r\nContent-Type: ${mimeType}\r\n\r\n${bodyContent}\r\n--foo_bar_baz--`;
    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'multipart/related; boundary=foo_bar_baz' },
      body: multipartRequestBody,
    });
    const result = await response.json();
    return result.id;
  } catch (error) { throw error; }
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

  const bodyContent = JSON.stringify(data);
  const multipartRequestBody = `--foo_bar_baz\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--foo_bar_baz\r\nContent-Type: application/json\r\n\r\n${bodyContent}\r\n--foo_bar_baz--`;

  const response = await fetch(url, {
    method,
    headers: { 'Authorization': `Bearer ${accessToken()}`, 'Content-Type': 'multipart/related; boundary=foo_bar_baz' },
    body: multipartRequestBody,
  });
  
  if (!response.ok) throw new Error(`Drive Upload Failed: ${response.statusText}`);
  const res = await response.json();
  return res.id;
};

const accessToken = () => (window as any).gapi.client.getToken().access_token;

export const loadState = async (fileId?: string): Promise<AppData | null> => {
  const folderId = await ensureFolderExists();
  const targetId = fileId || await findFileId(FILE_NAME, folderId);
  if (!targetId) return null;
  try {
    const content = await readFile(targetId);
    return JSON.parse(content);
  } catch (err) { return null; }
};

export const findFile = async (name: string): Promise<string | null> => {
  try {
    const folderId = await ensureFolderExists();
    return await findFileId(name, folderId);
  } catch (err) { return null; }
};

export const runDiagnostics = async (): Promise<string> => {
  try {
    const folderId = await ensureFolderExists();
    const appFileId = await findFileId(FILE_NAME, folderId);
    return `Diagnostic: Folder OK (${folderId}), AppData: ${appFileId || 'Not Found'}`;
  } catch (err: any) { return `Error: ${err.message}`; }
};

export const performSurgicalInjection = async (): Promise<string> => {
  const folderId = await ensureFolderExists();
  const payload: AppData = { app_version: "1.3.0", last_sync_timestamp: Date.now(), memory: INITIAL_MEMORY, focus: INITIAL_FOCUS };
  const id = await createFile(FILE_NAME, payload, folderId, 'application/json');
  return `Injection successful: ${id}`;
};