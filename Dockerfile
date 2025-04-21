# Stage 1: Build the application
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /cloud

# Copy package.json and package-lock.json for reproducible builds
COPY package.json package-lock.json* ./

# Install all dependencies (including devDependencies for Grunt)
RUN npm ci

# Copy source files
COPY . .

# Run Grunt build to generate dist/
RUN npm run build

# Stage 2: Production image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json for production dependencies
COPY package.json package-lock.json* ./

# Install production dependencies only
RUN npm ci --production

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist
COPY server.js ./
COPY cloud/main.js ./cloud/
COPY test-back4app.js ./

# Set environment variable for production
ENV NODE_ENV=production

# Required environment variables (set via deployment platform or .env)
# PARSE_APP_ID: Back4App application ID
# PARSE_JAVASCRIPT_KEY: Back4App JavaScript key
# PARSE_SERVER_URL: Back4App server URL (e.g., https://parseapi.back4app.com/)
# DISCORD_CLIENT_ID: Discord OAuth client ID
# DISCORD_CLIENT_SECRET: Discord OAuth client secret
# DISCORD_REDIRECT_URI: Discord OAuth redirect URI
# DISCORD_WEBHOOK_URL: Discord webhook for notifications
# DISCORD_GBUX_WEBHOOK_URL: Discord webhook for GBuX events
# SEPOLIA_RPC_URL: Sepolia testnet RPC URL
# GRUDA_CONTRACT_ADDRESS: Deployed GRUDA contract address
# PORT: Server port (default: 3000)

# Expose port for Express server
EXPOSE 3000

# Command to run the Express server
CMD ["node", "server.js"]
