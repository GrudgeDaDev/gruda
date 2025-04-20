require('dotenv').config();
const Parse = require('parse/node');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

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
  const { userId, metadata, imageBase64 } = request.params;

  // Save the image to the images directory
  const imageBuffer = Buffer.from(imageBase64, 'base64');
  const imagePath = path.join(__dirname, '..', 'images', `${userId}_${Date.now()}.png`);
  fs.writeFileSync(imagePath, imageBuffer);

  // Placeholder for NFT minting logic
  return `NFT minted for user ${userId} with metadata ${JSON.stringify(metadata)} and image saved at ${imagePath}`;
});

Parse.Cloud.define('transferGBuX', async (request) => {
  const { fromUserId, toUserId, amount } = request.params;
  // Placeholder for GBuX transfer logic
  return `Transferred ${amount} GBuX from ${fromUserId} to ${toUserId}`;
});

// New Parse Cloud function to fetch data for Season0
Parse.Cloud.define('getSeason0Data', async (request) => {
  const query = new Parse.Query('Season0Data');
  const results = await query.find();
  return results;
});

// Add logic to restrict available cards to only season0 cards unless minted by a player with GBuX
Parse.Cloud.define('getAvailableCards', async (request) => {
  const { userId } = request.params;
  const userQuery = new Parse.Query('User');
  userQuery.equalTo('objectId', userId);
  const user = await userQuery.first();

  if (!user) {
    throw new Error('User not found');
  }

  const cardQuery = new Parse.Query('Cards');
  cardQuery.equalTo('season', 'season0');
  const season0Cards = await cardQuery.find();

  const mintedCardQuery = new Parse.Query('MintedCards');
  mintedCardQuery.equalTo('userId', userId);
  const mintedCards = await mintedCardQuery.find();

  return [...season0Cards, ...mintedCards];
});
