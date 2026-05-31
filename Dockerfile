
FROM node:20-alpine AS builder

WORKDIR /app


COPY package*.json ./
RUN npm install


COPY . .

ENV DATABASE_URL="postgresql://fake:fake@localhost:5432/fake"

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


EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main/index.js"]