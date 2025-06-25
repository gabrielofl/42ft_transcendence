#backend
FROM node:24.2.0-bullseye

RUN apt update && apt install -y net-tools

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

CMD ["node", "src/index.js"]
