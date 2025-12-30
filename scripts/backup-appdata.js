import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, '..');
const appdataPath = path.join(projectRoot, '.appdata');
const backupsDir = path.join(projectRoot, 'backups');

// Create backups directory if it doesn't exist
if (!fs.existsSync(backupsDir)) {
  fs.mkdirSync(backupsDir, { recursive: true });
  console.log(`✓ Created backups directory: ${backupsDir}`);
}

// Check if .appdata exists
if (!fs.existsSync(appdataPath)) {
  console.error('✗ .appdata directory not found');
  process.exit(1);
}

// Create timestamp for backup filename
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
const backupFileName = `appdata-backup-${timestamp}.zip`;
const backupFilePath = path.join(backupsDir, backupFileName);

console.log(`Starting backup of .appdata...`);
console.log(`Source: ${appdataPath}`);
console.log(`Target: ${backupFilePath}`);

// Create write stream
const output = fs.createWriteStream(backupFilePath);
const archive = archiver('zip', {
  zlib: { level: 9 } // Maximum compression
});

// Track progress
let fileCount = 0;
let totalBytes = 0;

output.on('close', () => {
  const sizeInMB = (archive.pointer() / 1024 / 1024).toFixed(2);
  console.log(`\n✓ Backup completed successfully`);
  console.log(`  - Files: ${fileCount}`);
  console.log(`  - Size: ${sizeInMB} MB`);
  console.log(`  - Location: ${backupFilePath}`);
  
  // Clean up old backups (keep last 10)
  cleanupOldBackups();
});

output.on('error', (err) => {
  console.error('✗ Error writing backup file:', err);
  process.exit(1);
});

archive.on('error', (err) => {
  console.error('✗ Error creating archive:', err);
  process.exit(1);
});

archive.on('entry', (entry) => {
  fileCount++;
  totalBytes += entry.stats.size;
  if (fileCount % 10 === 0) {
    process.stdout.write(`\r  Processing: ${fileCount} files...`);
  }
});

// Pipe archive data to the file
archive.pipe(output);

// Add .appdata directory to archive
archive.directory(appdataPath, '.appdata');

// Finalize the archive
archive.finalize();

/**
 * Clean up old backups, keeping only the last N backups
 */
function cleanupOldBackups() {
  const keepCount = 10;
  
  try {
    const backupFiles = fs.readdirSync(backupsDir)
      .filter(file => file.startsWith('appdata-backup-') && file.endsWith('.zip'))
      .map(file => ({
        name: file,
        path: path.join(backupsDir, file),
        time: fs.statSync(path.join(backupsDir, file)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time); // Sort by time, newest first
    
    if (backupFiles.length > keepCount) {
      console.log(`\nCleaning up old backups (keeping ${keepCount} most recent)...`);
      
      const toDelete = backupFiles.slice(keepCount);
      toDelete.forEach(file => {
        fs.unlinkSync(file.path);
        console.log(`  - Deleted: ${file.name}`);
      });
      
      console.log(`✓ Cleanup complete`);
    }
  } catch (err) {
    console.error('Warning: Could not clean up old backups:', err.message);
  }
}
