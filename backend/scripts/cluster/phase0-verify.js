/**
 * Fase 0 — Verifica se Primary (B1) e Réplica (B2) estão prontos para o cluster.
 *
 * Uso:
 *   node scripts/cluster/phase0-verify.js
 *
 * Requer no backend/.env:
 *   SUPABASE_URL, SUPABASE_SERVICE_KEY
 *   SUPABASE_REPLICA_URL, SUPABASE_REPLICA_SERVICE_KEY
 */

import './loadEnvShim.js';
import {
  createClusterClient,
  getPrimaryConfig,
  getReplicaConfig,
  maskUrl
} from './clusterClients.js';

const CLUSTER_TABLES = ['ctos', 'condominios', 'coverage_polygons', 'coverage_calculation_progress'];

const CLUSTER_RPCS = [
  'check_point_in_coverage',
  'get_active_coverage_polygon',
  'get_polygon_geojson',
  'calculate_coverage_polygon_batch',
  'union_polygons_geojson',
  'simplify_polygon_geojson',
  'calculate_polygon_area_km2',
  'save_coverage_polygon_from_geojson',
  'get_coverage_calculation_status',
  'calculate_polygon_for_specific_ctos'
];

async function tableExists(client, table) {
  const { error } = await client.from(table).select('*', { head: true, count: 'exact' }).limit(1);
  if (!error) return { exists: true };
  if (error.code === 'PGRST116' || /does not exist/i.test(error.message || '')) {
    return { exists: false, error: 'Tabela não existe' };
  }
  return { exists: false, error: error.message };
}

async function countRows(client, table) {
  const { count, error } = await client.from(table).select('*', { head: true, count: 'exact' });
  if (error) return { error: error.message };
  return { count: count ?? 0 };
}

async function rpcExists(client, fnName) {
  const { error } = await client.rpc(fnName, {});
  if (!error) return { exists: true, note: 'RPC respondeu (parâmetros podem estar incompletos)' };
  const msg = error.message || '';
  if (
    error.code === 'PGRST202' ||
    /does not exist/i.test(msg) ||
    /Could not find the function/i.test(msg)
  ) {
    return { exists: false, error: msg };
  }
  return { exists: true, note: `RPC existe (erro esperado de parâmetro: ${msg.slice(0, 80)}…)` };
}

async function getActiveCoverageSummary(client) {
  const { data, error } = await client.rpc('get_active_coverage_polygon');
  if (error) return { error: error.message };
  if (!data || data.length === 0) return { active: false };
  const row = data[0];
  return {
    active: true,
    id: row.id,
    total_ctos: row.total_ctos,
    version: row.version,
    area_km2: row.area_km2
  };
}

async function auditBackend(label, config) {
  const result = {
    label,
    url: maskUrl(config.url),
    configured: Boolean(config.url && config.serviceKey),
    connected: false,
    tables: {},
    rpcs: {},
    counts: {},
    coverage: null,
    errors: []
  };

  if (!result.configured) {
    result.errors.push('URL ou SERVICE_KEY ausente');
    return result;
  }

  const client = createClusterClient(config);
  if (!client) {
    result.errors.push('Falha ao criar cliente');
    return result;
  }

  const ping = await tableExists(client, 'ctos');
  result.connected = ping.exists || !/connection|fetch failed|ENOTFOUND/i.test(ping.error || '');
  if (!ping.exists && ping.error === 'Tabela não existe') {
    result.connected = true;
  }

  for (const table of CLUSTER_TABLES) {
    result.tables[table] = await tableExists(client, table);
    if (result.tables[table].exists) {
      result.counts[table] = await countRows(client, table);
    }
  }

  for (const rpc of CLUSTER_RPCS) {
    result.rpcs[rpc] = await rpcExists(client, rpc);
  }

  if (result.rpcs.get_active_coverage_polygon?.exists) {
    result.coverage = await getActiveCoverageSummary(client);
  }

  return result;
}

