/**
 * Test script to generate mock poster data for performance testing
 * Run with: node scripts/test-poster-performance.cjs
 */

const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');

// Sample titles and tags for variety
const categories = ['Tech Conference', 'Product Launch', 'Interview', 'Tutorial', 'Demo', 'Webinar', 'Highlight', 'Recap', 'Behind the Scenes', 'Q&A Session'];
const adjectives = ['Amazing', 'Epic', 'Exclusive', 'Ultimate', 'Best', 'Top', 'Featured', 'Premium', 'Special', 'New'];
const subjects = ['AI', 'Cloud', 'DevOps', 'Design', 'Marketing', 'Sales', 'Strategy', 'Innovation', 'Security', 'Analytics'];

const allTags = [
  'tech', 'business', 'education', 'entertainment', 'news',
  'tutorial', 'demo', 'presentation', 'interview', 'conference',
  'webinar', 'product', 'feature', 'announcement', 'review',
  'showcase', 'highlight', 'recap', 'behind-the-scenes', 'live'
];

// Sample image URLs (placeholder service)
const imageUrls = [
  'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800',
  'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=800',
  'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800',
  'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800',
  'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=800',
  'https://images.unsplash.com/photo-1524508762098-fd966ffb6ef9?w=800',
  'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?w=800',
  'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800',
  'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800',
  'https://images.unsplash.com/photo-1556761175-b413da4baf72?w=800'
];

const videoUrls = [
  '/data/posters/sample-video-1.mp4',
  '/data/posters/sample-video-2.mp4',
  '/data/posters/sample-video-3.mp4'
];

const youtubeUrls = [
  'https://www.youtube.com/embed/dQw4w9WgXcQ',
  'https://www.youtube.com/embed/9bZkp7q19f0',
  'https://www.youtube.com/embed/jNQXAC9IVRw'
];

function generatePoster(index) {
  const category = categories[Math.floor(Math.random() * categories.length)];
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const subject = subjects[Math.floor(Math.random() * subjects.length)];
  
  const title = `${adjective} ${subject} ${category} ${index + 1}`;
  
  // Type distribution: 60% image, 30% video, 10% youtube
  const rand = Math.random();
  let type, fileUrl;
  if (rand < 0.6) {
    type = 'image';
    fileUrl = imageUrls[Math.floor(Math.random() * imageUrls.length)];
  } else if (rand < 0.9) {
    type = 'video';
    fileUrl = videoUrls[Math.floor(Math.random() * videoUrls.length)];
  } else {
    type = 'youtube';
    fileUrl = youtubeUrls[Math.floor(Math.random() * youtubeUrls.length)];
  }
  
  // Random 2-5 tags
  const tagCount = 2 + Math.floor(Math.random() * 4);
  const tags = [];
  const availableTags = [...allTags];
  for (let i = 0; i < tagCount && availableTags.length > 0; i++) {
    const idx = Math.floor(Math.random() * availableTags.length);
    tags.push(availableTags.splice(idx, 1)[0]);
  }
  
  // 75% enabled, 25% disabled
  const isEnabled = Math.random() > 0.25;
  
  return {
    id: randomUUID(),
    title: title,
    fileUrl: fileUrl,
    type: type,
    duration: type === 'video' ? Math.floor(30 + Math.random() * 300) : null,
    tags: tags,
    profileIds: [],
    metadata: {},
    isEnabled: isEnabled,
    createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString()
  };
}

async function generateMockData(count = 300) {
  console.log(`Generating ${count} mock posters...`);
  
  const posters = [];
  for (let i = 0; i < count; i++) {
    posters.push(generatePoster(i));
  }
  
  const enabledCount = posters.filter(p => p.isEnabled).length;
  const disabledCount = posters.filter(p => !p.isEnabled).length;
  
  const imageCount = posters.filter(p => p.type === 'image').length;
  const videoCount = posters.filter(p => p.type === 'video').length;
  const youtubeCount = posters.filter(p => p.type === 'youtube').length;
  
  console.log(`Generated: ${enabledCount} enabled, ${disabledCount} disabled`);
  console.log(`Types: ${imageCount} images, ${videoCount} videos, ${youtubeCount} youtube`);
  
  return posters;
}

async function insertIntoDatabase(posters) {
  const outputPath = path.join(__dirname, '../test-data-functional/mock-posters.json');
  fs.writeFileSync(outputPath, JSON.stringify(posters, null, 2));
  console.log(`\nMock data saved to: ${outputPath}`);
  console.log('\nTo import into database, you can use the DatabaseService:');
  console.log('  const db = DatabaseService.getInstance();');
  console.log('  posters.forEach(p => db.createPoster(p));');
}

// Generate and save mock data
generateMockData(300)
  .then(posters => insertIntoDatabase(posters))
  .then(() => console.log('\nDone!'))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });


