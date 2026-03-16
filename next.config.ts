import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    'knex',
    'sqlite3',
    'pg',
    'tedious',
    'mysql',
    'mysql2',
    'oracledb',
    'pg-query-stream',
    'better-sqlite3'
  ]
};

export default nextConfig;
