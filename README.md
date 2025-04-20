# Grudge Studio Launcher

Backend for grudgeplatform.com, powering PvP games, Discord integration, Gruda chain, and GBuX currency.

## Setup

1. Clone: `git clone https://github.com/GrudgeDaDev/gruda.git`
2. Install: `npm install parse dotenv`
3. Configure: Copy `.env.example` to `.env`, add keys (see Environment Variables).
4. Test Database: Run `node test-back4app.js` (see Test Script).
5. Deploy Cloud Code: Upload `cloud/main.js` in Back4app (see Cloud Code).

## Environment Variables

The following environment variables are required and should be added to the `.env` file:

- `PARSE_APP_ID`
- `PARSE_CLIENT_KEY`
- `PARSE_JAVASCRIPT_KEY`
- `PARSE_SERVER_URL`
- `PARSE_WEBHOOK_KEY`
- `DISCORD_CLIENT_ID`
- `DISCORD_CLIENT_SECRET`
- `DISCORD_GUILD_ID`
- `DISCORD_WEBHOOK_URL`
- `DISCORD_GBUX_WEBHOOK_URL`
- `DISCORD_REDIRECT_URI`

## Test Script

The test script `test-back4app.js` uses `dotenv` to load environment variables and `parse` to connect to the Parse server.

## Cloud Code

The cloud code in `cloud/main.js` implements the following features:

- Parse SDK for web pages like `/launcher`, `/card-minter`.
- Discord webhooks for notifications.
- Future NFT/GBuX integration.
- New Parse Cloud function to fetch data for Season0.

## Usage

- Web: Use Parse SDK for pages like `/launcher`, `/card-minter`.
- Discord: Webhooks for notifications.
- Gruda: Future NFT/GBuX integration.

## Seasons

- Season0: Explore the events and stories of Season0.

## Contact

[grudgeplatform.com/contact](https://grudgeplatform.com/contact)
