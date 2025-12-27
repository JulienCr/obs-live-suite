#!/usr/bin/env node

/**
 * Functional test script for Wikipedia + Ollama integration
 * Tests real API calls to verify the complete workflow
 * 
 * Usage: node scripts/test-wikipedia-functional.js
 */

const API_BASE = "http://localhost:3000";

async function testWikipediaAPI() {
  console.log("🧪 Wikipedia + Ollama Functional Tests\n");

  // Test 1: Simple Wikipedia query
  console.log("Test 1: Simple Wikipedia query (lion)");
  try {
    const response = await fetch(`${API_BASE}/api/wikipedia/summarize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: "lion" }),
    });

    const data = await response.json();
    
    if (data.success) {
      console.log("  ✅ Success!");
      console.log(`  - Title: ${data.data.title}`);
      console.log(`  - Lines: ${data.data.summary.length}`);
      console.log(`  - Source: ${data.data.source}`);
      console.log(`  - Summary:\n${data.data.summary.map((line, i) => `    ${i + 1}. ${line}`).join("\n")}`);
      
      // Validate constraints
      if (data.data.summary.length > 5) {
        console.log("  ⚠️  WARNING: More than 5 lines returned!");
      }
      
      for (const line of data.data.summary) {
        if (line.length > 90) {
          console.log(`  ⚠️  WARNING: Line exceeds 90 chars: ${line.length} chars`);
        }
      }
    } else {
      console.log(`  ❌ Failed: ${data.error}`);
    }
  } catch (error) {
    console.log(`  ❌ Error: ${error.message}`);
  }

  console.log("\n---\n");

  // Test 2: Relational query (Wikidata fallback)
  console.log("Test 2: Relational query (capitale du Kenya)");
  try {
    const response = await fetch(`${API_BASE}/api/wikipedia/summarize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: "capitale du Kenya" }),
    });

    const data = await response.json();
    
    if (data.success) {
      console.log("  ✅ Success!");
      console.log(`  - Resolved to: ${data.data.title}`);
      console.log(`  - Source: ${data.data.source}`);
      console.log(`  - Summary:\n${data.data.summary.map((line, i) => `    ${i + 1}. ${line}`).join("\n")}`);
      
      if (data.data.source !== "wikidata" && data.data.source !== "cache") {
        console.log("  ⚠️  WARNING: Expected Wikidata source for relational query");
      }
    } else {
      console.log(`  ❌ Failed: ${data.error}`);
    }
  } catch (error) {
    console.log(`  ❌ Error: ${error.message}`);
  }

  console.log("\n---\n");

  // Test 3: Cache hit
  console.log("Test 3: Cache hit (query 'lion' again)");
  try {
    const response = await fetch(`${API_BASE}/api/wikipedia/summarize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: "lion" }),
    });

    const data = await response.json();
    
    if (data.success) {
      console.log("  ✅ Success!");
      console.log(`  - Cached: ${data.data.cached}`);
      console.log(`  - Source: ${data.data.source}`);
      
      if (!data.data.cached && data.data.source !== "cache") {
        console.log("  ⚠️  WARNING: Expected cache hit");
      } else {
        console.log("  ✅ Cache working correctly!");
      }
    } else {
      console.log(`  ❌ Failed: ${data.error}`);
    }
  } catch (error) {
    console.log(`  ❌ Error: ${error.message}`);
  }

  console.log("\n---\n");

  // Test 4: Invalid query
  console.log("Test 4: Invalid query (empty string)");
  try {
    const response = await fetch(`${API_BASE}/api/wikipedia/summarize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: "" }),
    });

    const data = await response.json();
    
    if (!data.success && data.code === "INVALID_INPUT") {
      console.log("  ✅ Correctly rejected invalid input");
    } else {
      console.log("  ❌ Should have rejected empty query");
    }
  } catch (error) {
    console.log(`  ❌ Error: ${error.message}`);
  }

  console.log("\n---\n");

  // Test 5: Non-existent page
  console.log("Test 5: Non-existent page");
  try {
    const response = await fetch(`${API_BASE}/api/wikipedia/summarize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: "xyznonexistentpage9999" }),
    });

    const data = await response.json();
    
    if (!data.success && data.code === "NOT_FOUND") {
      console.log("  ✅ Correctly returned NOT_FOUND");
    } else {
      console.log("  ❌ Should have returned NOT_FOUND error");
    }
  } catch (error) {
    console.log(`  ❌ Error: ${error.message}`);
  }

  console.log("\n---\n");

  // Test 6: Ollama connection test
  console.log("Test 6: Ollama connection test");
  try {
    const response = await fetch(`${API_BASE}/api/ollama/test`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    const data = await response.json();
    
    if (data.success) {
      console.log("  ✅ Ollama connected!");
      console.log(`  - URL: ${data.config.url}`);
      console.log(`  - Model: ${data.config.model}`);
      console.log(`  - Context: ${data.config.num_ctx}`);
    } else {
      console.log(`  ❌ Ollama connection failed: ${data.error}`);
      console.log("  Make sure Ollama is running: ollama serve");
    }
  } catch (error) {
    console.log(`  ❌ Error: ${error.message}`);
  }

  console.log("\n✅ Functional tests completed!\n");
}

// Run tests
testWikipediaAPI().catch(console.error);


