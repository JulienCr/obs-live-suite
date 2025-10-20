#!/usr/bin/env node
/**
 * Quick database browser script
 * Usage: node scripts/browse-db.cjs [table-name]
 */

const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');

// Resolve database path using same logic as PathManager
function getDbPath() {
  // Check for --prod flag
  if (process.argv.includes('--prod')) {
    // Use production path based on platform
    const platform = os.platform();
    if (platform === 'win32') {
      return path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), 'obs-live-suite', 'data.db');
    } else if (platform === 'darwin') {
      return path.join(os.homedir(), 'Library', 'Application Support', 'obs-live-suite', 'data.db');
    } else {
      return path.join(os.homedir(), '.config', 'obs-live-suite', 'data.db');
    }
  }
  
  const dbPath = process.env.DATABASE_PATH;
  if (dbPath) {
    // Resolve ~ to home directory if present
    if (dbPath.startsWith('~')) {
      return path.join(os.homedir(), dbPath.slice(1));
    }
    return dbPath;
  }
  
  // Fallback to DATA_DIR + data.db
  const dataDir = process.env.DATA_DIR;
  if (dataDir) {
    const resolvedDir = dataDir.startsWith('~') 
      ? path.join(os.homedir(), dataDir.slice(1))
      : dataDir;
    return path.join(resolvedDir, 'data.db');
  }
  
  // Default fallback (test database)
  return path.join(__dirname, '..', 'test-data-functional', 'data.db');
}

const dbPath = getDbPath();
console.log(`📍 Database location: ${dbPath}\n`);

const db = new Database(dbPath, { readonly: true });

// Get table name (skip --prod flag if present)
const args = process.argv.slice(2).filter(arg => arg !== '--prod');
const tableName = args[0];

if (!tableName) {
  // List all tables
  console.log('\n📊 Available tables:\n');
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
  tables.forEach(t => console.log(`  - ${t.name}`));
  console.log('\nUsage:');
  console.log('  node scripts/browse-db.cjs [--prod] [table-name]');
  console.log('\nOptions:');
  console.log('  --prod    Use production database (default: test database)');
  console.log('\nExamples:');
  console.log('  node scripts/browse-db.cjs guests');
  console.log('  node scripts/browse-db.cjs --prod guests\n');
} else {
  // Show table contents
  try {
    const rows = db.prepare(`SELECT * FROM ${tableName}`).all();
    console.log(`\n📋 ${tableName} (${rows.length} rows):\n`);
    console.table(rows);
  } catch (err) {
    console.error(`❌ Error: ${err.message}`);
  }
}

db.close();

