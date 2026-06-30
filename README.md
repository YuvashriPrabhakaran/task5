# 📋 Task Management System - RESTful API Design & Integration

An industry-grade **Task Management System** featuring a robust **Node.js + Express.js RESTful API**, **MongoDB + Mongoose** integration, and a highly polished, interactive **Frontend client** demonstrating asynchronous CRUD operations, filtering, searching, sorting, and pagination.

This project is fully structured, thoroughly documented, and prepared for **internship submissions, technical assessments, and GitHub portfolios**.

---

## 🏗️ Project Architecture

The project is split into two clean, decoupled directories, adhering to professional full-stack development patterns:

```text
task-management-system/
├── backend/                  # RESTful API Server (Node.js & Express)
│   ├── config/               # Database configurations (Mongoose setup)
│   │   └── db.js
│   ├── controllers/          # API Route Controllers (Express Handlers)
│   │   └── taskController.js
│   ├── middleware/           # Custom Express middlewares (Validation, Error)
│   │   ├── errorMiddleware.js
│   │   └── validationMiddleware.js
│   ├── models/               # MongoDB Database Schemas
│   │   ├── taskModel.js
│   │   └── taskStore.js      # Robust Fallback & DB switcher
│   ├── routes/               # API Router declarations
│   │   └── taskRoutes.js
│   ├── .env                  # Environment Variables
│   ├── package.json          # Backend package specifications
│   └── server.js             # API Gateway Entry Point
│
├── frontend/                 # Client Interface (Plain HTML/CSS/JS)
│   ├── index.html            # UI Layout and Structure (Tailwind CSS CDN)
│   ├── style.css             # Supplementary Styles (Animations & Console)
│   └── script.js             # Asynchronous Fetch integration & HTTP Logger
│
├── README.md                 # Project Documentation (This File)
└── Postman-Collection.json   # Ready-to-import Postman REST tests
```

---

## ⚡ Key Features

1. **RESTful CRUD Operations**: Full task lifecycle creation, retrieval, updates, and deletion.
2. **MongoDB Connectivity**: Seamless cloud or local MongoDB connections using the **Mongoose ODM**.
3. **Graceful Database Fallback**: If a MongoDB instance is unavailable, the server automatically boots in **Fallback Mode** using an elegant local JSON file storage (`tasks.json`). **The application remains 100% functional out-of-the-box!**
4. **Input Validation Middleware**: Strict payload protection checking types, character lengths, dates, and enum validations.
5. **Global Exception Handling**: Centralized error interceptor capturing invalid ObjectIds, validation constraints, and server crashes, responding with structured JSON.
6. **Advanced Querying APIs (Bonus)**:
   - **Search**: Fuzzy lookup across task titles and descriptions.
   - **Filter**: Narrow down tasks by `status` (Pending, In Progress, Completed) or `priority` (Low, Medium, High).
   - **Sort**: Order tasks dynamically by date of creation, due date, title, or priority.
   - **Pagination**: High-performance paging (`page`, `limit`) to avoid server memory overload.
7. **Production Middleware Security**: Configured with `helmet` for secure HTTP headers, `cors` for cross-origin compliance, and `morgan` for detailed console requests logging.
8. **Live REST Logger Console**: The frontend features a beautiful, real-time terminal monitor displaying outbound HTTP Fetch requests and inbound JSON responses.

---

## ⚙️ Environment Variables

