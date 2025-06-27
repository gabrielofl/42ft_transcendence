#frontend
FROM node:24.2.0-bullseye

WORKDIR /app

COPY package*.json ./

RUN npm install

CMD ["npm", "run", "dev"]