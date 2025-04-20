require('dotenv').config();
const Parse = require('parse/node');

Parse.initialize(
  process.env.PARSE_APP_ID,
  process.env.PARSE_JAVASCRIPT_KEY,
  process.env.PARSE_CLIENT_KEY
);
Parse.serverURL = process.env.PARSE_SERVER_URL;

async function testDatabase() {
  const TestObject = Parse.Object.extend('TestObject');
  const testObject = new TestObject();
  testObject.set('foo', 'bar');
  try {
    const result = await testObject.save();
    console.log('Parse object saved:', result);
  } catch (error) {
    console.error('Error while saving Parse object:', error);
  }
}

testDatabase();
