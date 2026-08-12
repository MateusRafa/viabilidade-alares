/**
 * Abre a Agenda no navegador para login manual (Akamai Access).
 * Após autenticar, pressione ENTER no terminal para salvar a sessão.
 */
import readline from 'readline';
import { chromium } from 'playwright';
import { getAgendaBotConfig } from '../lib/portalCensup/agendaBot/config.js';

async function main() {
  const config = getAgendaBotConfig();

  console.log('');
  console.log('🔐 Login da Agenda — Portal CENSUP');
  console.log('──────────────────────────────────');
  console.log(`URL: ${config.listUrl}`);
  console.log(`Sessão será salva em: ${config.sessionFile}`);
  console.log('');
  console.log('1. Faça login na Agenda quando o navegador abrir');
  console.log('2. Confirme que a fila "Arrastadinhas" está visível');
  console.log('3. Volte aqui e pressione ENTER para salvar a sessão');
  console.log('');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: 'pt-BR'
  });
  const page = await context.newPage();
  await page.goto(config.listUrl, { waitUntil: 'domcontentloaded' });

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  await new Promise((resolve) => rl.question('Pressione ENTER após concluir o login… ', resolve));
  rl.close();

  await context.storageState({ path: config.sessionFile });
  console.log(`✅ Sessão salva em ${config.sessionFile}`);
  console.log('   Defina AGENDA_BOT_ENABLED=true e reinicie o backend para iniciar o bot.');

  await browser.close();
}

main().catch((err) => {
  console.error('❌ Erro no login da Agenda:', err.message);
  process.exit(1);
});
