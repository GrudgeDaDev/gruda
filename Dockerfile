FROM node:16-alpine

WORKDIR /app

COPY package.json . 
RUN npm install

COPY cloud/main.js ./cloud/ 
COPY test-back4app.js . 
COPY .env .

# Add a new stage to install AI Assistant dependencies
RUN npm install openai

# Add a new command to run the AI Assistant script
COPY ai-assistant.js . 
RUN node ai-assistant.js

ENV NODE_ENV=production

# Update the CMD to run the AI Assistant script
CMD ["node", "ai-assistant.js"]
