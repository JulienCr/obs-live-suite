/**
 * Migration script to move uploads from public/uploads to data directory
 */
const fs = require('fs');
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

function copyDirectory(source, destination) {
  // Create destination if it doesn't exist
  if (!fs.existsSync(destination)) {
    fs.mkdirSync(destination, { recursive: true });
  }

  // Read source directory
  const entries = fs.readdirSync(source, { withFileTypes: true });
  let copiedCount = 0;

  for (const entry of entries) {
    const sourcePath = path.join(source, entry.name);
    const destPath = path.join(destination, entry.name);

    if (entry.isDirectory()) {
      // Recursively copy subdirectories
      const subCopied = copyDirectory(sourcePath, destPath);
      copiedCount += subCopied;
    } else {
      // Copy file
      fs.copyFileSync(sourcePath, destPath);
      copiedCount++;
      console.log(`  Copied: ${entry.name}`);
    }
  }

  return copiedCount;
}

function migrateUploads() {
  console.log('🔄 Migrating uploads to data directory...\n');

  const projectRoot = path.join(__dirname, '..');
  const oldUploadsDir = path.join(projectRoot, 'public', 'uploads');
  const dataDir = getDataDir();
  const newUploadsDir = path.join(dataDir, 'uploads');

  console.log(`Source: ${oldUploadsDir}`);
  console.log(`Destination: ${newUploadsDir}\n`);

  // Check if old uploads directory exists
  if (!fs.existsSync(oldUploadsDir)) {
    console.log('❌ No uploads directory found in public/uploads');
    console.log('   Nothing to migrate.');
    return;
  }

  // Check subdirectories
  const subDirs = ['guests', 'posters'];
  let totalCopied = 0;

  for (const subDir of subDirs) {
    const sourcePath = path.join(oldUploadsDir, subDir);
    const destPath = path.join(newUploadsDir, subDir);

    if (fs.existsSync(sourcePath)) {
      console.log(`\n📁 Migrating ${subDir}...`);
      const copied = copyDirectory(sourcePath, destPath);
      totalCopied += copied;
      console.log(`   ✅ Copied ${copied} files`);
    } else {
      console.log(`\n📁 ${subDir}/ - No files to migrate`);
    }
  }

  console.log(`\n✨ Migration complete! Total files copied: ${totalCopied}`);
  console.log(`\n💡 Note: Old files in public/uploads/ are still there.`);
  console.log('   You can safely delete them after verifying everything works.\n');
}

// Run migration
try {
  migrateUploads();
} catch (error) {
  console.error('❌ Migration failed:', error);
  process.exit(1);
}

