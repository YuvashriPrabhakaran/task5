import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { createServer as createViteServer } from 'vite';

import dbInstance from './backend/config/db.js';
import taskRoutes from './backend/routes/taskRoutes.js';

// Load environment variables
dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Initialize Database Connect
  try {
    await dbInstance.connect();
    console.log('✨ [Root Server] Database initialized.');
  } catch (err) {
    console.error('❌ [Root Server] Database failed to initialize:', err);
  }

  // --- STANDARD API GATEWAY MIDDLEWARES ---
  // Apply helmet security but disable Content-Security-Policy overrides that would interfere with Vite/Vite previews
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
  }));
  
  app.use(cors());
  app.use(morgan('dev'));
  app.use(express.json());

  // --- API ROUTING ---
  // Mount the EXACT endpoints requested
  app.use('/tasks', taskRoutes);
  app.use('/api/tasks', taskRoutes);

  // Quick API health route
  app.get('/api/health', (req, res) => {
    const dbStatus = dbInstance.getConnectionStatus();
    res.json({
      status: 'OK',
      uptime: process.uptime(),
      database: dbStatus
    });
  });

  // --- FRONTEND VITE INTEGRATION MIDDLEWARE ---
  // Serves the beautiful React dashboard for active preview in AI Studio
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // --- ERROR HANDLERS ---
  // Centralized Error handler for APIs
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(`Root Gateway Error: ${err.message}`);
    res.status(err.statusCode || 500).json({
      success: false,
      error: err.name || 'ServerError',
      message: err.message || 'Internal Server Error'
    });
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`📡 [Full-Stack Server] Gateway running at http://0.0.0.0:${PORT}`);
    console.log(`🔗 API Endpoint: http://0.0.0.0:${PORT}/api/tasks`);
  });
}

startServer();
