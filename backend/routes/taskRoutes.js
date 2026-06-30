import express from 'express';
import { 
  getTasks, 
  getTaskById, 
  createTask, 
  updateTask, 
  deleteTask 
} from '../controllers/taskController.js';
import { validateTask } from '../middleware/validationMiddleware.js';

const router = express.Router();

// Route mapping for /api/tasks (and /tasks as per user's requests, let's mount both in server)
router.route('/')
  .get(getTasks)
  .post(validateTask, createTask);

router.route('/:id')
  .get(getTaskById)
  .put(validateTask, updateTask)
  .delete(deleteTask);

export default router;
