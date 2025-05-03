# Use node:14 as the base image
FROM node:14

# Set the working directory to /app
WORKDIR /app

# Copy package*.json to the working directory
COPY package*.json ./

# Run npm install to install dependencies
RUN npm install

# Copy the rest of the application code to the working directory
COPY . .

# Expose port 3000
EXPOSE 3000

# Set the command to run the application using npm start
CMD ["npm", "start"]
