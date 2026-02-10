FROM node:20-slim

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --production=false

COPY tsconfig.json ./
COPY src/ ./src/

RUN npx tsc

RUN npm prune --production

ENV PORT=8080
ENV HOST=0.0.0.0

EXPOSE 8080

CMD ["node", "dist/index.js"]
