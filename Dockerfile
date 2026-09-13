FROM node:24-slim

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --ignore-scripts

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Add environment variable for Gyazo access token
ENV GYAZO_ACCESS_TOKEN=dummy_token

CMD ["node", "build/index.js"]
