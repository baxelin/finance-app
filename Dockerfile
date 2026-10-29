# syntax=docker/dockerfile:1

FROM node:24-alpine AS client-build
WORKDIR /app/client
COPY client/package.json client/package-lock.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

FROM node:24-alpine AS server-deps
WORKDIR /app/server
COPY server/package.json server/package-lock.json ./
COPY server/prisma/schema.prisma ./prisma/schema.prisma
RUN npm ci --omit=dev
RUN npx prisma generate

FROM node:24-alpine AS runtime
ENV NODE_ENV=production \
    PORT=3001 \
    DATABASE_URL="file:../data/dev.db"
WORKDIR /app/server

RUN addgroup -S finapp && adduser -S finapp -G finapp

COPY --from=server-deps /app/server/node_modules ./node_modules
COPY server/package.json ./
COPY server/prisma ./prisma
COPY server/src ./src
COPY server/docker-entrypoint.sh ./docker-entrypoint.sh
COPY --from=client-build /app/client/dist ./public

RUN chmod +x ./docker-entrypoint.sh \
    && mkdir -p /app/server/data \
    && chown -R finapp:finapp /app/server

USER finapp

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3001)+'/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "src/index.js"]
