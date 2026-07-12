FROM node:20-alpine

WORKDIR /app

# Install backend dependencies first (better layer caching)
COPY backend/package*.json backend/
RUN cd backend && npm install --omit=dev

# Copy the rest of the project (server.js statically serves index.html / auth.html / admin/ / public.html from repo root)
COPY . .

EXPOSE 5000

CMD ["node", "backend/server.js"]
