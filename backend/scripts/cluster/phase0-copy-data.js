/**

 * Fase 0 — Copia dados do Primary (B1) para a Réplica (B2).

 *

 * ATENÇÃO: apaga as tabelas do cluster na RÉPLICA antes de recopiar.

 *

 * Uso:

 *   node scripts/cluster/phase0-copy-data.js --confirm

 *   node scripts/cluster/phase0-copy-data.js --confirm --tables=ctos,projetistas

 */



import './loadEnvShim.js';

import {

  createClusterClient,

  getPrimaryConfig,

  getReplicaConfig,

  maskUrl

} from './clusterClients.js';

import {

  CLUSTER_TABLES,

  fetchAllRows,

  deleteAllRows,

  insertBatches

} from '../../lib/supabaseCluster/mirrorCore.js';



const PAGE_SIZE = 1000;



function parseArgs(argv) {

  const confirm = argv.includes('--confirm');

  const tablesArg = argv.find((a) => a.startsWith('--tables='));

  const tables = tablesArg

    ? tablesArg.split('=')[1].split(',').map((t) => t.trim()).filter(Boolean)

    : CLUSTER_TABLES;

  return { confirm, tables: tables.filter((t) => CLUSTER_TABLES.includes(t)) };

}



async function copyTable(primary, replica, table) {

  console.log(`\n🔄 Copiando ${table}...`);

  const rows = await fetchAllRows(primary, table);

  console.log(`  📊 ${rows.length} linhas no primary`);



  console.log(`  🗑️ Limpando réplica...`);

  const deleted = await deleteAllRows(replica, table);

  console.log(`  🗑️ ${deleted} linha(s) removida(s) na réplica`);



  let inserted = 0;

  if (rows.length > 0) {

    for (let i = 0; i < rows.length; i += PAGE_SIZE) {

      const batch = rows.slice(i, i + PAGE_SIZE);

      const { error } = await replica.from(table).insert(batch);

      if (error) throw new Error(`${table} insert lote ${i / PAGE_SIZE + 1}: ${error.message}`);

      inserted += batch.length;

      process.stdout.write(`\r  📤 ${table}: ${inserted}/${rows.length} inseridas...`);

    }

    process.stdout.write('\n');

  }



  console.log(`  ✅ ${table}: ${inserted} linhas copiadas`);

  return inserted;

}



async function main() {

  const { confirm, tables } = parseArgs(process.argv.slice(2));



  if (!confirm) {

    console.log('⚠️  Este script APAGA dados na RÉPLICA e recopia do PRIMARY.');

    console.log('    Tabelas:', CLUSTER_TABLES.join(', '));

    console.log('    Para executar: npm run cluster:copy-data -- --confirm');

    process.exit(1);

  }



  const primaryCfg = getPrimaryConfig();

  const replicaCfg = getReplicaConfig();



  if (!primaryCfg.url || !replicaCfg.url) {

    console.error('❌ Configure SUPABASE_URL e SUPABASE_REPLICA_URL no backend/.env');

    process.exit(1);

  }



  if (primaryCfg.url === replicaCfg.url) {

    console.error('❌ PRIMARY e REPLICA apontam para a mesma URL. Abortado.');

    process.exit(1);

  }



  console.log('📦 Fase 0 — Cópia de dados Primary → Réplica');

  console.log(`   Primary: ${maskUrl(primaryCfg.url)}`);

  console.log(`   Réplica: ${maskUrl(replicaCfg.url)}`);

  console.log(`   Tabelas: ${tables.join(', ')}`);



  const primary = createClusterClient(primaryCfg);

  const replica = createClusterClient(replicaCfg);



  for (const table of tables) {

    await copyTable(primary, replica, table);

  }



  console.log('\n✅ Cópia concluída. Rode: npm run cluster:verify');

}



main().catch((err) => {

  console.error('❌ Erro:', err.message);

  process.exit(1);

});

