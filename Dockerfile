FROM node:16-alpine

WORKDIR /app

COPY package.json . 
RUN npm install

COPY cloud/main.js ./cloud/ 
COPY test-back4app.js . 
COPY .env.example .

ENV NODE_ENV=production

CMD ["node", "index.js"]
