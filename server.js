require('dotenv').config();
const express = require('express');
const Parse = require('parse/node');
const cors = require('cors');
const axios = require('axios');
const Web3 = require('web3');
const { createClient } = require('@supabase/supabase-js');

// Validate environment variables
const requiredEnvVars = [
  'PARSE_APP_ID',
  'PARSE_JAVASCRIPT_KEY',
  'PARSE_SERVER_URL',
  'DISCORD_CLIENT_ID',
  'DISCORD_CLIENT_SECRET',
  'DISCORD_REDIRECT_URI',
  'SEPOLIA_RPC_URL',
  'GRUDA_CONTRACT_ADDRESS',
  'GRUDA_CONTRACT_ABI',
  'ADMIN_PRIVATE_KEY',
  'PORT',
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_JWT_SECRET'
];
const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);
if (missingVars.length > 0) {
  console.error(`Missing environment variables: ${missingVars.join(', ')}`);
  process.exit(1);
}

// Initialize Parse
Parse.initialize(process.env.PARSE_APP_ID, process.env.PARSE_JAVASCRIPT_KEY);
Parse.serverURL = process.env.PARSE_SERVER_URL;

// Initialize Web3
const web3 = new Web3(process.env.SEPOLIA_RPC_URL);
const contractABI = JSON.parse(process.env.GRUDA_CONTRACT_ABI);
const contract = new web3.eth.Contract(contractABI, process.env.GRUDA_CONTRACT_ADDRESS);

// Initialize Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// Initialize Express
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files from dist/
app.use(express.static('dist'));

// Serve static files from public directory
app.use(express.static('public'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Grudge Codex server is running' });
});

// Utility: Generate UUID
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Password validation regex
const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/;

