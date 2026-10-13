import path from 'node:path';
import { endpoint } from './http/validation.js';

export interface ServerConfig {
  root: string;
  dataDir: string;
  staticDir: string;
  port: number;
  dev: boolean;
}
export function loadConfig(root = process.cwd()): ServerConfig {
  const port = Number(process.env.PORT || 3000);
  if (!Number.isInteger(port) || port < 0 || port > 65535)
    throw new Error('PORT must be an integer between 0 and 65535.');
  if (process.env.MODEL_BASE_URL) endpoint(process.env.MODEL_BASE_URL);
  return {
    root,
    dataDir: path.resolve(process.env.ORBIT_DATA_DIR || path.join(root, 'data')),
    staticDir: path.join(root, 'dist/client'),
    port,
    dev: process.argv.includes('--dev'),
  };
}
