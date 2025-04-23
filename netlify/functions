const { Parse, initializeParse } = require('./utils/parseConfig');
const fetch = require('node-fetch');

initializeParse();

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body || '{}');
    const { code, redirectUri, username, password, isSignup, isGuest } = body;

    if (code && redirectUri) {
      // Handle Discord OAuth code exchange
      const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: process.env.DISCORD_CLIENT_ID,
          client_secret: process.env.DISCORD_CLIENT_SECRET,
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
          scope: 'identify guilds guilds.join gdm.join',
        }),
      });

      const tokenData = await tokenResponse.json();
      if (!tokenResponse.ok || tokenData.error) {
        throw new Error(tokenData.error_description || 'Failed to exchange code');
      }

      // Fetch user info
      const userResponse = await fetch('https://discord.com/api/users/@me', {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      });
      const userData = await userResponse.json();
      if (!userResponse.ok || userData.error) {
        throw new Error(userData.error || 'Failed to fetch user info');
      }

      // Derive username and avatar
      const discordId = userData.id;
      const discordUsername = userData.username || `discord_${discordId}`;
      const avatarUrl = userData.avatar
        ? `https://cdn.discordapp.com/avatars/${discordId}/${userData.avatar}.png`
        : '';

      // Check if user exists in Parse
      const userQuery = new Parse.Query(Parse.User);
      userQuery.equalTo('discordId', discordId);
      let user = await userQuery.first({ useMasterKey: true });

      if (!user) {
        // Sign up new user
        user = new Parse.User();
        user.set('username', discordUsername);
        user.set('password', generateUUID()); // Random password for Discord users
        user.set('email', userData.email || `${discordUsername}@gruda.grudgewarlords.com`);
        user.set('discordId', discordId);
        user.set('avatar', avatarUrl);
        await user.signUp();
      } else {
        // Log in existing user
        user = await Parse.User.logIn(user.get('username'), user.get('password'));
        // Update avatar if changed
        if (user.get('avatar') !== avatarUrl) {
          user.set('avatar', avatarUrl);
          await user.save(null, { useMasterKey: true });
        }
      }

      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          user: user.toJSON(),
          sessionToken: user.getSessionToken(),
        }),
      };
    } else if (username && password && (isSignup || isGuest)) {
      // Handle guest or manual signup
      const user = new Parse.User();
      user.set('username', username);
      user.set('password', password);
      user.set('email', `${username}@gruda.grudgewarlords.com`);
      if (isGuest) {
        user.set('isGuest', true);
        user.set('avatar', '');
      }
      await user.signUp();
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          user: user.toJSON(),
          sessionToken: user.getSessionToken(),
        }),
      };
    } else {
      // Handle manual login
      const user = await Parse.User.logIn(username, password);
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          user: user.toJSON(),
          sessionToken: user.getSessionToken(),
        }),
      };
    }
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message || 'Authentication failed',
      }),
    };
  }
};

// UUID generator for random passwords
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
