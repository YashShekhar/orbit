import { existsSync } from 'node:fs';

// Source archives and production-only installs must work without Git or dev dependencies.
if (process.env.CI || process.env.HUSKY === '0' || process.env.NODE_ENV === 'production')
  process.exit(0);
if (!existsSync('.git')) {
  console.log('Git hooks skipped: initialize Git, then run npm run prepare.');
  process.exit(0);
}
const { default: husky } = await import('husky');
const result = husky();
if (result) throw new Error(result);