function printBackendReport(audit) {
  console.log(`\n━━━ ${audit.label.toUpperCase()} (${audit.url}) ━━━`);
  if (!audit.configured) {
    console.log('  ❌ Não configurado');
    audit.errors.forEach((e) => console.log(`     • ${e}`));
    return;
  }

  console.log(`  Conexão: ${audit.connected ? '✅' : '❌'}`);

  console.log('  Tabelas:');
  for (const [table, info] of Object.entries(audit.tables)) {
    const count = audit.counts[table]?.count;
    const countStr = info.exists && count != null ? ` (${count} linhas)` : '';
    console.log(`    ${info.exists ? '✅' : '❌'} ${table}${countStr}`);
    if (!info.exists && info.error) console.log(`       ${info.error}`);
  }

  const missingRpcs = Object.entries(audit.rpcs).filter(([, v]) => !v.exists);
  console.log(`  RPCs: ${CLUSTER_RPCS.length - missingRpcs.length}/${CLUSTER_RPCS.length} OK`);
  for (const [rpc, info] of missingRpcs) {
    console.log(`    ❌ ${rpc}`);
  }

  if (audit.coverage?.error) {
    console.log(`  Cobertura ativa: ⚠️ ${audit.coverage.error}`);
  } else if (audit.coverage?.active) {
    console.log(
      `  Cobertura ativa: ✅ id=${audit.coverage.id} v${audit.coverage.version} ctos=${audit.coverage.total_ctos}`
    );
  } else {
    console.log('  Cobertura ativa: ⚠️ nenhum polígono (rode o cálculo da mancha no B1 e copie para B2)');
  }
}

function compareCounts(primary, replica) {
  console.log('\n━━━ COMPARAÇÃO B1 vs B2 ━━━');
  let allMatch = true;

  for (const table of CLUSTER_TABLES) {
    const a = primary.counts[table]?.count;
    const b = replica.counts[table]?.count;
    if (a == null || b == null) {
      console.log(`  ⚠️ ${table}: não foi possível comparar`);
      allMatch = false;
      continue;
    }
    const ok = a === b;
    if (!ok) allMatch = false;
    console.log(`  ${ok ? '✅' : '❌'} ${table}: primary=${a} | replica=${b}`);
  }

  if (primary.coverage?.active && replica.coverage?.active) {
    const covOk =
      primary.coverage.total_ctos === replica.coverage.total_ctos &&
      primary.coverage.version === replica.coverage.version;
    if (!covOk) allMatch = false;
    console.log(
      `  ${covOk ? '✅' : '❌'} coverage: primary v${primary.coverage.version} / replica v${replica.coverage.version}`
    );
  }

  return allMatch;
}

async function main() {
  console.log('🔍 Fase 0 — Verificação do cluster Supabase (CTOs + Prédios + Cobertura)\n');

  const primary = await auditBackend('primary', getPrimaryConfig());
  const replica = await auditBackend('replica', getReplicaConfig());

  printBackendReport(primary);
  printBackendReport(replica);

  const primaryReady =
    primary.configured &&
    CLUSTER_TABLES.every((t) => primary.tables[t]?.exists) &&
    CLUSTER_RPCS.every((r) => primary.rpcs[r]?.exists);

  const replicaReady =
    replica.configured &&
    CLUSTER_TABLES.every((t) => replica.tables[t]?.exists) &&
    CLUSTER_RPCS.every((r) => replica.rpcs[r]?.exists);

  let inSync = false;
  if (primaryReady && replicaReady) {
    inSync = compareCounts(primary, replica);
  } else {
    console.log('\n━━━ COMPARAÇÃO B1 vs B2 ━━━');
    console.log('  ⚠️ Pulada — corrija tabelas/RPCs faltantes antes.');
  }

  console.log('\n━━━ RESULTADO FASE 0 ━━━');
  console.log(`  Primary pronto: ${primaryReady ? '✅' : '❌'}`);
  console.log(`  Réplica pronta: ${replicaReady ? '✅' : '❌'}`);
  console.log(`  Dados sincronizados: ${inSync ? '✅' : '❌'}`);

  if (primaryReady && replicaReady && inSync) {
    console.log('\n✅ Fase 0 concluída. Pode avançar para Fase 1 (variáveis + módulo supabaseCluster).');
    process.exit(0);
  }

  console.log('\n📋 Próximos passos:');
  if (!replica.configured) {
    console.log('  1. Crie o projeto B2 no Supabase e adicione SUPABASE_REPLICA_* no backend/.env');
  }
  if (!replicaReady && replica.configured) {
    console.log('  2. Replique schema/RPCs do B1 no B2 (SQL Editor → ver backend/sql/cluster/)');
  }
  if (primaryReady && replicaReady && !inSync) {
    console.log('  3. Rode: npm run cluster:copy-data -- --confirm');
  }
  console.log('  4. Rode novamente: npm run cluster:verify');

  process.exit(primaryReady && replicaReady && inSync ? 0 : 1);
}

main().catch((err) => {
  console.error('❌ Erro:', err);
  process.exit(1);
});
