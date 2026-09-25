import { pool } from './connection.js';

export async function cleanDemoData() {
  const offers = await pool.query(
    'SELECT COUNT(*)::int AS total FROM convocatorias.job_offers WHERE es_demo = true'
  );
  const total = offers.rows[0]?.total ?? 0;

  const deleted = await pool.query(
    'DELETE FROM convocatorias.job_offers WHERE es_demo = true'
  );
  const matches = await pool.query(
    'DELETE FROM convocatorias.match_results WHERE offer_id NOT IN (SELECT id FROM convocatorias.job_offers)'
  );

  console.log(`[clean-demo] ofertas demo encontradas: ${total}`);
  console.log(`[clean-demo] ofertas eliminadas: ${deleted.rowCount}`);
  console.log(`[clean-demo] matches huérfanos eliminados: ${matches.rowCount}`);

  const remaining = await pool.query(
    'SELECT COUNT(*)::int AS ofertas, ' +
      '(SELECT COUNT(*)::int FROM convocatorias.match_results) AS matches ' +
      'FROM convocatorias.job_offers'
  );
  const { ofertas, matches: matchCount } = remaining.rows[0];
  console.log(`[clean-demo] quedan ${ofertas} ofertas y ${matchCount} matches`);
  return { total, ofertas, matches: matchCount };
}

if (process.argv[1] && import.meta.url.endsWith(import.meta.url.split('/').pop())) {
  cleanDemoData()
    .then(() => pool.end())
    .catch((err) => {
      console.error('[clean-demo] fallo:', err.message);
      process.exit(1);
    });
}