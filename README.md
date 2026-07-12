# MaintainIQ ⚡
### AI-Powered Enterprise Asset Management & Maintenance Platform

MaintainIQ is a highly polished, production-grade Asset Management System built for modern enterprise teams. It features distinct workspace portals for **Administrators**, **Field Technicians**, and **Supervisors**, complete with automated AI Triage, QR label sheets generation, cost logs auditing, and a fail-safe offline mode.

---

## 🛠️ Technology Stack

MaintainIQ utilizes a modern, robust, and fast software architecture:

### 1. Frontend
* **Core**: Single Page Application (SPA) utilizing **React 18** and **Babel** for client-side execution.
* **Styling**: **Tailwind CSS** (v3) configured with a custom Obsidian/Dark-theme design system.
* **Icons**: **Lucide Icons** package for clean, scalable icons.
* **Security & Auth**: Client-side **JWT Session storage** with automatic auth routing state guards.
* **QR Codes**: Native client-side QR Matrix rendering.

### 2. Backend (Node.js & Express)
* **Core API Server**: **Express.js** handling API requests and serving static assets.
* **Database Object Modeling**: **Mongoose** (v8) for clean document schema modeling.
* **Authentication**: **jsonwebtoken** (JWT) validation and payload signing.
* **Security**: **bcryptjs** (12-round salt hashing) for encrypted password storage.
* **Environment Configuration**: **dotenv** for local credentials masking.

### 3. Database
* **MongoDB**: A schema-flexible Document Database.
* **Auto-Seeder**: Automatic mock database injector (`seed.js`) that populates initial data for testing upon first startup.

### 4. AI Engine
* **AI Diagnostics**: Integrates with the **Gemini 1.5 Flash API** to perform automated incident triage, root cause prediction, and safety warnings (falls back to local heuristic analysis when offline).

---

## 🏃 Running Commands

Follow these steps to launch the backend and database on your local machine:

### 1. Prerequisite Installations
Ensure you have the following installed on your system:
* **Node.js (LTS)**: [Download Node.js](https://nodejs.org/)
* **MongoDB Community Server**: [Download MongoDB](https://www.mongodb.com/try/download/community) (Starts automatically as a service on port `27017`).
* **MongoDB Compass (Optional)**: [Download Compass UI](https://www.mongodb.com/products/tools/compass) to view your tables visually.

### 2. Environment Variables Setup
Create or update the configuration file in `backend/.env`:
```env
MONGO_URI=mongodb://127.0.0.1:27017/maintainiq
PORT=5000
JWT_SECRET=your_jwt_secret_key_here
GEMINI_API_KEY=your_optional_gemini_api_key
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

`JWT_SECRET` must be set to a real random string — the server refuses to start without it. Cloudinary variables are optional; evidence upload endpoints return a graceful `503` until they're configured.

### 3. Install Dependencies
Open your terminal, navigate to the `backend` folder, and run:
```bash
cd backend
npm install
```

### 4. Start the Application
Run the backend server:
```bash
npm start
```
* Or for development mode (with hot-reloading):
```bash
npm run dev
```

The system will automatically connect to MongoDB, seed collections if they are empty, and output:
```text
Connecting to MongoDB...
Connected to MongoDB successfully at: mongodb://127.0.0.1:27017/maintainiq
🚀 MaintainIQ Backend Server running on port 5000
```

---

## 🔑 Default Accounts (Demo Logins)

The server database auto-seeder prepares these accounts for instant logins:

| Role | Username | Password | Access Scope |
|---|---|---|---|
| **Admin** | `admin_jameson` | `admin123` | Full access, Asset registry CRUD, Team management |
| **Technician** | `tech_ali` | `tech123` | Assigned task logs, status updates, scanner access |
| **Supervisor** | `supervisor_bilal` | `super123` | Task assigning, command KPIs, cost approval |

---

## 🐳 Running with Docker

```bash
docker compose up --build
```

This starts MongoDB and the backend together (backend on `http://localhost:5000`, serving `index.html`, `auth.html`, `public.html`, and the `admin/` portal). Set `JWT_SECRET`, `GEMINI_API_KEY`, and the `CLOUDINARY_*` variables in your shell or a `.env` file next to `docker-compose.yml` before starting — see `docker-compose.yml` for the full list.

See [API.md](./API.md) for the full endpoint reference.

---

## 🛡️ Fail-Safe Local Fallback Mode
MaintainIQ features a built-in **resilient fallback layer**. If your MongoDB server or backend is offline, the client detects the offline status and seamlessly switches to LocalStorage-based datasets. This allows testing all tabs (Admin, Tech, Supervisor) without requiring MongoDB to be active.

<!-- CI/CD deploy pipeline test 2026-07-12T01:06:32Z -->
