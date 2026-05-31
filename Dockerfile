
FROM node:20-alpine AS builder

WORKDIR /app


COPY package*.json ./
RUN npm install


COPY . .


RUN npx prisma generate


RUN npm run build



FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production


COPY package*.json ./
RUN npm install --omit=dev


COPY --from=builder /app/dist        ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY prisma ./prisma
COPY public ./public

# Expõe a porta (Railway usa a env PORT automaticamente)
EXPOSE 3000

# Roda migrações e inicia o servidor
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main/index.js"]