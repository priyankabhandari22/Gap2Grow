const cron = require('node-cron');
const { syncMarketData } = require('./marketDataIngestionService');

let running = false;

async function runMarketSync(reason) {
  if (running) {
    console.log(`[job-market][cron] Skipping ${reason}; previous sync still running.`);
    return;
  }

  if (!process.env.ADZUNA_APP_ID || !process.env.ADZUNA_APP_KEY) {
    console.warn('[job-market][cron] Missing ADZUNA_APP_ID/ADZUNA_APP_KEY. Scheduler run skipped.');
    return;
  }

  running = true;
  try {
    const summary = await syncMarketData();
    console.log(
      `[job-market][cron] Sync completed (${reason}). ` +
      `Synced roles: ${summary.syncedRoles}/${summary.attemptedRoles}. ` +
      `Failures: ${summary.failures.length}.`
    );
  } catch (error) {
    console.error('[job-market][cron] Sync failed:', error.message);
  } finally {
    running = false;
  }
}

function startMarketDataSyncScheduler() {
  const cronExpr = process.env.MARKET_SYNC_CRON || '0 */12 * * *';
  const runOnStart = (process.env.MARKET_SYNC_RUN_ON_START || 'true').toLowerCase() === 'true';

  if (!cron.validate(cronExpr)) {
    console.error(`[job-market][cron] Invalid cron expression: ${cronExpr}`);
    return;
  }

  cron.schedule(cronExpr, () => {
    runMarketSync('scheduled-run');
  });

  console.log(`[job-market][cron] Scheduler started with expression: ${cronExpr}`);

  if (runOnStart) {
    runMarketSync('startup-run');
  }
}

module.exports = {
  startMarketDataSyncScheduler
};
