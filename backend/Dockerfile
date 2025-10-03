#backend
FROM node:24.2.0-bullseye

RUN apt-get update && apt-get upgrade -y && apt-get install -y net-tools && apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# RUN mkdir -p /app/data && chmod 755 /app/data

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Create directory for static files
RUN mkdir -p /app/static

# Run the server
CMD ["node", "src/index.js"]
# RUN chmod 755 /app && chmod 666 /app/pong.db 2>/dev/null || true
