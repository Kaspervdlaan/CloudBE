/**
 * aria2 RPC API utilities
 */

// aria2 RPC is accessible through gluetun since aria2 uses network_mode: "service:gluetun"
const ARIA2_RPC_URL = process.env.ARIA2_RPC_URL || 'http://drive-gluetun:6800/jsonrpc';
const ARIA2_RPC_SECRET = process.env.ARIA2_RPC_SECRET || '';

type Aria2RPCResponse<T = any> = {
  jsonrpc: string;
  id: string;
  result?: T;
  error?: {
    code: number;
    message: string;
  };
};

type Aria2Torrent = {
  gid: string;
  status: string;
  totalLength: string;
  completedLength: string;
  uploadLength: string;
  bitfield: string;
  downloadSpeed: string;
  uploadSpeed: string;
  infoHash?: string;
  numSeeders?: string;
  seeder?: string;
  pieceLength: string;
  numPieces: string;
  connections: string;
  errorCode?: string;
  errorMessage?: string;
  followedBy?: string[];
  following?: string;
  belongsTo?: string;
  dir?: string;
  files?: Array<{
    index: string;
    path: string;
    length: string;
    completedLength: string;
    selected: string;
    uris?: Array<{
      uri: string;
      status: string;
    }>;
  }>;
  bittorrent?: {
    info?: {
      name: string;
    };
    announceList?: string[][];
    comment?: string;
    creationDate?: string;
    mode?: string;
  };
};

/**
 * Make an aria2 RPC call
 */
async function makeRPCCall<T = any>(
  method: string,
  params: any[] = []
): Promise<T> {
  const requestParams = ARIA2_RPC_SECRET
    ? [`token:${ARIA2_RPC_SECRET}`, ...params]
    : params;

  const payload = {
    jsonrpc: '2.0',
    method,
    id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    params: requestParams,
  };

  const response = await fetch(ARIA2_RPC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`aria2 RPC request failed: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as Aria2RPCResponse<T>;

  if (data.error) {
    throw new Error(`aria2 RPC error: ${data.error.message} (code: ${data.error.code})`);
  }

  return data.result as T;
}

/**
 * Add a magnet link to aria2
 */
export async function addMagnetLink(
  magnetLink: string,
  options?: {
    savePath?: string;
  }
): Promise<{ gid: string }> {
  if (!magnetLink || !magnetLink.startsWith('magnet:')) {
    throw new Error('Invalid magnet link. Must start with "magnet:"');
  }

  const params: any[] = [[magnetLink]];

  if (options?.savePath) {
    params.push({
      dir: options.savePath,
    });
  }

  const gid = await makeRPCCall<string>('aria2.addUri', params);
  return { gid };
}

/**
 * Get active downloads
 */
export async function getActiveDownloads(): Promise<Aria2Torrent[]> {
  return makeRPCCall<Aria2Torrent[]>('aria2.tellActive', []);
}

/**
 * Get waiting downloads
 */
export async function getWaitingDownloads(offset: number = 0, num: number = 100): Promise<Aria2Torrent[]> {
  return makeRPCCall<Aria2Torrent[]>('aria2.tellWaiting', [offset, num]);
}

/**
 * Get stopped downloads
 */
export async function getStoppedDownloads(offset: number = 0, num: number = 100): Promise<Aria2Torrent[]> {
  return makeRPCCall<Aria2Torrent[]>('aria2.tellStopped', [offset, num]);
}

/**
 * Get download status by GID
 */
export async function getDownloadStatus(gid: string): Promise<Aria2Torrent | null> {
  try {
    const torrent = await makeRPCCall<Aria2Torrent>('aria2.tellStatus', [gid]);
    return torrent;
  } catch (error) {
    return null;
  }
}

/**
 * Pause a download
 */
export async function pauseDownload(gid: string): Promise<string> {
  return makeRPCCall<string>('aria2.pause', [gid]);
}

/**
 * Force pause a download (immediate)
 */
export async function forcePauseDownload(gid: string): Promise<string> {
  return makeRPCCall<string>('aria2.forcePause', [gid]);
}

/**
 * Resume a download
 */
export async function resumeDownload(gid: string): Promise<string> {
  return makeRPCCall<string>('aria2.unpause', [gid]);
}

/**
 * Remove a download
 */
export async function removeDownload(gid: string): Promise<string> {
  return makeRPCCall<string>('aria2.remove', [gid]);
}

/**
 * Force remove a download (immediate)
 */
export async function forceRemoveDownload(gid: string): Promise<string> {
  return makeRPCCall<string>('aria2.forceRemove', [gid]);
}

/**
 * Get global statistics
 */
export async function getGlobalStats(): Promise<{
  downloadSpeed: string;
  uploadSpeed: string;
  numActive: string;
  numWaiting: string;
  numStopped: string;
  numStoppedTotal: string;
}> {
  return makeRPCCall('aria2.getGlobalStat', []);
}

