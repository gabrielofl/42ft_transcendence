#frontend
FROM public.ecr.aws/docker/library/node:24.11.1-bullseye

WORKDIR /app

COPY package*.json ./

RUN npm install

CMD ["npm", "run", "dev"]