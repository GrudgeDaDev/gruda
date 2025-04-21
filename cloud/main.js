// Cloud Function to join a lobby
Parse.Cloud.define("joinLobby", async (request) => {
    const user = request.user;
    if (!user) {
        throw "User must be logged in";
    }

    // Find an available lobby or create a new one
    const Lobby = Parse.Object.extend("GameLobby");
    const query = new Parse.Query(Lobby);
    query.equalTo("status", "waiting");
    query.ascending("createdAt");
    const lobby = await query.first();

    if (!lobby) {
        // Create a new lobby
        const newLobby = new Lobby();
        newLobby.set("status", "waiting");
        newLobby.set("maxPlayers", 2); // For 1v1 PvP
        newLobby.set("players", [user]);
        await newLobby.save();
        return { lobbyId: newLobby.id };
    } else {
        // Add player to existing lobby
        const players = lobby.get("players");
        if (players.length < lobby.get("maxPlayers")) {
            players.push(user);
            lobby.set("players", players);
            await lobby.save();

            // Check if lobby is full
            if (players.length === lobby.get("maxPlayers")) {
                // Start the game
                await Parse.Cloud.run("startGame", { lobbyId: lobby.id });
            }
            return { lobbyId: lobby.id };
        } else {
            throw "Lobby is full";
        }
    }
});

// Cloud Function to start the game
Parse.Cloud.define("startGame", async (request) => {
    const lobbyId = request.params.lobbyId;
    const Lobby = Parse.Object.extend("GameLobby");
    const lobby = await new Parse.Query(Lobby).get(lobbyId);

    if (lobby.get("status") !== "waiting") {
        return; // Game already started or invalid state
    }

    // Create a new Game object
    const Game = Parse.Object.extend("Game");
    const game = new Game();
    game.set("players", lobby.get("players"));
    game.set("currentTurn", 0); // Index of current player
    // Add other game state properties as needed
    await game.save();

    // Update lobby status
    lobby.set("status", "started");
    lobby.set("game", game);
    await lobby.save();

    // Optionally, use Live Queries to notify players
    // Clients should subscribe to changes in Game or Lobby classes

    return { gameId: game.id };
});
