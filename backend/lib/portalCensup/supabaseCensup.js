import { createClient } from '@supabase/supabase-js';

const CENSUP_SUPABASE_URL = (process.env.PORTAL_CENSUP_SUPABASE_URL || '').trim();
const CENSUP_SUPABASE_SERVICE_KEY = (process.env.PORTAL_CENSUP_SUPABASE_SERVICE_KEY || '').trim();
const CENSUP_SUPABASE_ANON_KEY = (process.env.PORTAL_CENSUP_SUPABASE_ANON_KEY || '').trim();

let supabaseCensup = null;
let supabaseCensupAvailable = false;

if (!CENSUP_SUPABASE_URL || !CENSUP_SUPABASE_SERVICE_KEY) {
  console.warn('⚠️ [PortalCENSUP][Supabase] Não configurado.');
  console.warn('⚠️ [PortalCENSUP][Supabase] Defina PORTAL_CENSUP_SUPABASE_URL e PORTAL_CENSUP_SUPABASE_SERVICE_KEY');
  console.warn('⚠️ [PortalCENSUP][Supabase] A fila continua no JSON local até o banco próprio ser ligado.');
} else {
  try {
    supabaseCensup = createClient(CENSUP_SUPABASE_URL, CENSUP_SUPABASE_SERVICE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      db: {
        schema: 'public'
      }
    });
    supabaseCensupAvailable = true;
    console.log('✅ [PortalCENSUP][Supabase] Cliente próprio criado');
    console.log('✅ [PortalCENSUP][Supabase] URL:', CENSUP_SUPABASE_URL);
  } catch (err) {
    console.error('❌ [PortalCENSUP][Supabase] Erro ao criar cliente:', err.message);
  }
}

const supabaseCensupAnon =
  CENSUP_SUPABASE_URL && CENSUP_SUPABASE_ANON_KEY
    ? createClient(CENSUP_SUPABASE_URL, CENSUP_SUPABASE_ANON_KEY, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      })
    : null;

export function isPortalCensupSupabaseAvailable() {
  return supabaseCensupAvailable && !!supabaseCensup;
}

export async function testPortalCensupSupabaseConnection() {
  if (!isPortalCensupSupabaseAvailable()) {
    return {
      success: false,
      configured: false,
      error: 'Configure PORTAL_CENSUP_SUPABASE_URL e PORTAL_CENSUP_SUPABASE_SERVICE_KEY'
    };
  }

  try {
    const { error } = await supabaseCensup.from('chamados').select('id').limit(1);

    if (error) {
      if (error.code === 'PGRST205' || error.code === '42P01' || /does not exist|Could not find the table/i.test(error.message || '')) {
        return {
          success: true,
          configured: true,
          tablesReady: false,
          message: 'Conexão OK. A tabela chamados ainda não existe neste projeto.'
        };
      }
      throw error;
    }

    return {
      success: true,
      configured: true,
      tablesReady: true,
      message: 'Conexão OK e tabela chamados encontrada'
    };
  } catch (err) {
    return {
      success: false,
      configured: true,
      error: err.message
    };
  }
}

export const portalCensupSupabaseConfig = {
  url: CENSUP_SUPABASE_URL || 'Não configurado',
  hasServiceKey: !!CENSUP_SUPABASE_SERVICE_KEY,
  hasAnonKey: !!CENSUP_SUPABASE_ANON_KEY,
  available: supabaseCensupAvailable
};

export { supabaseCensupAnon };
export default supabaseCensup;
