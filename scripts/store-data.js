const fs = require('fs');
const path = require('path');
const Parse = require('parse/node');

Parse.initialize(
  process.env.PARSE_APP_ID,
  process.env.PARSE_JAVASCRIPT_KEY,
  process.env.PARSE_CLIENT_KEY
);
Parse.serverURL = process.env.PARSE_SERVER_URL;

async function storeData() {
  const dataDir = path.join(__dirname, 'data');
  const dataFiles = fs.readdirSync(dataDir).filter(file => file.endsWith('.json'));

  for (const file of dataFiles) {
    const filePath = path.join(dataDir, file);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    for (const className in data) {
      const ClassObject = Parse.Object.extend(className);
      const objects = data[className].map(item => new ClassObject(item));

      try {
        await Parse.Object.saveAll(objects);
        console.log(`Data from ${file} stored successfully.`);
      } catch (error) {
        console.error(`Failed to store data from ${file}:`, error);
      }
    }
  }

  console.log('All data has been stored successfully.');
}

storeData();
