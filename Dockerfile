FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source
COPY . .

# Build TS
RUN npm run build

# Start the server
CMD ["npm", "start"]
