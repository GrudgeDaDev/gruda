Parse.Cloud.define("authenticateUser", async (request) => {
  const { username, password, isSignup } = request.params;
  try {
    if (isSignup) {
      const user = new Parse.User();
      user.set("username", username);
      user.set("password", password);
      user.set("email", `${username}@example.com`);
      await user.signUp();
      return { success: true, user: user.toJSON(), sessionToken: user.getSessionToken() };
    } else {
      const user = await Parse.User.logIn(username, password);
      return { success: true, user: user.toJSON(), sessionToken: user.getSessionToken() };
    }
  } catch (error) {
    throw new Parse.Error(error.code || 101, error.message || "Authentication failed");
  }
});

Parse.Cloud.define("startGame", async (request) => {
  const { mode, userId, opponentId, gameId } = request.params;
  if (!request.user || request.user.id !== userId) {
    throw new Parse.Error(206, "Invalid session or user");
  }
  try {
    if (mode === "PVP") {
      const PVPMatch = Parse.Object.extend("PVPMatch");
      const match = new PVPMatch();
      match.set("player1Id", { __type: "Pointer", className: "_User", objectId: userId });
      if (opponentId) {
        match.set("player2Id", { __type: "Pointer", className: "_User", objectId: opponentId });
      }
      match.set("matchDate", new Date());
      match.set("duration", 0);
      if (gameId) {
        match.set("gameId", { __type: "Pointer", className: "Game", objectId: gameId });
      }
      await match.save(null, { useMasterKey: true });
      return { success: true, matchId: match.id, mode: "PVP" };
    } else if (mode === "PVE") {
      const GamePlayLog = Parse.Object.extend("GamePlayLog");
      const log = new GamePlayLog();
      log.set("userId", { __type: "Pointer", className: "_User", objectId: userId });
      log.set("gameId", { __type: "Pointer", className: "Game", objectId: gameId || "defaultGameId" });
      log.set("logDate", new Date());
      log.set("actions", []);
      await log.save(null, { useMasterKey: true });
      return { success: true, matchId: log.id, mode: "PVE" };
    } else {
      throw new Parse.Error(102, "Invalid game mode");
    }
  } catch (error) {
    throw new Parse.Error(error.code || 141, error.message || "Failed to start game");
  }
});

Parse.Cloud.define("endGame", async (request) => {
  const { mode, matchId, userId, winnerId, duration, actions, score, earnedCardId } = request.params;
  if (!request.user || request.user.id !== userId) {
    throw new Parse.Error(206, "Invalid session or user");
  }
  try {
    if (mode === "PVP") {
      const PVPMatch = Parse.Object.extend("PVPMatch");
      const matchQuery = new Parse.Query(PVPMatch);
      const match = await matchQuery.get(matchId, { useMasterKey: true });
      match.set("winnerId", { __type: "Pointer", className: "_User", objectId: winnerId });
      match.set("duration", duration);
      await match.save(null, { useMasterKey: true });
      if (score) {
        const Leaderboard = Parse.Object.extend("Leaderboard");
        const leaderboard = new Leaderboard();
        leaderboard.set("userId", { __type: "Pointer", className: "_User", objectId: userId });
        leaderboard.set("gameId", match.get("gameId") || { __type: "Pointer", className: "Game", objectId: "defaultGameId" });
        leaderboard.set("score", score);
        await leaderboard.save(null, { useMasterKey: true });
      }
    } else if (mode === "PVE") {
      const GamePlayLog = Parse.Object.extend("GamePlayLog");
      const logQuery = new Parse.Query(GamePlayLog);
      const log = await logQuery.get(matchId, { useMasterKey: true });
      log.set("actions", actions || log.get("actions"));
      await log.save(null, { useMasterKey: true });
      if (score) {
        const Leaderboard = Parse.Object.extend("Leaderboard");
        const leaderboard = new Leaderboard();
        leaderboard.set("userId", { __type: "Pointer", className: "_User", objectId: userId });
        leaderboard.set("gameId", log.get("gameId"));
        leaderboard.set("score", score);
        await leaderboard.save(null, { useMasterKey: true });
      }
    } else {
      throw new Parse.Error(102, "Invalid game mode");
    }
    if (earnedCardId) {
      const Ownership = Parse.Object.extend("Ownership");
      const ownership = new Ownership();
      ownership.set("userId", { __type: "Pointer", className: "_User", objectId: userId });
      ownership.set("cardId", { __type: "Pointer", className: "Card", objectId: earnedCardId });
      ownership.set("ownershipStatus", "owned");
      await ownership.save(null, { useMasterKey: true });
    }
    return { success: true, message: "Game ended and data updated" };
  } catch (error) {
    throw new Parse.Error(error.code || 141, error.message || "Failed to end game");
  }
});

