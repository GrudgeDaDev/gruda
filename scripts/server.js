javascript
require('dotenv').config();
const express = require('express');
const Parse = require('parse/node');
const cors = require('cors');
const axios = require('axios');
const session = require('express-session');

// Validate environment variables
const requiredEnvVars = [
  'PARSE_APP_ID',
  'PARSE_JAVASCRIPT_KEY',
  'PARSE_SERVER_URL',
  'DISCORD_CLIENT_ID',
  'DISCORD_CLIENT_SECRET',
  'DISCORD_REDIRECT_URI',
  'DISCORD_WEBHOOK_URL',
  'DISCORD_GBUX_WEBHOOK_URL',
  'SEPOLIA_RPC_URL',
  'GRUDA_CONTRACT_ADDRESS',
  'PORT',
  'SESSION_SECRET'
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
app.use(cors({ origin: 'https://www.grudgeplatform.com/login', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware for tracking players
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production', maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// Serve static frontend files from dist/
app.use(express.static('dist'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Grudge Codex server is running' });
});

// User login endpoint (Parse username/password)
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    const user = await Parse.User.logIn(username, password);
    req.session.userId = user.id;
    req.session.sessionToken = user.getSessionToken();

    // Log user activity
    const activity = new Parse.Object('UserActivity');
    activity.set('userId', user.id);
    activity.set('username', user.get('username'));
    activity.set('action', 'login');
    activity.set('method', 'parse');
    activity.set('timestamp', new Date());
    await activity.save(null, { useMasterKey: true });

    // Send Discord notification
    await axios.post(process.env.DISCORD_WEBHOOK_URL, {
      content: `${user.get('username')} logged in via username/password`
    });

    // Redirect to card-minter.html with session token
    res.redirect(`/card-minter.html?sessionToken=${user.getSessionToken()}`);
  } catch (error) {
    res.status(401).json({ error: `Login failed: ${error.message}` });
  }
});

// Discord OAuth login endpoint
app.get('/api/auth/discord', (req, res) => {
  const authUrl = `https://discord.com/api/oauth2/authorize?client_id=${process.env.DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(process.env.DISCORD_REDIRECT_URI)}&response_type=code&scope=identify`;
  res.redirect(authUrl);
});

// Discord OAuth callback
app.get('/api/auth/discord/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) {
    return res.status(400).json({ error: 'Authorization code is required' });
  }

  try {
    // Exchange code for access token
    const tokenResponse = await axios.post('https://discord.com/api/oauth2/token', new URLSearchParams({
      client_id: process.env.DISCORD_CLIENT_ID,
      client_secret: process.env.DISCORD_CLIENT_SECRET,
      grant_type: 'authorization_code',
      code,
      redirect_uri: process.env.DISCORD_REDIRECT_URI
    }), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const { access_token } = tokenResponse.data;

    // Get Discord user info
    const userResponse = await axios.get('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${access_token}` }
    });
    const discordUser = userResponse.data;

    // Find or create Parse user
    const query = new Parse.Query(Parse.User);
    query.equalTo('discordId', discordUser.id);
    let user = await query.first({ useMasterKey: true });

    if (!user) {
      user = new Parse.User();
      user.set('username', discordUser.username);
      user.set('discordId', discordUser.id);
      user.set('email', discordUser.email || `${discordUser.id}@grudgeplatform.com`);
      user.set('password', Math.random().toString(36).slice(-8)); // Random password
      user.set('gbuxBalance', 100); // Initial GBuX
      await user.signUp();
    } else {
      await Parse.User.logIn(user.get('username'), user.get('password'));
    }

    req.session.userId = user.id;
    req.session.sessionToken = user.getSessionToken();

    // Log user activity
    const activity = new Parse.Object('UserActivity');
    activity.set('userId', user.id);
    activity.set('username', user.get('username'));
    activity.set('action', 'login');
    activity.set('method', 'discord');
    activity.set('timestamp', new Date());
    await activity.save(null, { useMasterKey: true });

    // Send Discord notification
    await axios.post(process.env.DISCORD_WEBHOOK_URL, {
      content: `${user.get('username')} logged in via Discord`
    });

    // Redirect to card-minter.html with session token
    res.redirect(`/card-minter.html?sessionToken=${user.getSessionToken()}`);
  } catch (error) {
    console.error('Discord OAuth error:', error.message);
    res.status(500).json({ error: `Discord login failed: ${error.message}` });
  }
});

// Get current user session
app.get('/api/user', async (req, res) => {
  if (!req.session.userId || !req.session.sessionToken) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const query = new Parse.Query(Parse.User);
    query.equalTo('objectId', req.session.userId);
    const user = await query.first({ sessionToken: req.session.sessionToken });
    if (!user) {
      req.session.destroy();
      return res.status(401).json({ error: 'User not found' });
    }

    res.status(200).json({
      userId: user.id,
      username: user.get('username'),
      gbuxBalance: user.get('gbuxBalance') || 0,
      sessionToken: req.session.sessionToken
    });
  } catch (error) {
    res.status(500).json({ error: `Failed to fetch user: ${error.message}` });
  }
});

// Logout endpoint
app.post('/api/logout', (req, res) => {
  if (req.session.userId) {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to log out' });
      }
      res.status(200).json({ message: 'Logged out successfully' });
    });
  } else {
    res.status(400).json({ error: 'Not logged in' });
  }
});

// Proxy Parse cloud functions
app.post('/api/cloud/:functionName', async (req, res) => {
  const { functionName } = req.params;
  const { sessionToken, ...params } = req.body;

  if (!req.session.userId || req.session.sessionToken !== sessionToken) {
    return res.status(401).json({ error: 'Invalid or missing session token' });
  }

  try {
    const result = await Parse.Cloud.run(functionName, params, { sessionToken });
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: `Cloud function ${functionName} failed: ${error.message}` });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Grudge Codex server running on port ${PORT}`);
});
