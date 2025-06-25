#frontend
FROM node:24.2.0-bullseye

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN mkdir -p dist

RUN npm run build

CMD ["echo", "Frontend build complete"]
