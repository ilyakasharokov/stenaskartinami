#!/usr/bin/env node
/**
 * Run inside api-v5 container from app dir so pg is found:
 * docker cp api-v5/scripts/test-db-connection.js stenaskartinami-api-v5:/usr/src/app/scripts/
 * docker exec -it -w /usr/src/app stenaskartinami-api-v5 node scripts/test-db-connection.js
 */
const { Client } = require('pg');

const config = {
  host: process.env.DATABASE_HOST || 'postgres',
  port: parseInt(process.env.DATABASE_PORT || '5432', 10),
  database: process.env.DATABASE_NAME || 'stenaskartinami',
  user: process.env.DATABASE_USERNAME || 'postgres',
  password: process.env.DATABASE_PASSWORD || 'postgres',
  connectionTimeoutMillis: 10000,
};

console.log('Connecting with:', { ...config, password: config.password ? '***' : undefined });

const client = new Client(config);

client
  .connect()
  .then(() => {
    console.log('Connected successfully');
    return client.query('SELECT 1 as ok');
  })
  .then((res) => {
    console.log('Query result:', res.rows);
    client.end();
    process.exit(0);
  })
  .catch((err) => {
    console.error('Connection failed:', err.message);
    console.error('Code:', err.code);
    process.exit(1);
  });
