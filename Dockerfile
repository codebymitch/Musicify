FROM node:20-alpine

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy app source
COPY . .

# Start the bot
CMD ["npm", "start"]
