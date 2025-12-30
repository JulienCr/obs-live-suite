#!/usr/bin/env node
/**
 * Script to migrate existing themes with freeTextMaxWidth
 */

const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');

// Database path
const dataDir = path.join(os.homedir(), 'Library', 'Application Support', 'obs-live-suite');
const dbPath = path.join(dataDir, 'data.db');

console.log('📊 Database path:', dbPath);

try {
  const db = new Database(dbPath);
  
  // Get all themes
  const themes = db.prepare('SELECT id, name, lowerThirdAnimation FROM themes').all();
  
  console.log(`\n✅ Found ${themes.length} theme(s)\n`);
  
  let updatedCount = 0;
  
  themes.forEach((theme) => {
    try {
      const animation = JSON.parse(theme.lowerThirdAnimation || '{}');
      
      console.log(`Theme: ${theme.name} (${theme.id})`);
      console.log('  Current animation:', JSON.stringify(animation, null, 2));
      
      if (!animation.styles?.freeTextMaxWidth) {
        console.log('  ⚠️  Missing freeTextMaxWidth - adding it...');
        
        if (!animation.styles) {
          animation.styles = {};
        }
        
        animation.styles.freeTextMaxWidth = { left: 65, right: 65, center: 90 };
        
        db.prepare('UPDATE themes SET lowerThirdAnimation = ? WHERE id = ?')
          .run(JSON.stringify(animation), theme.id);
        
        updatedCount++;
        console.log('  ✅ Updated!');
      } else {
        console.log('  ✓ Already has freeTextMaxWidth:', animation.styles.freeTextMaxWidth);
      }
      console.log('');
    } catch (error) {
      console.error(`  ❌ Error updating theme ${theme.name}:`, error.message);
    }
  });
  
  db.close();
  
  console.log(`\n🎉 Migration complete! Updated ${updatedCount} theme(s)\n`);
  
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}



