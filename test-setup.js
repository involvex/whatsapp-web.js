// Test environment setup
process.env.WWEBJS_TEST_REMOTE_ID = '1234567890@c.us';
process.env.WWEBJS_TEST_CLIENT_ID = 'test-client';
process.env.WWEBJS_TEST_MD = 'false';

console.log('Test environment variables set:');
console.log('WWEBJS_TEST_REMOTE_ID:', process.env.WWEBJS_TEST_REMOTE_ID);
console.log('WWEBJS_TEST_CLIENT_ID:', process.env.WWEBJS_TEST_CLIENT_ID);
console.log('WWEBJS_TEST_MD:', process.env.WWEBJS_TEST_MD);
