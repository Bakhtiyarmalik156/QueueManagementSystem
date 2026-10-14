FROM node:20-alpine
WORKDIR /app
COPY package.json ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
RUN npm run install:all
COPY . .
RUN npm run build
RUN cd backend && npx prisma migrate deploy
EXPOSE 4000
CMD ["npm", "start"]