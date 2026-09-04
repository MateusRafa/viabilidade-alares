import { existsSync, readdirSync, statSync } from 'fs';
import { spawnSync } from 'child_process';
import { resolve } from 'path';

const cwd = process.cwd();
console.log('[build] cwd =', cwd);
console.log('[build] entries =', readdirSync(cwd).sort().join(', '));

const required = ['index.html', 'embed.html', 'vite.config.js', 'package.json', 'src'];
const missing = required.filter((name) => !existsSync(resolve(cwd, name)));

if (missing.length) {
  console.error('[build] Arquivos/pastas obrigatórios ausentes:', missing.join(', '));
  console.error(
    '[build] No Railway, o Root Directory precisa ser a pasta do frontend (onde está o index.html).'
  );
  console.error(
    '[build] Confirme também que index.html e embed.html estão commitados no GitHub.'
  );
  process.exit(1);
}

for (const name of ['index.html', 'embed.html']) {
  const st = statSync(resolve(cwd, name));
  console.log(`[build] ${name} OK (${st.size} bytes)`);
}

const result = spawnSync('npx', ['vite', 'build'], {
  cwd,
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    NODE_ENV: 'production'
  }
});

process.exit(result.status ?? 1);
