/**
 * Local HTTP server for @codenexus/monitor.
 *
 * Serves the Vite-built React frontend from dist/ and proxies:
 *   /api/*  → remote monitor-server REST API
 *   /ws     → remote monitor-server WebSocket
 *
 * Architecture:
 *   Browser → localhost:8967 → this server → remote monitor-server
 */

import { createServer as createHttpServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const net = require('node:net') as typeof import('node:net');

// ---------------------------------------------------------------------------
// MIME types
// ---------------------------------------------------------------------------

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.mjs':  'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.ttf':  'font/ttf',
};

// ---------------------------------------------------------------------------
// Proxy helpers
// ---------------------------------------------------------------------------

/**
 * Forward an HTTP request to the target server using Node's built-in fetch.
 */
async function proxyRequest(
  req: import('node:http').IncomingMessage,
  res: import('node:http').ServerResponse,
  target: string,
): Promise<void> {
  const url = new URL(req.url!, target);
  const proxyUrl = url.toString();

  const headers: Record<string, string> = {};
  for (const [key, value] of Object.entries(req.headers)) {
    if (typeof value === 'string') headers[key] = value;
    else if (Array.isArray(value)) headers[key] = value.join(', ');
  }
  delete headers.host;
  headers['x-forwarded-for'] = req.socket.remoteAddress || '127.0.0.1';

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  try {
    const response = await fetch(proxyUrl, {
      method: req.method,
      headers,
      body: ['GET', 'HEAD'].includes(req.method || 'GET') ? undefined : req,
      signal: controller.signal,
      // @ts-expect-error Node fetch duplex
      duplex: 'half',
    });

    clearTimeout(timeout);

    const respHeaders: Record<string, string> = {};
    response.headers.forEach((v, k) => { respHeaders[k] = v; });
    res.writeHead(response.status, respHeaders);

    if (response.body) {
      const reader = response.body.getReader();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!res.destroyed) res.write(Buffer.from(value));
      }
    }
    res.end();
  } catch (err: any) {
    clearTimeout(timeout);
    console.error(`[monitor] proxy error: ${req.method} ${req.url} → ${err.message}`);
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: `proxy error: ${err.message}` }));
    }
  }
}

// ---------------------------------------------------------------------------
// WebSocket proxy
// ---------------------------------------------------------------------------

/**
 * Upgrade handler: proxy WebSocket connections to the target server.
 *
 * Uses the raw net.Socket API to relay bytes bidirectionally without
 * any WebSocket library dependency on the server side.
 */
function handleWsUpgrade(
  req: import('node:http').IncomingMessage,
  socket: import('node:stream').Duplex,
  head: Buffer,
  target: string,
): void {
  const wsUrl = new URL(req.url!, target.replace(/^http/, 'ws'));

  console.log(`[monitor] WS upgrade: ${req.url} → ${wsUrl}`);

  const key = req.headers['sec-websocket-key'] || '';
  const version = req.headers['sec-websocket-version'] || '13';
  const protocolHeader = req.headers['sec-websocket-protocol']
    ? `Sec-WebSocket-Protocol: ${req.headers['sec-websocket-protocol']}\r\n`
    : '';

  const upgradeRequest =
    `GET ${wsUrl.pathname}${wsUrl.search} HTTP/1.1\r\n` +
    `Host: ${wsUrl.host}\r\n` +
    `Upgrade: websocket\r\n` +
    `Connection: Upgrade\r\n` +
    `Sec-WebSocket-Key: ${key}\r\n` +
    `Sec-WebSocket-Version: ${version}\r\n` +
    protocolHeader +
    `\r\n`;

  const port = wsUrl.protocol === 'wss:' ? 443 : 80;
  const hostname = wsUrl.hostname;

  const targetSocket = net.connect(port, hostname, () => {
    targetSocket.write(upgradeRequest);
    if (head.length > 0) targetSocket.write(head);
  });

  targetSocket.on('data', (chunk) => {
    if (!(socket as any).destroyed) (socket as any).write(chunk);
  });

  (socket as any).on('data', (chunk: Buffer) => {
    if (!targetSocket.destroyed) targetSocket.write(chunk);
  });

  targetSocket.on('error', (err) => {
    console.error(`[monitor] WS proxy target error: ${err.message}`);
    (socket as any).destroy();
  });

  (socket as any).on('error', (err: Error) => {
    console.error(`[monitor] WS proxy client error: ${err.message}`);
    targetSocket.destroy();
  });

  targetSocket.on('close', () => (socket as any).destroy());
  (socket as any).on('close', () => targetSocket.destroy());
}

// ---------------------------------------------------------------------------
// Static file serving
// ---------------------------------------------------------------------------

function serveStatic(
  req: import('node:http').IncomingMessage,
  res: import('node:http').ServerResponse,
  distDir: string,
): void {
  let filePath = join(distDir, req.url === '/' ? 'index.html' : req.url);

  // Security: prevent path traversal
  if (!filePath.startsWith(distDir)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  if (!existsSync(filePath)) {
    // SPA fallback
    filePath = join(distDir, 'index.html');
  }

  try {
    const data = readFileSync(filePath);
    const ext = extname(filePath);
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
}

// ---------------------------------------------------------------------------
// Server factory
// ---------------------------------------------------------------------------

export interface ServerOptions {
  target: string;
  port: number;
}

export function createServer(
  { target, port }: ServerOptions,
): Promise<{ httpServer: import('node:http').Server; port: number }> {
  const __dirname = fileURLToPath(new URL('.', import.meta.url));
  const distDir = resolve(__dirname, '..', 'dist');

  if (!existsSync(join(distDir, 'index.html'))) {
    console.warn('[monitor] warning: dist/index.html not found — run "npm run build" first');
  }

  const httpServer = createHttpServer((req, res) => {
    if (req.url?.startsWith('/api/')) {
      proxyRequest(req, res, target);
    } else {
      serveStatic(req, res, distDir);
    }
  });

  httpServer.on('upgrade', (req, socket, head) => {
    if (req.url?.startsWith('/ws')) {
      handleWsUpgrade(req, socket, head, target);
    } else {
      socket.destroy();
    }
  });

  return new Promise((resolve, reject) => {
    httpServer.on('error', reject);
    httpServer.listen(port, () => {
      resolve({ httpServer, port });
    });
  });
}
