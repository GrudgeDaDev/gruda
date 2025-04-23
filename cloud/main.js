Parse.initialize(
  process.env.PARSE_APP_ID,
  process.env.PARSE_JAVASCRIPT_KEY,
  process.env.PARSE_CLIENT_KEY,
  process.env.PARSE_MASTER_KEY,
  process.env.PARSE_REST_KEY,
  process.env.PARSE_DOTNET_KEY
);
Parse.serverURL = process.env.PARSE_SERVER_URL;

Parse.Cloud.define("joinPvPLobby", async (request) => {
    const playerId = request.user.id;
    const query = new Parse.Query("GameLobby");

    // Search for an open lobby with available slots
    query.equalTo("status", "waiting");
    query.limit(1);
    const lobby = await query.first();

    if (lobby) {
        lobby.add("players", playerId);
        if (lobby.get("players").length === 2) {
            lobby.set("status", "active");
            // Assign server here
            const serverQuery = new Parse.Query("GameServer");
            serverQuery.equalTo("status", "available");
            serverQuery.equalTo("serverType", "heads-up");
            const server = await serverQuery.first();
            if (server) {
                server.set("status", "busy");
                await server.save();
            }
        }
        await lobby.save();
        return { message: "Joined an existing lobby", lobbyId: lobby.id };
    } else {
        // Create a new lobby
        const newLobby = new Parse.Object("GameLobby");
        newLobby.set("players", [playerId]);
        newLobby.set("status", "waiting");
        await newLobby.save();
        return { message: "Created a new lobby", lobbyId: newLobby.id };
    }
});

Parse.Cloud.define("enterGameServer", async (request) => {
    const playerId = request.user.id;
    const query = new Parse.Query("GameServer");

    // Search for an available server
    query.equalTo("status", "available");
    query.equalTo("serverType", "heads-up"); // or "island" for island games
    const server = await query.first();

    if (server) {
        server.set("status", "busy");
        await server.save();
        return { message: "Assigned to server", serverId: server.get("serverId") };
    } else {
        throw `No available servers at this time. Please wait or try joining an island game.`;
    }
});

Parse.Cloud.define("getSeason0Data", async (request) => {
    const query = new Parse.Query("Cards");
    query.equalTo("season", "Season0");
    try {
        const results = await query.find();
        return results;
    } catch (error) {
        throw new Parse.Error(Parse.Error.SCRIPT_FAILED, "Failed to fetch Season0 data");
    }
});
