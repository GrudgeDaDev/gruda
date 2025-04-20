# Use the official node image as a parent image
FROM node:16-alpine

# Set the working directory
WORKDIR /app

# Copy package.json files to the container
COPY package*.json ./

# Install dependencies
RUN npm install

# If grunt-init is needed for project build
RUN npm install -g grunt-init

# Copy the rest of your app's source code
COPY . .

# Build the application
RUN npm run build

# Command to run your application
CMD ["npm", "start"]
