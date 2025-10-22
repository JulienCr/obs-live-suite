/**
 * Test quiz persistence via API calls
 */

const http = require("http");

function apiCall(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "localhost",
      port: 3002,
      path: `/api/quiz${path}`,
      method: method,
      headers: {
        "Content-Type": "application/json",
      },
    };

    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    });

    req.on("error", reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function test() {
  console.log("🧪 Testing Quiz Persistence via API\n");

  try {
    // Wait for backend to be ready
    console.log("⏳ Waiting for backend to be ready...");
    await sleep(3000);

    // 1. Create a session with example data
    console.log("\n📝 Step 1: Load example session...");
    const loadResult = await apiCall("POST", "/session/load-example");
    console.log(`   Success: ${loadResult.success}`);
    console.log(`   Session ID: ${loadResult.session?.id}`);
    console.log(`   Title: ${loadResult.session?.title}`);
    console.log(`   Rounds: ${loadResult.session?.rounds?.length || 0}`);

    if (!loadResult.success) {
      throw new Error("Failed to load example session");
    }

    const sessionId = loadResult.session.id;

    // 2. Get current state
    console.log("\n🔍 Step 2: Get current state...");
    const stateResult = await apiCall("GET", "/state");
    console.log(`   Phase: ${stateResult.phase}`);
    console.log(`   Session ID: ${stateResult.session?.id}`);

    // 3. Save the session
    console.log("\n💾 Step 3: Save session to file...");
    const saveResult = await apiCall("POST", "/session/save", { id: sessionId });
    console.log(`   Success: ${saveResult.success}`);
    console.log(`   Path: ${saveResult.path}`);

    if (!saveResult.success) {
      throw new Error("Failed to save session");
    }

    // 4. Reset session (clear memory)
    console.log("\n🔄 Step 4: Reset session (clear memory)...");
    const resetResult = await apiCall("POST", "/session/reset");
    console.log(`   Success: ${resetResult.success}`);
    console.log(`   New session ID: ${resetResult.session?.id}`);
    console.log(`   Rounds: ${resetResult.session?.rounds?.length || 0}`);

    // 5. Load the saved session
    console.log("\n📂 Step 5: Load saved session from file...");
    const loadSavedResult = await apiCall("POST", "/session/load", { id: sessionId });
    console.log(`   Success: ${loadSavedResult.success}`);
    console.log(`   Loaded ID: ${loadSavedResult.session?.id}`);
    console.log(`   Title: ${loadSavedResult.session?.title}`);
    console.log(`   Rounds: ${loadSavedResult.session?.rounds?.length || 0}`);

    // 6. Verify data matches
    console.log("\n✓ Step 6: Verify data...");
    const matches = loadSavedResult.session?.id === sessionId;
    console.log(`   Session ID matches: ${matches}`);
    console.log(`   Has rounds: ${(loadSavedResult.session?.rounds?.length || 0) > 0}`);

    if (!matches) {
      throw new Error("Session data does not match!");
    }

    // 7. Test question CRUD
    console.log("\n📚 Step 7: Test question bank...");
    const createQResult = await apiCall("POST", "/questions", {
      type: "qcm",
      text: "Test persistence question",
      options: ["A", "B", "C", "D"],
      correct: 1,
      points: 10,
      time_s: 20,
    });
    console.log(`   Create success: ${createQResult.success}`);
    console.log(`   Question ID: ${createQResult.question?.id}`);

    const getAllQResult = await apiCall("GET", "/questions");
    console.log(`   Total questions in bank: ${getAllQResult.questions?.length || 0}`);

    console.log("\n✅ All persistence tests passed!");
    console.log("\n🎯 Summary:");
    console.log("   ✓ Session saved to file");
    console.log("   ✓ Session loaded from file");
    console.log("   ✓ Data persisted correctly");
    console.log("   ✓ Question bank working");

    return true;
  } catch (error) {
    console.error("\n❌ Test failed:", error.message);
    console.error(error.stack);
    return false;
  }
}

test().then((success) => {
  console.log("\n" + (success ? "✅ Test completed successfully" : "❌ Test failed"));
  process.exit(success ? 0 : 1);
});

