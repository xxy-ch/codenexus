#!/usr/bin/env node

/**
 * @codenexus/monitor — CLI entrypoint
 *
 * Starts a local HTTP server that serves the built React dashboard
 * and proxies /api/* and /ws/* to a remote monitor-server.
 *
 * Usage:
 *   npx @codenexus/monitor --server http://localhost:4000 [--port 8967]
 */

import { createServer } from '../dist/server.js';

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = { server: '', port: 8967 };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if ((arg === '--server' || arg === '-s') && argv[i + 1]) {
      args.server = argv[++i];
    } else if ((arg === '--port' || arg === '-p') && argv[i + 1]) {
      args.port = parseInt(argv[++i], 10);
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
@codenexus/monitor — CodeNexus monitoring dashboard

Usage:
  npx @codenexus/monitor --server <url> [--port <port>]

Options:
  --server, -s   Remote monitor-server URL (e.g. http://localhost:4000)
  --port,   -p   Local port for the dashboard server (default: 8967)
  --help,   -h   Show this help message
`);
      process.exit(0);
    }
  }

  if (!args.server) {
    console.error('Error: --server flag is required. Usage: npx @codenexus/monitor --server http://localhost:4000');
    process.exit(1);
  }

  // Normalise — strip trailing slash
  args.server = args.server.replace(/\/+$/, '');

  if (isNaN(args.port) || args.port < 1 || args.port > 65535) {
    console.error(`Error: invalid port "${args.port}". Must be 1-65535.`);
    process.exit(1);
  }

  return args;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const { server: target, port } = parseArgs(process.argv);

createServer({ target, port })
  .then(({ httpServer, port }) => {
    console.log(`[monitor] dashboard → http://localhost:${port}`);
    console.log(`[monitor] proxying to → ${target}`);
    console.log(`[monitor] listening on :${port}`);
  })
  .catch((err) => {
    console.error('[monitor] fatal:', err.message);
    process.exit(1);
  });
