import { chromium } from 'playwright';

/**
 * Functional test for dashboard UI controls
 * Verifies that dashboard buttons trigger overlays
 */

const DASHBOARD_URL = 'http://localhost:3000/dashboard';
const OVERLAY_URL = 'http://localhost:3000/overlays/lower-third';

async function testDashboardUI() {
  console.log('🧪 Starting dashboard UI functional test...\n');
  
  let browser;
  let passed = 0;
  let failed = 0;
  
  try {
    // Launch browser
    console.log('1️⃣  Launching browser...');
    browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    
    // Open dashboard in one tab
    const dashboardPage = await context.newPage();
    dashboardPage.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`   [Dashboard Error] ${msg.text()}`);
      }
    });
    
    console.log('2️⃣  Opening dashboard...');
    await dashboardPage.goto(DASHBOARD_URL);
    await dashboardPage.waitForLoadState('networkidle');
    
    // Open overlay in another tab
    const overlayPage = await context.newPage();
    console.log('3️⃣  Opening overlay page...');
    await overlayPage.goto(OVERLAY_URL);
    await overlayPage.waitForLoadState('networkidle');
    await overlayPage.waitForTimeout(2000); // Wait for WebSocket
    
    // Reload to get latest compiled code
    console.log('   Reloading overlay to get latest code...');
    await overlayPage.reload();
    await overlayPage.waitForLoadState('networkidle');
    await overlayPage.waitForTimeout(2000); // Wait for WebSocket reconnection
    
    // Go back to dashboard
    await dashboardPage.bringToFront();
    
    // Fill in lower third form
    console.log('4️⃣  Filling lower third form...');
    await dashboardPage.fill('#title', 'Dashboard Test');
    await dashboardPage.fill('#subtitle', 'UI Trigger Test');
    
    // Click show button
    console.log('5️⃣  Clicking Show button...');
    await dashboardPage.click('button:has-text("Show")');
    await dashboardPage.waitForTimeout(1000);
    
    // Switch to overlay tab to verify
    await overlayPage.bringToFront();
    await overlayPage.waitForTimeout(500);
    
    // Check if lower third appeared
    console.log('6️⃣  Verifying lower third appears...');
    const lowerThird = overlayPage.locator('.lower-third');
    const isVisible = await lowerThird.count();
    
    if (isVisible > 0) {
      console.log('   ✓ Lower third appeared');
      passed++;
      
      const title = await overlayPage.locator('.lower-third-title').textContent();
      if (title === 'Dashboard Test') {
        console.log(`   ✓ Title correct: "${title}"`);
        passed++;
      } else {
        console.log(`   ✗ Title incorrect: expected "Dashboard Test", got "${title}"`);
        failed++;
      }
      
      const subtitle = await overlayPage.locator('.lower-third-subtitle').textContent();
      if (subtitle === 'UI Trigger Test') {
        console.log(`   ✓ Subtitle correct: "${subtitle}"`);
        passed++;
      } else {
        console.log(`   ✗ Subtitle incorrect: expected "UI Trigger Test", got "${subtitle}"`);
        failed++;
      }
    } else {
      console.log('   ✗ Lower third did not appear');
      failed++;
    }
    
    // Take screenshots
    console.log('7️⃣  Taking screenshots...');
    await dashboardPage.screenshot({ path: 'dashboard-test.png' });
    await overlayPage.screenshot({ path: 'overlay-from-dashboard.png' });
    console.log('   ✓ Screenshots saved');
    
    // Test hide button
    console.log('8️⃣  Testing hide button...');
    await dashboardPage.bringToFront();
    await dashboardPage.click('button:has-text("Hide")');
    await overlayPage.bringToFront();
    await overlayPage.waitForTimeout(1500); // Wait for 500ms animation + buffer
    
    const isHidden = await lowerThird.count();
    if (isHidden === 0) {
      console.log('   ✓ Lower third hidden');
      passed++;
    } else {
      console.log('   ✗ Lower third should be hidden');
      failed++;
    }
    
    console.log('\n⏳ Keeping browser open for 3 seconds...');
    await overlayPage.waitForTimeout(3000);
    
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

// Run the test
await testDashboardUI();