Parse.Cloud.define("manageCards", async (request) => {
  const { action, userId, cardId, targetUserId } = request.params;
  if (!request.user || request.user.id !== userId) {
    throw new Parse.Error(206, "Invalid session or user");
  }
  try {
    if (action === "view") {
      const Ownership = Parse.Object.extend("Ownership");
      const query = new Parse.Query(Ownership);
      query.equalTo("userId", { __type: "Pointer", className: "_User", objectId: userId });
      query.include("cardId");
      const ownerships = await query.find({ useMasterKey: true });
      const cards = ownerships.map((o) => o.get("cardId").toJSON());
      return { success: true, cards };
    } else if (action === "create") {
      if (!request.master) {
        throw new Parse.Error(119, "Operation forbidden");
      }
      const Card = Parse.Object.extend("Card");
      const card = new Card();
      card.set("cardName", "New Card");
      card.set("tribe", "Default");
      card.set("rarity", "Common");
      card.set("atk", 1);
      card.set("hp", 1);
      card.set("cost", 1);
      card.set("description", "A new card");
      card.set("image", "default.png");
      await card.save(null, { useMasterKey: true });
      const Ownership = Parse.Object.extend("Ownership");
      const ownership = new Ownership();
      ownership.set("userId", { __type: "Pointer", className: "_User", objectId: userId });
      ownership.set("cardId", { __type: "Pointer", className: "Card", objectId: card.id });
      ownership.set("ownershipStatus", "owned");
      await ownership.save(null, { useMasterKey: true });
      return { success: true, card: card.toJSON() };
    } else if (action === "transfer") {
      const Ownership = Parse.Object.extend("Ownership");
      const query = new Parse.Query(Ownership);
      query.equalTo("userId", { __type: "Pointer", className: "_User", objectId: userId });
      query.equalTo("cardId", { __type: "Pointer", className: "Card", objectId: cardId });
      const ownership = await query.first({ useMasterKey: true });
      if (!ownership) {
        throw new Parse.Error(101, "Card not owned by user");
      }
      ownership.set("userId", { __type: "Pointer", className: "_User", objectId: targetUserId });
      await ownership.save(null, { useMasterKey: true });
      return { success: true, message: "Card transferred" };
    } else {
      throw new Parse.Error(102, "Invalid action");
    }
  } catch (error) {
    throw new Parse.Error(error.code || 141, error.message || "Failed to manage cards");
  }
});

Parse.Cloud.define("updateProfile", async (request) => {
  const { userId, discord, walletAddress } = request.params;
  if (!request.user || request.user.id !== userId) {
    throw new Parse.Error(206, "Invalid session or user");
  }
  try {
    const userQuery = new Parse.Query(Parse.User);
    const user = await userQuery.get(userId, { useMasterKey: true });
    if (discord) {
      user.set("discord", discord);
    }
    if (walletAddress) {
      user.set("wallet", walletAddress);
      const Wallet = Parse.Object.extend("Wallet");
      const walletQuery = new Parse.Query(Wallet);
      walletQuery.equalTo("userId", { __type: "Pointer", className: "_User", objectId: userId });
      let wallet = await walletQuery.first({ useMasterKey: true });
      if (!wallet) {
        wallet = new Wallet();
        wallet.set("userId", { __type: "Pointer", className: "_User", objectId: userId });
      }
      wallet.set("walletAddress", walletAddress);
      await wallet.save(null, { useMasterKey: true });
    }
    await user.save(null, { sessionToken: request.user.getSessionToken() });
    return { success: true, user: user.toJSON() };
  } catch (error) {
    throw new Parse.Error(error.code || 141, error.message || "Failed to update profile");
  }
});

Parse.Cloud.define("getLeaderboard", async (request) => {
  const { gameId, limit = 10 } = request.params;
  try {
    const Leaderboard = Parse.Object.extend("Leaderboard");
    const query = new Parse.Query(Leaderboard);
    if (gameId) {
      query.equalTo("gameId", { __type: "Pointer", className: "Game", objectId: gameId });
    }
    query.descending("score");
    query.limit(limit);
    query.include("userId");
    const results = await query.find({ useMasterKey: true });
    const leaderboard = results.map((entry) => ({
      user: entry.get("userId").toJSON(),
      score: entry.get("score"),
      gameId: entry.get("gameId")?.id
    }));
    return { success: true, leaderboard };
  } catch (error) {
    throw new Parse.Error(error.code || 141, error.message || "Failed to retrieve leaderboard");
  }
});
