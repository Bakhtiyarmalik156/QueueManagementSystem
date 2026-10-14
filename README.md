# Queue Management System (QMS)

A complete, real-time Queue Management System with Kiosk ticketing, Staff counter dashboards, Public display screens, and an Admin analytics dashboard.

## Tech Stack
- **Backend:** Node.js, Express, Socket.IO, Prisma ORM, SQLite
- **Frontend:** React 18, Vite, React Router, socket.io-client, Axios
- **Real-time:** Socket.IO websockets broadcast across all views

## Features
- Kiosk ticket generation with ticket number, people ahead, estimated wait time, live status.
- Staff dashboard: Call Next, Recall, Complete, Skip/No-Show, Transfer Counter.
- Public display screen with currently serving tickets + recent calls + audio cue.
- Admin dashboard: metrics, manage services, counters, staff users.

## Prerequisites
- Node.js 18+
- npm

## Installation
```bash
# from project root
npm run install:all
```

## Environment
Copy backend env example (already created):
```bash
cd backend
cp .env.example .env   # Windows: copy .env.example .env
```
Edit `.env` as needed.

## Database Setup
```bash
cd backend
npx prisma migrate deploy
npm run db:seed
```
This creates tables and seed data:
- Services: General Inquiry (G), Billing (B), Technical Support (T)
- 3 counters
- Users: `admin / admin123`, `staff / staff123`

## Running
Development (both backend + frontend):
```bash
npm run dev
```
- Backend: http://localhost:4000
- Frontend: http://localhost:5173

Production build:
```bash
npm run build
npm start
```

## Routes
- `/kiosk` — Customer ticketing
- `/ticket/:id` — Live ticket status
- `/display` — Public display (TV)
- `/staff` — Staff dashboard (login required)
- `/admin` — Admin dashboard (admin login required)
- `/login` — Staff/admin login

## Notes
- Socket.IO is proxied in dev via Vite.
- Audio cue uses Web Audio API (may require user interaction to enable sound).
