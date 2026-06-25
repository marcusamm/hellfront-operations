FROM node:22-alpine

WORKDIR /app

# Install only prod deps. node:sqlite is built-in, no native build step needed.
COPY package.json package-lock.json* ./
RUN npm install --omit=dev --no-audit --no-fund

COPY . .

# Drop privileges: run as the built-in non-root `node` user.
# /data is a mounted volume for the SQLite file.
RUN mkdir -p /data && chown -R node:node /app /data
USER node

EXPOSE 8080

# --no-deprecation keeps logs clean; --disable-proto=delete hardens prototype.
CMD ["node", "--disable-proto=delete", "server.js"]