// Discord OAuth: Exchange code for access token
async function exchangeDiscordCode(code, redirectUri) {
  const response = await axios.post(
    'https://discord.com/api/oauth2/token',
    new URLSearchParams({
      client_id: process.env.DISCORD_CLIENT_ID,
      client_secret: process.env.DISCORD_CLIENT_SECRET,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      scope: 'identify guilds guilds.join gdm.join',
    }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );
  return response.data;
}

// Discord OAuth: Fetch user info
async function fetchDiscordUserInfo(accessToken) {
  const response = await axios.get('https://discord.com/api/users/@me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return response.data;
}

// Authenticate User (Discord or Local)
app.post('/api/auth', async (req, res) => {
  try {
    const { code, redirectUri, username, email, password, isSignup } = req.body;

    if (code && redirectUri) {
      // Discord OAuth
      const tokenData = await exchangeDiscordCode(code, redirectUri);
      const userData = await fetchDiscordUserInfo(tokenData.access_token);

      const discordId = userData.id;
      const discordUsername = userData.username || `discord_${discordId}`;
      const avatarUrl = userData.avatar
        ? `https://cdn.discordapp.com/avatars/${discordId}/${userData.avatar}.png`
        : '';

      const userQuery = new Parse.Query(Parse.User);
      userQuery.equalTo('discordId', discordId);
      let user = await userQuery.first({ useMasterKey: true });

      if (!user) {
        user = new Parse.User();
        user.set('username', discordUsername);
        user.set('password', generateUUID());
        user.set('email', userData.email || `${discordUsername}@gruda.grudgewarlords.com`);
        user.set('discordId', discordId);
        user.set('avatar', avatarUrl);
        await user.signUp();
      } else {
        user = await Parse.User.logIn(user.get('username'), user.get('password'));
        if (user.get('avatar') !== avatarUrl) {
          user.set('avatar', avatarUrl);
          await user.save(null, { useMasterKey: true });
        }
      }

      res.json({
        success: true,
        user: user.toJSON(),
        sessionToken: user.getSessionToken(),
      });
    } else if (username && email && password && isSignup) {
      // Local signup
      if (!passwordPattern.test(password)) {
        return res.status(400).json({
          success: false,
          error: 'Password must be 8+ characters, with uppercase, lowercase, number, and special character (!@#$%^&*)',
        });
      }
      const user = new Parse.User();
      user.set('username', username);
      user.set('email', email);
      user.set('password', password);
      await user.signUp();
      res.json({
        success: true,
        user: user.toJSON(),
        sessionToken: user.getSessionToken(),
      });
    } else if (username && password) {
      // Local login
      const user = await Parse.User.logIn(username, password);
      res.json({
        success: true,
        user: user.toJSON(),
        sessionToken: user.getSessionToken(),
      });
    } else {
      res.status(400).json({ success: false, error: 'Invalid request parameters' });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Authentication failed',
    });
  }
});

// Start Game (PVP or PVE)
app.post('/api/game/start', async (req, res) => {
  try {
    const { mode, userId, opponentId, gameId } = req.body;
    const sessionToken = req.headers['x-parse-session-token'];

    const userQuery = new Parse.Query(Parse.User);
    const user = await userQuery.get(userId, { sessionToken });
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid session or user' });
    }

    if (mode === 'PVP') {
      const PVPMatch = Parse.Object.extend('PVPMatch');
      const match = new PVPMatch();
      match.set('player1Id', { __type: 'Pointer', className: '_User', objectId: userId });
      if (opponentId) {
        match.set('player2Id', { __type: 'Pointer', className: '_User', objectId: opponentId });
      }
      match.set('matchDate', new Date());
      match.set('duration', 0);
      if (gameId) {
        match.set('gameId', { __type: 'Pointer', className: 'Game', objectId: gameId });
      }
      await match.save(null, { useMasterKey: true });
      res.json({ success: true, matchId: match.id, mode: 'PVP' });
    } else if (mode === 'PVE') {
      const GamePlayLog = Parse.Object.extend('GamePlayLog');
      const log = new GamePlayLog();
      log.set('userId', { __type: 'Pointer', className: '_User', objectId: userId });
      log.set('gameId', { __type: 'Pointer', className: 'Game', objectId: gameId || 'game1' });
      log.set('logDate', new Date());
      log.set('actions', []);
      await log.save(null, { useMasterKey: true });
      res.json({ success: true, matchId: log.id, mode: 'PVE' });
    } else {
      res.status(400).json({ success: false, error: 'Invalid game mode' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message || 'Failed to start game' });
  }
});

// End Game (PVP or PVE)
app.post('/api/game/end', async (req, res) => {
  try {
    const { mode, matchId, userId, winnerId, duration, actions, score, earnedCardId } = req.body;
    const sessionToken = req.headers['x-parse-session-token'];

    const userQuery = new Parse.Query(Parse.User);
    const user = await userQuery.get(userId, { sessionToken });
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid session or user' });
    }

    if (mode === 'PVP') {
      const PVPMatch = Parse.Object.extend('PVPMatch');
      const matchQuery = new Parse.Query(PVPMatch);
      const match = await matchQuery.get(matchId, { useMasterKey: true });
      match.set('winnerId', { __type: 'Pointer', className: '_User', objectId: winnerId });
      match.set('duration', duration);
      await match.save(null, { useMasterKey: true });

      if (score) {
        const Leaderboard = Parse.Object.extend('Leaderboard');
        const leaderboard = new Leaderboard();
        leaderboard.set('userId', { __type: 'Pointer', className: '_User', objectId: userId });
        leaderboard.set('gameId', match.get('gameId') || { __type: 'Pointer', className: 'Game', objectId: 'game1' });
        leaderboard.set('score', score);
        await leaderboard.save(null, { useMasterKey: true });
      }
    } else if (mode === 'PVE') {
      const GamePlayLog = Parse.Object.extend('GamePlayLog');
      const logQuery = new Parse.Query(GamePlayLog);
      const log = await logQuery.get(matchId, { useMasterKey: true });
      log.set('actions', actions || log.get('actions'));
      await log.save(null, { useMasterKey: true });

      if (score) {
        const Leaderboard = Parse.Object.extend('Leaderboard');
        const leaderboard = new Leaderboard();
        leaderboard.set('userId', { __type: 'Pointer', className: '_User', objectId: userId });
        leaderboard.set('gameId', log.get('gameId'));
        leaderboard.set('score', score);
        await leaderboard.save(null, { useMasterKey: true });
      }
    } else {
      return res.status(400).json({ success: false, error: 'Invalid game mode' });
    }

    if (earnedCardId) {
      const Ownership = Parse.Object.extend('Ownership');
      const ownership = new Ownership();
      ownership.set('userId', { __type: 'Pointer', className: '_User', objectId: userId });
      ownership.set('cardId', { __type: 'Pointer', className: 'Card', objectId: earnedCardId });
      ownership.set('ownershipStatus', 'owned');
      await ownership.save(null, { useMasterKey: true });
    }

    res.json({ success: true, message: 'Game ended and data updated' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message || 'Failed to end game' });
  }
});

