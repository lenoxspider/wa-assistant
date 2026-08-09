import { sanitizeLogData } from '../../src/utils/sanitizer';

function runUnitTests() {
  console.log('--- Phase 12.1: Running Unit Tests ---');

  // Test 1: Log Sanitization
  const testInput = {
    token: 'super-secret-jwt-token-12345',
    chatId: '123456789@s.whatsapp.net',
    body: 'Hello world'
  };
  const sanitized = sanitizeLogData(testInput);
  if (sanitized.token === '***REDACTED***') {
    console.log('✔ Log sanitization test passed');
  } else {
    throw new Error('Log sanitization test failed');
  }

  console.log('✔ All Unit Tests Passed Successfully!');
}

runUnitTests();
