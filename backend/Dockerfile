FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci

# Copy source code & TypeScript configuration
COPY tsconfig.json ./
COPY src ./src

# Generate Prisma Client & compile TypeScript
RUN npx prisma generate && npm run build

EXPOSE 5000

CMD ["sh", "-c", "npx prisma db push --accept-data-loss && node dist/server.js"]