// Manage Cards (View, Create, Transfer)
app.post('/api/cards', async (req, res) => {
  try {
    const { action, userId, cardId, targetUserId } = req.body;
    const sessionToken = req.headers['x-parse-session-token'];

    const userQuery = new Parse.Query(Parse.User);
    const user = await userQuery.get(userId, { sessionToken });
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid session or user' });
    }

    if (action === 'view') {
      const Ownership = Parse.Object.extend('Ownership');
      const query = new Parse.Query(Ownership);
      query.equalTo('userId', { __type: 'Pointer', className: '_User', objectId: userId });
      query.include('cardId');
      const ownerships = await query.find({ useMasterKey: true });
      const cards = ownerships.map((o) => o.get('cardId').toJSON());
      res.json({ success: true, cards });
    } else if (action === 'create') {
      const Card = Parse.Object.extend('Card');
      const card = new Card();
      card.set('cardName', 'New Card');
      card.set('tribe', 'Default');
      card.set('rarity', 'Common');
      card.set('atk', 1);
      card.set('hp', 1);
      card.set('cost', 1);
      card.set('description', 'A new card');
      card.set('image', 'default.png');
      await card.save(null, { useMasterKey: true });

      const Ownership = Parse.Object.extend('Ownership');
      const ownership = new Ownership();
      ownership.set('userId', { __type: 'Pointer', className: '_User', objectId: userId });
      ownership.set('cardId', { __type: 'Pointer', className: 'Card', objectId: card.id });
      ownership.set('ownershipStatus', 'owned');
      await ownership.save(null, { useMasterKey: true });

      res.json({ success: true, card: card.toJSON() });
    } else if (action === 'transfer') {
      const Ownership = Parse.Object.extend('Ownership');
      const query = new Parse.Query(Ownership);
      query.equalTo('userId', { __type: 'Pointer', className: '_User', objectId: userId });
      query.equalTo('cardId', { __type: 'Pointer', className: 'Card', objectId: cardId });
      const ownership = await query.first({ useMasterKey: true });

      if (!ownership) {
        return res.status(404).json({ success: false, error: 'Card not owned by user' });
      }

      ownership.set('userId', { __type: 'Pointer', className: '_User', objectId: targetUserId });
      await ownership.save(null, { useMasterKey: true });

      res.json({ success: true, message: 'Card transferred' });
    } else {
      res.status(400).json({ success: false, error: 'Invalid action' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message || 'Failed to manage cards' });
  }
});

// Mint Card (Blockchain)
app.post('/api/cards/mint', async (req, res) => {
  try {
    const { userId, cardId, gbuxCost = 10 } = req.body;
    const sessionToken = req.headers['x-parse-session-token'];

    const userQuery = new Parse.Query(Parse.User);
    const user = await userQuery.get(userId, { sessionToken });
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid session or user' });
    }

    const cardQuery = new Parse.Query('Card');
    const card = await cardQuery.get(cardId, { useMasterKey: true });
    if (!card) {
      return res.status(404).json({ success: false, error: 'Card not found' });
    }

    // Record ownership
    const Ownership = Parse.Object.extend('Ownership');
    const ownership = new Ownership();
    ownership.set('userId', { __type: 'Pointer', className: '_User', objectId: userId });
    ownership.set('cardId', { __type: 'Pointer', className: 'Card', objectId: cardId });
    ownership.set('ownershipStatus', 'owned');
    ownership.set('gbuxCost', gbuxCost);
    await ownership.save(null, { useMasterKey: true });

    // Update Season0MintTracker
    const MintTracker = Parse.Object.extend('Season0MintTracker');
    const query = new Parse.Query(MintTracker);
    const tracker = await query.first({ useMasterKey: true });
    if (tracker) {
      tracker.increment('totalMinted');
      await tracker.save(null, { useMasterKey: true });
    } else {
      const newTracker = new MintTracker();
      newTracker.set('totalMinted', 1);
      await newTracker.save(null, { useMasterKey: true });
    }

    // Mint on blockchain
    const account = web3.eth.accounts.privateKeyToAccount(process.env.ADMIN_PRIVATE_KEY);
    web3.eth.accounts.wallet.add(account);
    const tx = await contract.methods.mintCard(userId, cardId).send({
      from: account.address,
      gas: 200000,
    });

    res.json({ success: true, transaction: tx, ownership: ownership.toJSON() });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message || 'Failed to mint card' });
  }
});

