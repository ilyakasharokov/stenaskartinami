#!/usr/bin/env node
/**
 * Wait for Postgres to be reachable, then exec the rest of the command.
 * Usage: node scripts/wait-for-db.js -- npm start
 */
const { spawn } = require('child_process');
const { Client } = require('pg');

const host = process.env.DATABASE_HOST || 'postgres';
const port = parseInt(process.env.DATABASE_PORT || '5432', 10);
const database = process.env.DATABASE_NAME || 'stenaskartinami';
const user = process.env.DATABASE_USERNAME || 'postgres';
const password = process.env.DATABASE_PASSWORD || 'postgres';
const maxAttempts = 30;
const delayMs = 2000;

function tryConnect(attempt) {
  const client = new Client({
    host,
    port,
    database,
    user,
    password,
    connectionTimeoutMillis: 5000,
  });
  return client
    .connect()
    .then(() => {
      client.end();
      return true;
    })
    .catch(() => false);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const args = process.argv.slice(2);
  if (args[0] === '--') args.shift();
  const cmd = args[0];
  const cmdArgs = args.slice(1);
  if (!cmd) {
    console.error('Usage: node wait-for-db.js -- <command> [args...]');
    process.exit(1);
  }

  console.log(`[wait-for-db] Waiting for postgres at ${host}:${port} (max ${maxAttempts} attempts)...`);
  for (let i = 1; i <= maxAttempts; i++) {
    if (await tryConnect(i)) {
      console.log(`[wait-for-db] Postgres is ready after ${i} attempt(s). Starting: ${cmd} ${cmdArgs.join(' ')}`);
      const child = spawn(cmd, cmdArgs, {
        stdio: 'inherit',
        shell: false,
        env: process.env,
      });
      child.on('exit', (code) => process.exit(code != null ? code : 0));
      return;
    }
    console.log(`[wait-for-db] Attempt ${i}/${maxAttempts} failed, retrying in ${delayMs}ms...`);
    await sleep(delayMs);
  }
  console.error('[wait-for-db] Postgres did not become ready in time.');
  process.exit(1);
}

main();
