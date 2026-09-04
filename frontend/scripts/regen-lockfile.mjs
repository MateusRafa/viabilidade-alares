import https from 'https';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(__dirname, '..');
const tgz = path.join(os.tmpdir(), 'npm-10.9.2.tgz');
const extractDir = path.join(os.tmpdir(), 'npm-extract-10.9.2');

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const follow = (currentUrl) => {
      https
        .get(currentUrl, (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            follow(res.headers.location);
            return;
          }
          if (res.statusCode !== 200) {
            reject(new Error(`HTTP ${res.statusCode} for ${currentUrl}`));
            return;
          }
          const file = fs.createWriteStream(dest);
          res.pipe(file);
          file.on('finish', () => file.close(() => resolve()));
          file.on('error', reject);
        })
        .on('error', reject);
    };
    follow(url);
  });
}

console.log('Downloading npm…');
await download('https://registry.npmjs.org/npm/-/npm-10.9.2.tgz', tgz);

fs.rmSync(extractDir, { recursive: true, force: true });
fs.mkdirSync(extractDir, { recursive: true });
console.log('Extracting…');
execSync(`tar -xf "${tgz}" -C "${extractDir}"`, { stdio: 'inherit' });

const npmCli = path.join(extractDir, 'package', 'bin', 'npm-cli.js');
if (!fs.existsSync(npmCli)) {
  throw new Error(`npm-cli.js not found at ${npmCli}`);
}

console.log('Regenerating package-lock.json…');
execSync(`node "${npmCli}" install --package-lock-only --no-audit --legacy-peer-deps`, {
  cwd: frontendRoot,
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'development',
    NPM_CONFIG_PRODUCTION: 'false'
  }
});

console.log('Done.');
