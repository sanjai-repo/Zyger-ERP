# Zyger ERP

Enterprise Resource Planning (ERP) system tailored for **CNC & Precision Manufacturing**, Job Shops, and High-Precision Engineering Facilities.

---

## 🏗️ Technology Stack

- **Backend**: Java 25 / Spring Boot 3.x, Spring Data JPA, Spring Security, Flyway Migrations
- **Database**: PostgreSQL 16
- **Frontend**: React 19, TypeScript, Vite, TanStack Query, Recharts
- **Deployment & DevSecOps**: Docker, Docker Compose, Gradle, Node.js

---

## 🚀 How to Run the Project

### Prerequisites

Make sure you have the following installed on your machine:
- **Node.js** (v18 or higher) & `npm`
- **Java JDK** (Java 21 or Java 25)
- **PostgreSQL 16** (or Docker to run PostgreSQL)

---

### Option 1: Running Locally (Development Mode)

#### 1. Start PostgreSQL Database

You can run PostgreSQL locally or using Docker Compose:

```bash
docker compose up -d db
```

*Database Credentials (default):*
- **Database**: `zyger_erp`
- **Username**: `zyger`
- **Password**: `zyger123`
- **Port**: `5432`

#### 2. Run the Backend (`zygererp`)

Open a terminal in the project root directory:

```bash
cd zygererp
./gradlew bootRun
```

The Spring Boot backend will start on **`http://localhost:9090`**.

#### 3. Run the Frontend (`zyger-erp-frontend`)

Open a second terminal window:

```bash
cd zyger-erp-frontend
npm install
npm run dev
```

The React Vite frontend will start on **`http://localhost:5173`**.

---

### Option 2: Running with Docker Compose

To build and launch services with Docker Compose:

```bash
docker compose up --build
```

---

### Option 3: Running with Docker Swarm (Stack Mode - Port 9091)

To host the full stack on Docker Swarm with the frontend always running on port **9091**:

```bash
./deploy.sh
```

Or manually:

```bash
# 1. Initialize Docker Swarm (if not already active)
docker swarm init

# 2. Build Docker images
docker build -f Dockerfile.backend -t zyger-erp/backend:latest -t zyger-erp/backend:v6 .
docker build -f Dockerfile.frontend -t zyger-erp/frontend:latest -t zyger-erp/frontend:v6 .

# 3. Deploy stack to Docker Swarm
docker stack deploy -c stack.yml zygererp
```

**Access URLs:**
- **Frontend**: [http://localhost:9091](http://localhost:9091)
- **Backend**: [http://localhost:9090](http://localhost:9090)

## 🛠️ Verification & Build Commands

### Backend Verification (`zygererp`)

```bash
cd zygererp
./gradlew compileJava    # Compile Java sources
./gradlew assemble       # Build executable JAR
```

### Frontend Verification (`zyger-erp-frontend`)

```bash
cd zyger-erp-frontend
npx tsc -b               # TypeScript type-check
npm run build            # Production bundle build
```

---

## 📂 Project Structure

```
Zyger ERP/
├── zygererp/                 # Spring Boot Backend Service
│   ├── src/main/java/        # Java source code (Controllers, Services, Entities)
│   └── src/main/resources/   # App configuration & Flyway DB migrations (db/migration)
├── zyger-erp-frontend/       # React + Vite Frontend Application
│   ├── src/pages/            # Quality, Inventory, Sales, Purchase, Maintenance modules
│   └── src/components/       # Reusable UI components & layouts
├── docker-compose.yml        # Docker service orchestration
└── README.md                 # Project documentation
```

---

## 📄 License

Internal Enterprise License — Zyger ERP Team.
