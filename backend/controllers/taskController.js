import { TaskRepository } from '../models/taskStore.js';
import dbInstance from '../config/db.js';

/**
 * @desc    Get all tasks with optional search, filters, sorting, and pagination
 * @route   GET /api/tasks
 * @access  Public
 */
export const getTasks = async (req, res, next) => {
  try {
    const { 
      search, 
      status, 
      priority, 
      sortBy, 
      sortOrder, 
      page, 
      limit 
    } = req.query;

    // Standardize query params
    const options = {
      search: search || '',
      status: status || '',
      priority: priority || '',
      sortBy: sortBy || 'createdAt',
      sortOrder: sortOrder === 'asc' ? 'asc' : 'desc', // Default to descending order (newest first)
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 10,
    };

    const result = await TaskRepository.findAll(options);
    const dbStatus = dbInstance.getConnectionStatus();

    res.status(200).json({
      success: true,
      message: 'Tasks retrieved successfully',
      meta: {
        databaseMode: dbStatus.mode,
        ...result.pagination
      },
      data: result.tasks,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get a single task by ID
 * @route   GET /api/tasks/:id
 * @access  Public
 */
export const getTaskById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const task = await TaskRepository.findById(id);

    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found',
        message: `Task with ID ${id} was not found in the database`
      });
    }

    res.status(200).json({
      success: true,
      message: 'Task retrieved successfully',
      data: task,
    });
  } catch (error) {
    // Check if error is due to an invalid MongoDB ObjectId format
    if (error.kind === 'ObjectId') {
      return res.status(400).json({
        success: false,
        error: 'Invalid Task ID format',
        message: 'The requested task ID is not in a valid MongoDB ObjectId format'
      });
    }
    next(error);
  }
};

/**
 * @desc    Create a new task
 * @route   POST /api/tasks
 * @access  Public
 */
export const createTask = async (req, res, next) => {
  try {
    const { title, description, status, priority, dueDate } = req.body;

    const taskData = {
      title,
      description,
      status,
      priority,
      dueDate,
    };

    const newTask = await TaskRepository.create(taskData);

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: newTask,
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: messages.join(', ')
      });
    }
    next(error);
  }
};

/**
 * @desc    Update an existing task
 * @route   PUT /api/tasks/:id
 * @access  Public
 */
export const updateTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, description, status, priority, dueDate } = req.body;

    // Filter out undefined fields to only update what was provided (patch support)
    const updateFields = {};
    if (title !== undefined) updateFields.title = title;
    if (description !== undefined) updateFields.description = description;
    if (status !== undefined) updateFields.status = status;
    if (priority !== undefined) updateFields.priority = priority;
    if (dueDate !== undefined) updateFields.dueDate = dueDate;

    const updatedTask = await TaskRepository.update(id, updateFields);

    if (!updatedTask) {
      return res.status(404).json({
        success: false,
        error: 'Task not found',
        message: `Could not update task. Task with ID ${id} was not found`
      });
    }

    res.status(200).json({
      success: true,
      message: 'Task updated successfully',
      data: updatedTask,
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: messages.join(', ')
      });
    }
    if (error.kind === 'ObjectId') {
      return res.status(400).json({
        success: false,
        error: 'Invalid Task ID format',
        message: 'The requested task ID is not in a valid MongoDB ObjectId format'
      });
    }
    next(error);
  }
};

/**
 * @desc    Delete a task
 * @route   DELETE /api/tasks/:id
 * @access  Public
 */
export const deleteTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const isDeleted = await TaskRepository.delete(id);

    if (!isDeleted) {
      return res.status(404).json({
        success: false,
        error: 'Task not found',
        message: `Could not delete task. Task with ID ${id} was not found`
      });
    }

    res.status(200).json({
      success: true,
      message: 'Task deleted successfully',
      data: { id }
    });
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(400).json({
        success: false,
        error: 'Invalid Task ID format',
        message: 'The requested task ID is not in a valid MongoDB ObjectId format'
      });
    }
    next(error);
  }
};
