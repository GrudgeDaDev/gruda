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

module.exports = {
  analyzeErrorLogs,
  suggestSolutions,
  createCorrectedDockerfile,
};
