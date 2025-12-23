/**
 * Test script to generate mock guest data for performance testing
 * Run with: node scripts/test-guest-performance.js
 */

const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');

// Sample names and titles for variety
const firstNames = ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Emily', 'Robert', 'Lisa', 'James', 'Maria', 'William', 'Patricia', 'Richard', 'Jennifer', 'Joseph', 'Linda', 'Thomas', 'Elizabeth', 'Charles', 'Barbara'];
const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin'];
const titles = ['CEO', 'CTO', 'CFO', 'Designer', 'Developer', 'Manager', 'Director', 'VP of Sales', 'Product Manager', 'Engineer', 'Consultant', 'Analyst', 'Specialist', 'Coordinator', 'Architect'];
const companies = ['TechCorp', 'Innovation Ltd', 'Digital Solutions', 'NextGen Systems', 'Global Ventures', 'Future Tech', 'Creative Studios', 'Enterprise Solutions', 'Smart Systems', 'Tech Innovators'];

// Color palette for variety
const colors = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
  '#14b8a6', '#f43f5e', '#22c55e', '#eab308', '#a855f7'
];

function generateGuest(index) {
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  const title = titles[Math.floor(Math.random() * titles.length)];
  const company = companies[Math.floor(Math.random() * companies.length)];
  const color = colors[Math.floor(Math.random() * colors.length)];
  
  // 70% enabled, 30% disabled
  const isEnabled = Math.random() > 0.3;
  
  return {
    id: randomUUID(),
    displayName: `${firstName} ${lastName}`,
    subtitle: `${title}, ${company}`,
    accentColor: color,
    avatarUrl: null,
    isEnabled: isEnabled,
    createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString()
  };
}

async function generateMockData(count = 300) {
  console.log(`Generating ${count} mock guests...`);
  
  const guests = [];
  for (let i = 0; i < count; i++) {
    guests.push(generateGuest(i));
  }
  
  const enabledCount = guests.filter(g => g.isEnabled).length;
  const disabledCount = guests.filter(g => !g.isEnabled).length;
  
  console.log(`Generated: ${enabledCount} enabled, ${disabledCount} disabled`);
  
  return guests;
}

async function insertIntoDatabase(guests) {
  // This would need to connect to the actual database
  // For now, just save to a JSON file for manual import
  const outputPath = path.join(__dirname, '../test-data-functional/mock-guests.json');
  fs.writeFileSync(outputPath, JSON.stringify(guests, null, 2));
  console.log(`Mock data saved to: ${outputPath}`);
  console.log('\nTo import into database, you can use the DatabaseService:');
  console.log('  const db = DatabaseService.getInstance();');
  console.log('  guests.forEach(g => db.createGuest(g));');
}

// Generate and save mock data
generateMockData(300)
  .then(guests => insertIntoDatabase(guests))
  .then(() => console.log('\nDone!'))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });

