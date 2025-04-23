const fetch = require("node-fetch");

const PARSE_APP_ID = process.env.PARSE_APP_ID;
const PARSE_REST_KEY = process.env.PARSE_REST_KEY;
const PARSE_SERVER_URL = process.env.PARSE_SERVER_URL;

// Helper function to create headers
function createHeaders(sessionToken = null) {
  const headers = {
    "X-Parse-Application-Id": PARSE_APP_ID,
    "X-Parse-REST-API-Key": PARSE_REST_KEY,
    "Content-Type": "application/json",
  };
  if (sessionToken) {
    headers["X-Parse-Session-Token"] = sessionToken;
  }
  return headers;
}

// User login function
exports.handler = async (event, context) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  const { action, payload } = JSON.parse(event.body);

  try {
    if (action === "login") {
      const response = await fetch(`${PARSE_SERVER_URL}/login`, {
        method: "POST",
        headers: createHeaders(),
        body: JSON.stringify(payload), // { username, password }
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Login failed");
      }

      return {
        statusCode: 200,
        body: JSON.stringify(result), // Includes sessionToken
      };
    }

    if (action === "createCard") {
      const response = await fetch(`${PARSE_SERVER_URL}/classes/Card`, {
        method: "POST",
        headers: createHeaders(payload.sessionToken),
        body: JSON.stringify(payload.cardData), // Card details
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Failed to create card");
      }

      return {
        statusCode: 201,
        body: JSON.stringify(result),
      };
    }

    // Add more actions (e.g., fetching cards, updating cards) as needed

    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Invalid action" }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
