FROM node:20-alpine
WORKDIR /app

# build tools needed by better-sqlite3
RUN apk add --no-cache python3 make g++ libc6-compat

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

EXPOSE 8080
CMD ["node", "server.js"]
