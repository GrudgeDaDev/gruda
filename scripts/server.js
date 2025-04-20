require('dotenv').config();
const express = require('express');
const Parse = require('parse/node');
const cors = require('cors');
const axios = require('axios');

// Validate environment variables
const requiredEnvVars = [
  'PARSE_APP_ID',
  'PARSE_JAVASCRIPT_KEY',
  'PARSE_SERVER_URL',
  'DISCORD_CLIENT_ID',
  'DISCORD_CLIENT_SECRET',
  'DISCORD_REDIRECT_URI',
  'DISCORD_WEBHOOK_URL',
  'SEPOLIA_RPC_URL',
  'GRUDA_CONTRACT_ADDRESS',
  'PORT'
];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  console.error(`Missing environment variables: ${missingVars.join(', ')}`);
  process.exit(1);
}

// Initialize Parse
Parse.initialize(process.env.PARSE_APP_ID, process.env.PARSE_JAVASCRIPT_KEY);
Parse.serverURL = process.env.PARSE_SERVER_URL;

// Initialize Express
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files from dist/
app.use(express.static('dist'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Grudge Codex server is running' });
});

// User login endpoint (Parse usernam
