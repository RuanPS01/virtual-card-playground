# Imagem do servidor de tempo real (server/). O cliente continua estático,
# publicado no GitHub Pages pelo workflow de deploy.
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY tsconfig.server.json ./
COPY shared ./shared
COPY server ./server
RUN npm run build:server

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=8787
# O pacote gerado pelo esbuild já inclui o "ws": a imagem final não precisa de node_modules.
COPY --from=build /app/dist-server/index.cjs ./index.cjs
USER node
EXPOSE 8787
CMD ["node", "index.cjs"]
