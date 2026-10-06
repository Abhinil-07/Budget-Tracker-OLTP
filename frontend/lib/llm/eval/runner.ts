import { parseSplits } from "../registry";
import { validateSplits } from "../../splits/validation";
import fixtures from "./fixtures.json";

async function runEval() {
  const provider = process.env.LLM_PROVIDER || "mock";
  const model = process.env.LLM_MODEL || (provider === "mock" ? "mock-model" : "default");

  console.log(`\n======================================================`);
  console.log(`🤖 Starting LLM Eval Suite`);
  console.log(`Provider: ${provider.toUpperCase()}`);
  console.log(`Model:    ${model}`);
  console.log(`Fixtures: ${fixtures.length} test cases`);
  console.log(`======================================================\n`);

  let passed = 0;
  let failed = 0;

  for (const fixture of fixtures) {
    process.stdout.write(`• Testing: "${fixture.name}" [${fixture.text}] ... `);
    const startTime = Date.now();

    try {
      const execution = await parseSplits(
        {
          text: fixture.text,
          context: {
            total_paise: fixture.total_paise,
            merchant: fixture.merchant,
            people: fixture.people,
          },
        },
        { provider, model }
      );

      const elapsed = Date.now() - startTime;

      // 1. Validate with server-side validation rules
      const validation = validateSplits(
        execution.result.splits,
        fixture.total_paise,
        fixture.people
      );

      if (!validation.isValid) {
        console.log(`❌ FAILED (Validation Error: ${validation.reason}) [${elapsed}ms]`);
        console.log(`   Clarification prompt: "${validation.clarificationPrompt}"`);
        failed++;
        continue;
      }

      // 2. Check if splits match expected amounts
      let match = true;
      for (const exp of fixture.expected) {
        const found = validation.splits.find(
          (s) => s.person_name.toLowerCase() === exp.person_name.toLowerCase()
        );
        if (!found || found.amount_paise !== exp.amount_paise) {
          match = false;
          break;
        }
      }

      if (match) {
        console.log(`✅ PASSED (${validation.summaryText}) [${elapsed}ms]`);
        passed++;
      } else {
        console.log(`⚠️ MISMATCH [${elapsed}ms]`);
        console.log(`   Expected:`, JSON.stringify(fixture.expected));
        console.log(`   Received:`, JSON.stringify(validation.splits));
        failed++;
      }
    } catch (err: any) {
      console.log(`❌ ERROR: ${err?.message || err}`);
      failed++;
    }
  }

  console.log(`\n======================================================`);
  console.log(`Results: ${passed} passed, ${failed} failed (${fixtures.length} total)`);
  console.log(`======================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runEval().catch((err) => {
  console.error("Eval runner fatal error:", err);
  process.exit(1);
});
