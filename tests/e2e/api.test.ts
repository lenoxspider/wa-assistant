import db, { runMigrations } from '../../src/db/sqlite';
import { checkRules } from '../../src/pipeline/rules';

async function runE2ETests() {
  console.log('--- Phase 12.2 & 12.3: Integration & E2E Tests ---');
  runMigrations();

  // Test 1: SQLite Rules query
  const ruleCheck = checkRules('status@broadcast');
  if (!ruleCheck) {
    console.log('✔ Broadcast status filter rule test passed');
  } else {
    throw new Error('Broadcast status rule test failed');
  }

  // Test 2: Database task insertion
  db.prepare("INSERT INTO tasks (chatId, description, status) VALUES ('test_chat', 'Test Task', 'pending')").run();
  const tasks = db.prepare("SELECT * FROM tasks WHERE chatId = 'test_chat'").all() as any[];
  if (tasks.length > 0) {
    console.log('✔ Database task insertion E2E test passed');
  } else {
    throw new Error('Database task insertion failed');
  }

  console.log('✔ All Integration & E2E Tests Passed Successfully!');
}

runE2ETests().catch((err) => {
  console.error('E2E Test Suite Failed:', err);
  process.exit(1);
});
