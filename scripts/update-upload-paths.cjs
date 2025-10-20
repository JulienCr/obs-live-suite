/**
 * Update database URLs from /uploads/* to /data/uploads/*
 */
const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');

function getDataDir() {
  const platform = os.platform();
  const homedir = os.homedir();
  
  switch (platform) {
    case 'win32':
      return path.join(process.env.APPDATA || path.join(homedir, 'AppData', 'Roaming'), 'obs-live-suite');
    case 'darwin':
      return path.join(homedir, 'Library', 'Application Support', 'obs-live-suite');
    case 'linux':
    default:
      return path.join(homedir, '.config', 'obs-live-suite');
  }
}

function updateDatabasePaths() {
  console.log('🔄 Updating database upload paths...\n');

  const dataDir = getDataDir();
  const dbPath = path.join(dataDir, 'data.db');

  console.log(`Database: ${dbPath}\n`);

  // Open database
  const db = new Database(dbPath);

  try {
    // Update guests avatarUrl
    const guestsResult = db.prepare(`
      UPDATE guests 
      SET avatarUrl = '/data' || avatarUrl 
      WHERE avatarUrl IS NOT NULL 
        AND avatarUrl LIKE '/uploads/%'
    `).run();

    console.log(`✅ Updated ${guestsResult.changes} guest avatar URLs`);

    // Update posters fileUrl
    const postersResult = db.prepare(`
      UPDATE posters 
      SET fileUrl = '/data' || fileUrl 
      WHERE fileUrl LIKE '/uploads/%'
    `).run();

    console.log(`✅ Updated ${postersResult.changes} poster file URLs`);

    // Show some examples
    console.log('\n📋 Sample guest records:');
    const guests = db.prepare('SELECT id, displayName, avatarUrl FROM guests WHERE avatarUrl IS NOT NULL LIMIT 3').all();
    guests.forEach(g => {
      console.log(`   ${g.displayName}: ${g.avatarUrl}`);
    });

    console.log('\n📋 Sample poster records:');
    const posters = db.prepare('SELECT id, title, fileUrl FROM posters LIMIT 3').all();
    posters.forEach(p => {
      console.log(`   ${p.title}: ${p.fileUrl}`);
    });

    console.log('\n✨ Database update complete!\n');

  } catch (error) {
    console.error('❌ Database update failed:', error);
    throw error;
  } finally {
    db.close();
  }
}

// Run update
try {
  updateDatabasePaths();
} catch (error) {
  console.error('❌ Failed:', error);
  process.exit(1);
}

