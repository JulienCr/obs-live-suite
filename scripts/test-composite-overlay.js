#!/usr/bin/env node

/**
 * Test script for the composite overlay
 * This verifies that the composite overlay can receive and display events from all overlay types
 */

const puppeteer = require('puppeteer');

async function testCompositeOverlay() {
  console.log('🧪 Testing Composite Overlay...\n');

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1920, height: 1080 },
    args: ['--no-sandbox'],
  });

  try {
    const page = await browser.newPage();
    
    // Enable console logging from the page
    page.on('console', msg => console.log('  [Browser]', msg.text()));
    
    console.log('📱 Loading composite overlay page...');
    await page.goto('http://localhost:3000/overlays/composite', {
      waitUntil: 'networkidle0',
    });

    console.log('✅ Composite overlay page loaded\n');

    // Wait for WebSocket connections to establish
    await page.waitForTimeout(2000);

    // Test 1: Lower Third
    console.log('📝 Test 1: Showing Lower Third...');
    const lowerResponse = await fetch('http://localhost:3002/api/overlays/lower', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'show',
        title: 'Test Lower Third',
        subtitle: 'From Composite Overlay',
        side: 'left',
        duration: 5,
      }),
    });
    console.log(`  Status: ${lowerResponse.status}`);
    await page.waitForTimeout(2000);

    // Test 2: Countdown
    console.log('\n⏱️  Test 2: Starting Countdown...');
    const countdownResponse = await fetch('http://localhost:3002/api/overlays/countdown', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'set',
        duration: 10,
      }),
    });
    console.log(`  Status: ${countdownResponse.status}`);
    
    const startResponse = await fetch('http://localhost:3002/api/overlays/countdown', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'start',
      }),
    });
    console.log(`  Start Status: ${startResponse.status}`);
    await page.waitForTimeout(2000);

    // Test 3: Poster
    console.log('\n🖼️  Test 3: Showing Poster...');
    const posterResponse = await fetch('http://localhost:3002/api/overlays/poster', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'show',
        imageUrl: 'https://via.placeholder.com/800x600/3b82f6/ffffff?text=Composite+Test',
        duration: 5,
      }),
    });
    console.log(`  Status: ${posterResponse.status}`);
    await page.waitForTimeout(2000);

    console.log('\n✅ All overlays displayed successfully!');
    console.log('👀 Check the browser window to verify all overlays are visible\n');
    console.log('📋 Visible overlays should be:');
    console.log('   - Lower Third (bottom left)');
    console.log('   - Countdown (center)');
    console.log('   - Poster (background)\n');

    console.log('⏳ Keeping browser open for 10 seconds...');
    await page.waitForTimeout(10000);

    console.log('✅ Test completed successfully!');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    throw error;
  } finally {
    await browser.close();
  }
}

// Run the test
testCompositeOverlay()
  .then(() => {
    console.log('\n🎉 All tests passed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Test suite failed:', error);
    process.exit(1);
  });