// Update Profile
app.post('/api/profile', async (req, res) => {
  try {
    const { userId, discord, walletAddress } = req.body;
    const sessionToken = req.headers['x-parse-session-token'];

    const userQuery = new Parse.Query(Parse.User);
    const user = await userQuery.get(userId, { sessionToken });
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid session or user' });
    }

    if (discord) {
      user.set('discord', discord);
    }
    if (walletAddress) {
      user.set('wallet', walletAddress);
      const Wallet = Parse.Object.extend('Wallet');
      const walletQuery = new Parse.Query(Wallet);
      walletQuery.equalTo('userId', { __type: 'Pointer', className: '_User', objectId: userId });
      let wallet = await walletQuery.first({ useMasterKey: true });

      if (!wallet) {
        wallet = new Wallet();
        wallet.set('userId', { __type: 'Pointer', className: '_User', objectId: userId });
      }
      wallet.set('walletAddress', walletAddress);
      await wallet.save(null, { useMasterKey: true });
    }

    await user.save(null, { sessionToken });
    res.json({ success: true, user: user.toJSON() });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message || 'Failed to update profile' });
  }
});

// Get Leaderboard
app.post('/api/leaderboard', async (req, res) => {
  try {
    const { gameId, limit = 10 } = req.body;

    const Leaderboard = Parse.Object.extend('Leaderboard');
    const query = new Parse.Query(Leaderboard);
    if (gameId) {
      query.equalTo('gameId', { __type: 'Pointer', className: 'Game', objectId: gameId });
    }
    query.descending('score');
    query.limit(limit);
    query.include('userId');
    const results = await query.find({ useMasterKey: true });

    const leaderboard = results.map((entry) => ({
      user: entry.get('userId').toJSON(),
      score: entry.get('score'),
      gameId: entry.get('gameId')?.id,
    }));

    res.json({ success: true, leaderboard });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message || 'Failed to retrieve leaderboard' });
  }
});

// Manage Decks (Create, View, Update)
app.post('/api/decks', async (req, res) => {
  try {
    const { action, userId, deckId, deckName, cardIds } = req.body;
    const sessionToken = req.headers['x-parse-session-token'];

    const userQuery = new Parse.Query(Parse.User);
    const user = await userQuery.get(userId, { sessionToken });
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid session or user' });
    }

    const Deck = Parse.Object.extend('Deck');

    if (action === 'create') {
      const deck = new Deck();
      deck.set('userId', { __type: 'Pointer', className: '_User', objectId: userId });
      deck.set('deckName', deckName || 'New Deck');
      deck.set('cardIds', cardIds || []);
      await deck.save(null, { useMasterKey: true });
      res.json({ success: true, deck: deck.toJSON() });
    } else if (action === 'view') {
      const query = new Parse.Query(Deck);
      query.equalTo('userId', { __type: 'Pointer', className: '_User', objectId: userId });
      const decks = await query.find({ useMasterKey: true });
      res.json({ success: true, decks: decks.map((d) => d.toJSON()) });
    } else if (action === 'update') {
      const query = new Parse.Query(Deck);
      const deck = await query.get(deckId, { useMasterKey: true });
      if (deck.get('userId').id !== userId) {
        return res.status(403).json({ success: false, error: 'Unauthorized' });
      }
      if (deckName) deck.set('deckName', deckName);
      if (cardIds) deck.set('cardIds', cardIds);
      await deck.save(null, { useMasterKey: true });
      res.json({ success: true, deck: deck.toJSON() });
    } else {
      res.status(400).json({ success: false, error: 'Invalid action' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message || 'Failed to manage decks' });
  }
});

