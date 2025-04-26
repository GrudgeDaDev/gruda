const fs = require('fs');
const path = require('path');
const { Configuration, OpenAIApi } = require('openai');

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

async function analyzeErrorLogs(errorLogs) {
  const response = await openai.createCompletion({
    model: 'text-davinci-003',
    prompt: `Analyze the following error logs and provide a summary:\n\n${errorLogs}`,
    max_tokens: 150,
  });
  return response.data.choices[0].text.trim();
}

async function suggestSolutions(errorLogs) {
  const response = await openai.createCompletion({
    model: 'text-davinci-003',
    prompt: `Analyze the following error logs and suggest possible solutions:\n\n${errorLogs}`,
    max_tokens: 150,
  });
  return response.data.choices[0].text.trim();
}

async function createCorrectedDockerfile(errorLogs) {
  const response = await openai.createCompletion({
    model: 'text-davinci-003',
    prompt: `Analyze the following error logs and create a corrected Dockerfile:\n\n${errorLogs}`,
    max_tokens: 300,
  });
  const correctedDockerfile = response.data.choices[0].text.trim();
  const filePath = path.join(__dirname, 'Dockerfile.corrected');
  fs.writeFileSync(filePath, correctedDockerfile);
  return filePath;
}

async function updateDatabaseConnectionSettings(newSettings) {
  const response = await openai.createCompletion({
    model: 'text-davinci-003',
    prompt: `Update the database connection settings with the following new settings:\n\n${JSON.stringify(newSettings)}`,
    max_tokens: 150,
  });
  return response.data.choices[0].text.trim();
}

async function generateCardDescription(cardDetails) {
  const response = await openai.createCompletion({
    model: 'text-davinci-003',
    prompt: `Generate a description for the following card details:\n\n${JSON.stringify(cardDetails)}`,
    max_tokens: 150,
  });
  return response.data.choices[0].text.trim();
}

async function generateCardName(cardDetails) {
  const response = await openai.createCompletion({
    model: 'text-davinci-003',
    prompt: `Generate a name for the following card details:\n\n${JSON.stringify(cardDetails)}`,
    max_tokens: 50,
  });
  return response.data.choices[0].text.trim();
}

async function integrateAIWithCardMinter(cardDetails) {
  const description = await generateCardDescription(cardDetails);
  const name = await generateCardName(cardDetails);
  return { name, description };
}

module.exports = {
  analyzeErrorLogs,
  suggestSolutions,
  createCorrectedDockerfile,
  updateDatabaseConnectionSettings,
  generateCardDescription,
  generateCardName,
  integrateAIWithCardMinter,
};
