import { existsSync, readdirSync, statSync, writeFileSync, mkdirSync } from 'fs';
import { spawnSync } from 'child_process';
import { resolve } from 'path';

const cwd = process.cwd();
console.log('[build] cwd =', cwd);
console.log('[build] entries =', readdirSync(cwd).sort().join(', '));

const INDEX_HTML = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link rel="icon" href="/favicons/alares.png" type="image/png">
    <title>Viabilidade Alares - Engenharia</title>
</head>
<body>
    <div id="app"></div>
    <script type="module" src="/src/main.js"></script>
</body>
</html>
`;

const EMBED_HTML = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <link rel="icon" href="/favicons/alares.png" type="image/png" />
  <title>Portal CENSUP — Workbench</title>
  <style>
    html, body, #app {
      margin: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: #f0f2f8;
      font-family: Inter, system-ui, sans-serif;
    }
  </style>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/embed-main.js"></script>
</body>
</html>
`;

const MIN_VITE_CONFIG = `import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { resolve } from "path";

export default defineConfig({
  plugins: [svelte()],
  build: {
    outDir: "dist",
    rollupOptions: {
      input: {
        main: resolve(process.cwd(), "index.html"),
        embed: resolve(process.cwd(), "embed.html")
      }
    }
  }
});
`;

function ensureFile(name, contents) {
  const path = resolve(cwd, name);
  if (!existsSync(path)) {
    writeFileSync(path, contents, 'utf8');
    console.warn(`[build] ${name} ausente no deploy — recriado automaticamente.`);
  } else {
    console.log(`[build] ${name} OK (${statSync(path).size} bytes)`);
  }
}

ensureFile('index.html', INDEX_HTML);
ensureFile('embed.html', EMBED_HTML);
ensureFile('vite.config.js', MIN_VITE_CONFIG);

if (!existsSync(resolve(cwd, 'src'))) {
  console.error('[build] Pasta src/ ausente. Root Directory do Railway está errado ou o repo está incompleto.');
  process.exit(1);
}

if (!existsSync(resolve(cwd, 'src/main.js'))) {
  console.error('[build] src/main.js ausente. O código-fonte não foi enviado ao deploy.');
  process.exit(1);
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
