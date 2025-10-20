/**
 * Helper script to list all guest and poster IDs for Stream Deck configuration
 * Usage: node scripts/list-streamdeck-ids.js
 */

const http = require('http');

const BASE_URL = 'http://localhost:3000';

function fetchJson(path) {
  return new Promise((resolve, reject) => {
    http.get(`${BASE_URL}${path}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (err) {
          reject(err);
        }
      });
    }).on('error', reject);
  });
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║        Stream Deck Configuration - ID Reference           ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    // Fetch guests
    console.log('📋 GUESTS\n');
    const guestsData = await fetchJson('/api/assets/guests');
    
    if (guestsData.guests && guestsData.guests.length > 0) {
      guestsData.guests.forEach((guest, index) => {
        console.log(`${index + 1}. ${guest.displayName}`);
        console.log(`   Subtitle: ${guest.subtitle || '(none)'}`);
        console.log(`   ID: ${guest.id}`);
        console.log(`   Stream Deck URL: POST http://localhost:3000/api/actions/lower/guest/${guest.id}`);
        console.log(`   Body: {"duration":8}\n`);
      });
    } else {
      console.log('   No guests found. Create guests in the Assets page first.\n');
    }

    // Fetch posters
    console.log('🖼️  POSTERS\n');
    const postersData = await fetchJson('/api/assets/posters');
    
    if (postersData.posters && postersData.posters.length > 0) {
      postersData.posters.forEach((poster, index) => {
        console.log(`${index + 1}. ${poster.title}`);
        console.log(`   File: ${poster.fileUrl}`);
        console.log(`   Type: ${poster.type}`);
        console.log(`   ID: ${poster.id}`);
        console.log(`   Stream Deck URL: POST http://localhost:3000/api/actions/poster/show/${poster.id}\n`);
      });
    } else {
      console.log('   No posters found. Upload posters in the Assets page first.\n');
    }

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║                    Quick Actions                           ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    console.log('Hide Lower Third: POST http://localhost:3000/api/actions/lower/hide');
    console.log('Hide Poster:      POST http://localhost:3000/api/actions/poster/hide');
    console.log('Next Poster:      POST http://localhost:3000/api/actions/poster/next');
    console.log('Previous Poster:  POST http://localhost:3000/api/actions/poster/previous');
    console.log('Start Countdown:  POST http://localhost:3000/api/actions/countdown/start');
    console.log('                  Body: {"seconds":300}\n');
    console.log('Full documentation: docs/STREAM-DECK-SETUP.md\n');

  } catch (error) {
    console.error('❌ Error fetching data:', error.message);
    console.error('\nMake sure the application is running:');
    console.error('  pnpm dev\n');
    process.exit(1);
  }
}

main();

