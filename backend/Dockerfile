FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --omit=dev
COPY tsconfig.json ./
COPY src ./src
COPY scripts ./scripts
# tsx needed at runtime for start script
RUN npm install tsx typescript --omit=peer
ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080
CMD ["npx", "tsx", "src/index.ts"]
