import { chromium } from 'playwright';
import fetch from 'node-fetch';

/**
 * Functional test for lower third overlay
 * 1. Opens the overlay page in a browser
 * 2. Publishes a lower third message via API
 * 3. Verifies the text appears on the page
 */

const OVERLAY_URL = 'http://localhost:3000/overlays/lower-third';
const API_URL = 'http://localhost:3000/api/actions/lower/show';

async function testLowerThird() {
  console.log('🧪 Starting lower third functional test...\n');
  
  let browser;
  let passed = 0;
  let failed = 0;
  
  try {
    // Launch browser
    console.log('1️⃣  Launching browser...');
    browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Enable console logging
    page.on('console', msg => {
      console.log(`   [Browser Console] ${msg.text()}`);
    });
    
    // Navigate to overlay page
    console.log('2️⃣  Opening overlay page...');
    await page.goto(OVERLAY_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Wait for WebSocket connection
    
    // Check initial state - should be empty
    console.log('3️⃣  Checking initial state...');
    const initialVisible = await page.locator('.lower-third').count();
    if (initialVisible === 0) {
      console.log('   ✓ Initial state: No lower third visible');
      passed++;
    } else {
      console.log('   ✗ Initial state: Lower third should not be visible');
      failed++;
    }
    
    // Send lower third message
    console.log('4️⃣  Publishing lower third message...');
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Test Title',
        subtitle: 'Test Subtitle',
        side: 'left',
        duration: 15
      })
    });
    
    const result = await response.json();
    if (result.success) {
      console.log('   ✓ API call successful');
      passed++;
    } else {
      console.log('   ✗ API call failed:', result);
      failed++;
    }
    
    // Wait for lower third to appear
    console.log('5️⃣  Waiting for lower third to appear...');
    await page.waitForTimeout(1000); // Give it time to animate in
    
    // Check if lower third is visible
    const lowerThird = page.locator('.lower-third');
    const isVisible = await lowerThird.count();
    
    if (isVisible > 0) {
      console.log('   ✓ Lower third element appeared');
      passed++;
      
      // Check title
      const title = await page.locator('.lower-third-title').textContent();
      if (title === 'Test Title') {
        console.log(`   ✓ Title correct: "${title}"`);
        passed++;
      } else {
        console.log(`   ✗ Title incorrect: expected "Test Title", got "${title}"`);
        failed++;
      }
      
      // Check subtitle
      const subtitle = await page.locator('.lower-third-subtitle').textContent();
      if (subtitle === 'Test Subtitle') {
        console.log(`   ✓ Subtitle correct: "${subtitle}"`);
        passed++;
      } else {
        console.log(`   ✗ Subtitle incorrect: expected "Test Subtitle", got "${subtitle}"`);
        failed++;
      }
      
      // Take screenshot
      console.log('6️⃣  Taking screenshot...');
      await page.screenshot({ path: 'lower-third-test.png' });
      console.log('   ✓ Screenshot saved as lower-third-test.png');
      
      // Wait to see the result
      console.log('\n⏳ Keeping browser open for 5 seconds so you can see the result...');
      await page.waitForTimeout(5000);
      
    } else {
      console.log('   ✗ Lower third did not appear');
      failed++;
      
      // Debug: Check what's on the page
      const bodyText = await page.locator('body').textContent();
      console.log('   Debug - Page content:', bodyText);
      
      // Take screenshot for debugging
      await page.screenshot({ path: 'lower-third-test-failed.png' });
      console.log('   Screenshot saved as lower-third-test-failed.png');
    }
    
  } catch (error) {
    console.error('\n❌ Test error:', error);
    failed++;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
  
  // Results
  console.log('\n' + '='.repeat(50));
  console.log('📊 Test Results:');
  console.log(`   ✓ Passed: ${passed}`);
  console.log(`   ✗ Failed: ${failed}`);
  console.log('='.repeat(50));
  
  if (failed === 0) {
    console.log('\n🎉 All tests passed!');
    process.exit(0);
  } else {
    console.log('\n💥 Some tests failed!');
    process.exit(1);
  }
}

// Check if servers are running
async function checkServers() {
  try {
    const response = await fetch('http://localhost:3002/health');
    const health = await response.json();
    
    if (!health.wsRunning) {
      console.error('❌ WebSocket server is not running!');
      process.exit(1);
    }
    
    console.log('✓ Backend server is ready');
    console.log('✓ WebSocket server is running');
    console.log('');
    
    return true;
  } catch (error) {
    console.error('❌ Backend server is not running!');
    console.error('   Please start the dev server first: pnpm dev');
    process.exit(1);
  }
}

// Run the test
await checkServers();
await testLowerThird();