// Open Card Pack
app.post('/api/packs/open', async (req, res) => {
  try {
    const { userId, packId } = req.body;
    const sessionToken = req.headers['x-parse-session-token'];

    const userQuery = new Parse.Query(Parse.User);
    const user = await userQuery.get(userId, { sessionToken });
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid session or user' });
    }

    const Pack = Parse.Object.extend('Pack');
    const packQuery = new Parse.Query(Pack);
    const pack = await packQuery.get(packId, { useMasterKey: true });
    if (!pack) {
      return res.status(404).json({ success: false, error: 'Pack not found' });
    }

    // Simulate pack opening (random cards)
    const Card = Parse.Object.extend('Card');
    const cardQuery = new Parse.Query(Card);
    const cards = await cardQuery.limit(100).find({ useMasterKey: true });
    const randomCards = [];
    for (let i = 0; i < (pack.get('cardCount') || 5); i++) {
      const randomIndex = Math.floor(Math.random() * cards.length);
      randomCards.push(cards[randomIndex]);
    }

    // Record pack opening
    const PackOpening = Parse.Object.extend('PackOpening');
    const opening = new PackOpening();
    opening.set('userId', { __type: 'Pointer', className: '_User', objectId: userId });
    opening.set('packId', { __type: 'Pointer', className: 'Pack', objectId: packId });
    opening.set('cardIds', randomCards.map((c) => ({ __type: 'Pointer', className: 'Card', objectId: c.id })));
    opening.set('openingDate', new Date());
    await opening.save(null, { useMasterKey: true });

    // Award cards to user
    const Ownership = Parse.Object.extend('Ownership');
    for (const card of randomCards) {
      const ownership = new Ownership();
      ownership.set('userId', { __type: 'Pointer', className: '_User', objectId: userId });
      ownership.set('cardId', { __type: 'Pointer', className: 'Card', objectId: card.id });
      ownership.set('ownershipStatus', 'owned');
      ownership.set('gbuxCost', 0); // Free from pack
      await ownership.save(null, { useMasterKey: true });
    }

    res.json({
      success: true,
      opening: opening.toJSON(),
      cards: randomCards.map((c) => c.toJSON()),
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message || 'Failed to open pack' });
  }
});

// Get Available Packs
app.get('/api/packs', async (req, res) => {
  try {
    const Pack = Parse.Object.extend('Pack');
    const query = new Parse.Query(Pack);
    const packs = await query.find({ useMasterKey: true });
    res.json({ success: true, packs: packs.map((p) => p.toJSON()) });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message || 'Failed to retrieve packs' });
  }
});

// PvP Matchmaking: Join PvP Lobby
app.post('/api/pvp/join', async (req, res) => {
  try {
    const { userId } = req.body;
    const sessionToken = req.headers['x-parse-session-token'];

    const userQuery = new Parse.Query(Parse.User);
    const user = await userQuery.get(userId, { sessionToken });
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid session or user' });
    }

    const PvPLobby = Parse.Object.extend('PvPLobby');
    const query = new Parse.Query(PvPLobby);
    query.equalTo('status', 'waiting');
    const existingLobby = await query.first({ useMasterKey: true });

    if (existingLobby) {
      existingLobby.set('player2Id', { __type: 'Pointer', className: '_User', objectId: userId });
      existingLobby.set('status', 'active');
      await existingLobby.save(null, { useMasterKey: true });
      res.json({ success: true, message: 'Joined an existing lobby', lobbyId: existingLobby.id });
    } else {
      const newLobby = new PvPLobby();
      newLobby.set('player1Id', { __type: 'Pointer', className: '_User', objectId: userId });
      newLobby.set('status', 'waiting');
      await newLobby.save(null, { useMasterKey: true });
      res.json({ success: true, message: 'Created a new lobby', lobbyId: newLobby.id });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message || 'Failed to join PvP lobby' });
  }
});

// PvP Matchmaking: Enter Game Server
app.post('/api/pvp/enter', async (req, res) => {
  try {
    const { userId, lobbyId } = req.body;
    const sessionToken = req.headers['x-parse-session-token'];

    const userQuery = new Parse.Query(Parse.User);
    const user = await userQuery.get(userId, { sessionToken });
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid session or user' });
    }

    const PvPLobby = Parse.Object.extend('PvPLobby');
    const lobbyQuery = new Parse.Query(PvPLobby);
    const lobby = await lobbyQuery.get(lobbyId, { useMasterKey: true });
    if (!lobby) {
      return res.status(404).json({ success: false, error: 'Lobby not found' });
    }

    if (lobby.get('status') !== 'active') {
      return res.status(400).json({ success: false, error: 'Lobby is not active' });
    }

    const serverId = generateUUID();
    res.json({ success: true, serverId });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message || 'Failed to enter game server' });
  }
});

// Serve card-minter.html
app.get('/card-minter', (req, res) => {
  res.sendFile(__dirname + '/public/card-minter.html');
});

// Serve nexus.html
app.get('/nexus', (req, res) => {
  res.sendFile(__dirname + '/public/nexus.html');
});

// Serve season0.html
app.get('/season0', (req, res) => {
  res.sendFile(__dirname + '/public/season0.html');
});

// Serve index.html
app.get('/index', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
