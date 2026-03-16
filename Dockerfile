# Use the official Node.js image
# Stage 1: Build the application
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package.json and package-lock.json
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the application
COPY . .

# Build the Next.js app
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# Stage 2: Run the production application

FROM node:20-alpine AS runner
WORKDIR /app

# Ensure we have the production dependencies
COPY package.json package-lock.json ./
RUN npm install --omit=dev

# IMPORTANT: Manually add typescript if using next.config.ts
RUN npm install typescript

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./ 

EXPOSE 3000
CMD ["npm", "start"]