# Base44 Setup Notes

## Project Overview
Fullstack monorepo for **Grupo Armas**, an inventory and plant-transfer tracking app.

- `frontend/` — React 19 + Vite 8 + TypeScript. The main user-facing app. All data is hardcoded mock data in `App.tsx`; no backend API calls. Uses the React Compiler via `@rolldown/plugin-babel`.
- `backend/` — Express 5 + TypeScript. Connects to MS SQL Server via `mssql`, but the DB connection is **commented out** in `src/server.ts`, so it just serves a hello-world endpoint. The frontend does not call it.
- `project-grupoarmas/` — Stale prebuilt `dist/` and `node_modules` from an earlier build. Not used by the dev setup.

## Running in the Sandbox
Only the frontend is needed for the preview. It runs from `docker-compose.base44.yml`:
- Base image: `node:22-slim`, source bind-mounted at `/app/frontend`.
- `npm ci` runs on container startup, then `vite --host 0.0.0.0 --port 5173` (mapped to host port 3000).
- File-watch polling enabled (`CHOKIDAR_USEPOLLING=true`) for bind-mount compatibility.
- No external secrets or database required — the frontend is self-contained with mock data.

## Verification
- Healthcheck: `GET /` on port 5173 inside the container.
- The app shows a login screen ("GRUPO ARMAS") on first load. Clicking "INICIAR SESION" (any credentials) opens the main menu with Inventory, Transfer Tracking, and History screens.
