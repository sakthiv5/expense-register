import { build } from 'esbuild';
import { readdirSync } from 'fs';
import { join } from 'path';

const handlersDir = join('src', 'handlers');
const handlers = readdirSync(handlersDir).filter(f => f.endsWith('.ts'));

const entryPoints = {};
for (const handler of handlers) {
  const name = handler.replace('.ts', '');
  entryPoints[`handlers/${name}`] = join(handlersDir, handler);
}

const isWatch = process.argv.includes('--watch');

const options = {
  entryPoints,
  bundle: true,
  platform: 'node',
  target: 'node20',
  outdir: 'dist',
  format: 'cjs',
  sourcemap: true,
  external: [
    '@aws-sdk/client-dynamodb',
    '@aws-sdk/lib-dynamodb',
    '@aws-sdk/client-s3',
    '@aws-sdk/s3-request-presigner',
  ],
  minify: false,
};

if (isWatch) {
  const ctx = await build({ ...options, logLevel: 'info' });
  console.log('Watching for changes...');
} else {
  await build(options);
  console.log('Build complete.');
}
