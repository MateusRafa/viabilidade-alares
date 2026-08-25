import { createClient } from '@supabase/supabase-js';

function trimEnv(name) {
  return (process.env[name] || '').trim();
}

function firstEnv(names) {
  for (const name of names) {
    const value = trimEnv(name);
    if (value) return { name, value };
  }
  return { name: null, value: '' };
}

function findServiceKey() {
  const exact = firstEnv([
    'PORTAL_CENSUP_SUPABASE_SERVICE_KEY',
    'PORTAL_CENSUP_SUPABASE_SECRET_KEY',
    'PORTAL_CENSUP_SUPABASE_SECRET',
    'PORTAL_CENSUP_SUPABASE_SERVICE_ROLE_KEY'
  ]);
  if (exact.value) return exact;

  // Railway às vezes corta o nome longo na UI; aceita qualquer PORTAL_CENSUP_SUPABASE_SERVICE*
  const match = Object.keys(process.env).find((key) => {
    if (!/^PORTAL_CENSUP_SUPABASE_SERVICE/i.test(key)) return false;
    if (/ANON|PUBLISHABLE/i.test(key)) return false;
    return Boolean((process.env[key] || '').trim());
  });
  if (match) return { name: match, value: (process.env[match] || '').trim() };
  return { name: null, value: '' };
}

function describeKey(value) {
  if (!value) return 'ausente';
  if (value.startsWith('sb_secret_')) return 'sb_secret';
  if (value.startsWith('sb_publishable_')) return 'sb_publishable';
  if (value.startsWith('eyJ')) return 'jwt';
  return 'desconhecido';
}

function listCensupEnvNames() {
  return Object.keys(process.env)
    .filter((key) => key.startsWith('PORTAL_CENSUP_'))
    .sort();
}

const urlInfo = firstEnv(['PORTAL_CENSUP_SUPABASE_URL']);
const keyInfo = findServiceKey();
const anonInfo = firstEnv(['PORTAL_CENSUP_SUPABASE_ANON_KEY', 'PORTAL_CENSUP_SUPABASE_PUBLISHABLE_KEY']);

const CENSUP_SUPABASE_URL = urlInfo.value;
const CENSUP_SUPABASE_SERVICE_KEY = keyInfo.value;
const CENSUP_SUPABASE_ANON_KEY = anonInfo.value;

let supabaseCensup = null;
let supabaseCensupAvailable = false;
let initError = '';
let initDone = false;

function createCensupClient(url, key) {
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    },
    db: {
      schema: 'public'
    }
  });
}

function initClient() {
  if (initDone) return;
  initDone = true;

  const censupNames = listCensupEnvNames();
  console.log(
    `🔧 [PortalCENSUP][Supabase] Variáveis PORTAL_CENSUP_* no processo: ${censupNames.length ? censupNames.join(', ') : '(nenhuma)'}`
  );
  console.log(
    `🔧 [PortalCENSUP][Supabase] URL=${urlInfo.name || 'PORTAL_CENSUP_SUPABASE_URL'} (${CENSUP_SUPABASE_URL ? 'ok' : 'ausente'}) | chave=${keyInfo.name || 'PORTAL_CENSUP_SUPABASE_SERVICE_KEY'} (${describeKey(CENSUP_SUPABASE_SERVICE_KEY)})`
  );

  if (!CENSUP_SUPABASE_URL || !CENSUP_SUPABASE_SERVICE_KEY) {
    initError =
      'Variáveis ausentes neste processo. No Railway use exatamente PORTAL_CENSUP_SUPABASE_URL e PORTAL_CENSUP_SUPABASE_SERVICE_KEY no serviço backend que a extensão chama, depois Redeploy.';
    console.warn('⚠️ [PortalCENSUP][Supabase] Não configurado.');
    console.warn(`⚠️ [PortalCENSUP][Supabase] ${initError}`);
    return;
  }

  try {
    supabaseCensup = createCensupClient(CENSUP_SUPABASE_URL, CENSUP_SUPABASE_SERVICE_KEY);
    supabaseCensupAvailable = true;
    console.log('✅ [PortalCENSUP][Supabase] Cliente próprio criado');
    console.log('✅ [PortalCENSUP][Supabase] URL:', CENSUP_SUPABASE_URL);
  } catch (err) {
    initError = err.message || String(err);
    console.error('❌ [PortalCENSUP][Supabase] Erro ao criar cliente:', initError);
  }
}

initClient();

const supabaseCensupAnon =
  CENSUP_SUPABASE_URL && CENSUP_SUPABASE_ANON_KEY
    ? createCensupClient(CENSUP_SUPABASE_URL, CENSUP_SUPABASE_ANON_KEY)
    : null;

export function getPortalCensupSupabase() {
  if (!supabaseCensup) initClient();
  return supabaseCensup;
}

export function isPortalCensupSupabaseAvailable() {
  if (!supabaseCensupAvailable) initClient();
  return supabaseCensupAvailable && !!supabaseCensup;
}

export async function testPortalCensupSupabaseConnection() {
  if (!isPortalCensupSupabaseAvailable()) {
    return {
      success: false,
      configured: false,
      tablesReady: false,
      error: initError || 'Configure PORTAL_CENSUP_SUPABASE_URL e PORTAL_CENSUP_SUPABASE_SERVICE_KEY',
      envNames: listCensupEnvNames(),
      urlEnv: urlInfo.name,
      keyEnv: keyInfo.name,
      keyKind: describeKey(CENSUP_SUPABASE_SERVICE_KEY)
    };
  }

  const client = getPortalCensupSupabase();
  try {
    const { error } = await client.from('chamados').select('id').limit(1);

    if (error) {
      if (error.code === 'PGRST205' || error.code === '42P01' || /does not exist|Could not find the table/i.test(error.message || '')) {
        return {
          success: true,
          configured: true,
          tablesReady: false,
          message: 'Conexão OK. A tabela chamados ainda não existe neste projeto.',
          envNames: listCensupEnvNames(),
          urlEnv: urlInfo.name,
          keyEnv: keyInfo.name,
          keyKind: describeKey(CENSUP_SUPABASE_SERVICE_KEY)
        };
      }
      throw error;
    }

    return {
      success: true,
      configured: true,
      tablesReady: true,
      message: 'Conexão OK e tabela chamados encontrada',
      envNames: listCensupEnvNames(),
      urlEnv: urlInfo.name,
      keyEnv: keyInfo.name,
      keyKind: describeKey(CENSUP_SUPABASE_SERVICE_KEY)
    };
  } catch (err) {
    return {
      success: false,
      configured: true,
      tablesReady: false,
      error: err.message || String(err),
      envNames: listCensupEnvNames(),
      urlEnv: urlInfo.name,
      keyEnv: keyInfo.name,
      keyKind: describeKey(CENSUP_SUPABASE_SERVICE_KEY)
    };
  }
}

export function getPortalCensupSupabaseConfig() {
  return {
    url: CENSUP_SUPABASE_URL || 'Não configurado',
    hasServiceKey: !!CENSUP_SUPABASE_SERVICE_KEY,
    hasAnonKey: !!CENSUP_SUPABASE_ANON_KEY,
    available: supabaseCensupAvailable,
    urlEnv: urlInfo.name,
    keyEnv: keyInfo.name,
    keyKind: describeKey(CENSUP_SUPABASE_SERVICE_KEY),
    envNames: listCensupEnvNames()
  };
}

export const portalCensupSupabaseConfig = getPortalCensupSupabaseConfig();

export { supabaseCensupAnon };
export default supabaseCensup;
