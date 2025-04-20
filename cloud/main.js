require('dotenv').config();
const Parse = require('parse/node');
const axios = require('axios');

Parse.initialize(
  process.env.PARSE_APP_ID,
  process.env.PARSE_JAVASCRIPT_KEY,
  process.env.PARSE_CLIENT_KEY
);
Parse.serverURL = process.env.PARSE_SERVER_URL;

// Parse SDK for web pages like /launcher, /card-minter
Parse.Cloud.define('getLauncherData', async (request) => {
  const query = new Parse.Query('LauncherData');
  const results = await query.find();
  return results;
});

Parse.Cloud.define('getCardMinterData', async (request) => {
  const query = new Parse.Query('CardMinterData');
  const results = await query.find();
  return results;
});

// Discord webhooks for notifications
Parse.Cloud.define('sendDiscordNotification', async (request) => {
  const { message } = request.params;
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  try {
    await axios.post(webhookUrl, { content: message });
    return 'Notification sent';
  } catch (error) {
    throw new Error('Failed to send notification');
  }
});

// Future NFT/GBuX integration
Parse.Cloud.define('mintNFT', async (request) => {
  const { userId, metadata } = request.params;
  // Placeholder for NFT minting logic
  return `NFT minted for user ${userId} with metadata ${JSON.stringify(metadata)}`;
});

Parse.Cloud.define('transferGBuX', async (request) => {
  const { fromUserId, toUserId, amount } = request.params;
  // Placeholder for GBuX transfer logic
  return `Transferred ${amount} GBuX from ${fromUserId} to ${toUserId}`;
});