Create a `.env` file in the `backend/` directory.

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration
# Swap this with your MongoDB Atlas link or a local MongoDB database URI
MONGODB_URI=mongodb://localhost:27017/task_db
```

---

## 🚀 Installation & Setup

### Prerequisites
- [Node.js](https://nodejs.org/) (v16+ recommended)
- [MongoDB Community Server](https://www.mongodb.com/try/download/community) (Optional - falls back to file storage if not running)

### Step 1: Run the Backend API Server
1. Navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the server in Development mode (reboots on file saves):
   ```bash
   npm run dev
   ```
   *For production startup, run:* `npm start`

### Step 2: Launch the Frontend Client
- Because the frontend is decoupled, you can run it directly:
  - Simply double-click `/frontend/index.html` to open it in your browser!
  - Alternatively, serve it via any static server, or run the integrated workspace server which serves both.

---

## 📡 REST API Documentation

All request payloads and responses use the standard `application/json` content type.

| Method | Endpoint | Description | Query Parameters (Optional) |
| :--- | :--- | :--- | :--- |
| **GET** | `/api/tasks` | Get all tasks with sorting, filters, & search | `search`, `status`, `priority`, `sortBy`, `sortOrder`, `page`, `limit` |
| **GET** | `/api/tasks/:id` | Get detailed information of a single task | None |
| **POST** | `/api/tasks` | Create a new task in the database | None |
| **PUT** | `/api/tasks/:id` | Update an existing task partially or fully | None |
| **DELETE** | `/api/tasks/:id`| Permanently delete a task from database | None |

---

## 📬 Sample Requests & Responses

### 1. Create a Task (POST `/api/tasks`)
**Request Body:**
```json
{
  "title": "Build API Documentation",
  "description": "Draft instructions and curl requests for the RESTful project submission.",
  "status": "In Progress",
  "priority": "High",
  "dueDate": "2026-07-05T00:00:00.000Z"
}
```

**Expected Response (HTTP 211 / 201 Created):**
```json
{
  "success": true,
  "message": "Task created successfully",
  "data": {
    "id": "64bf6d07936a10787e9cf109",
    "title": "Build API Documentation",
    "description": "Draft instructions and curl requests for the RESTful project submission.",
    "status": "In Progress",
    "priority": "High",
    "dueDate": "2026-07-05T00:00:00.000Z",
    "createdAt": "2026-06-30T11:39:29.102Z",
    "updatedAt": "2026-06-30T11:39:29.102Z"
  }
}
```

---

### 2. Retrieve All Tasks (GET `/api/tasks?priority=High&limit=2`)
**Expected Response (HTTP 200 OK):**
```json
{
  "success": true,
  "message": "Tasks retrieved successfully",
  "meta": {
    "databaseMode": "MongoDB / Mongoose Connection",
    "total": 3,
    "page": 1,
    "limit": 2,
    "pages": 2
  },
  "data": [
    {
      "id": "64bf6d07936a10787e9cf109",
      "title": "Build API Documentation",
      "description": "Draft instructions and curl requests for the RESTful project submission.",
      "status": "In Progress",
      "priority": "High",
      "dueDate": "2026-07-05T00:00:00.000Z",
      "createdAt": "2026-06-30T11:39:29.102Z",
      "updatedAt": "2026-06-30T11:39:29.102Z"
    }
  ]
}
```

---

### 3. Handle Validation Failures (POST Error Example)
If a user submits a payload with missing fields or invalid inputs (e.g. status: "Urgent"):

**Expected Response (HTTP 400 Bad Request):**
```json
{
  "success": false,
  "error": "Validation Error",
  "message": "Invalid request payload properties",
  "errors": [
    "Title is required and must be a non-empty string",
    "Status must be one of: Pending, In Progress, Completed"
  ]
}
```

---

## 🧪 Postman Collection Setup
1. Open Postman.
2. Click **Import** in the top-left corner.
3. Drag and drop the generated `Postman-Collection.json` file.
4. Set up a global variable `url` pointing to `http://localhost:5000` to run tests instantly against your local environment!

---

## 🛠️ Git Commit Guidelines
To show high-quality professional development, use structured git commits:
- `feat: initialize Express server and CORS/Helmet middlewares`
- `feat: establish database setup with Mongoose schema and fallback support`
- `feat: build complete RESTful Task CRUD controllers`
- `feat: add task validation and centralized JSON error handlers`
- `feat: create beautiful client UI with real-time fetch logs and pagination`
- `docs: write complete setup instructions and API tables`
