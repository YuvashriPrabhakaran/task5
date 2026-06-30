import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import dbInstance from './config/db.js';
import taskRoutes from './routes/taskRoutes.js';
import { errorHandler, notFoundHandler } from './middleware/errorMiddleware.js';

// Load environment variables from .env file
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to Database
dbInstance.connect().then(() => {
  console.log('✨ Database initialization finished.');
});

// --- GLOBAL MIDDLEWARES ---
// 🛡️ Security Headers via Helmet
app.use(helmet());

// 🌐 CORS Policy configuration (Allows frontend origins)
app.use(cors());

// 📝 Morgan HTTP Request Logging (Combined/Dev formats)
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// 📦 Parse Incoming JSON payloads
app.use(express.json());

// --- ROUTES ---
// Mount Task APIs on both `/tasks` and `/api/tasks` to satisfy multiple architectural goals
app.use('/tasks', taskRoutes);
app.use('/api/tasks', taskRoutes);

// Root route welcome message
app.get('/', (req, res) => {
  const dbStatus = dbInstance.getConnectionStatus();
  res.status(200).json({
    success: true,
    message: 'Welcome to the RESTful Task Management System API',
    status: 'ONLINE',
    database: dbStatus,
    endpoints: {
      getAllTasks: 'GET /tasks (or /api/tasks)',
      getTaskById: 'GET /tasks/:id',
      createTask: 'POST /tasks',
      updateTask: 'PUT /tasks/:id',
      deleteTask: 'DELETE /tasks/:id'
    }
  });
});

// --- FALLBACK HANDLERS ---
// 404 Route Not Found fallback
app.use(notFoundHandler);

// Global Error Handler
app.use(errorHandler);

// --- START SERVER ---
app.listen(PORT, () => {
  console.log(`🚀 RESTful Server is running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  console.log(`🔗 API URL: http://localhost:${PORT}`);
});
