#backend
FROM node:24.2.0-bullseye

RUN apt update && apt install -y net-tools

WORKDIR /app

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