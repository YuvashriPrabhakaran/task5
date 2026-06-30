import fs from 'fs';
import path from 'path';
import Task from './taskModel.js';
import dbInstance from '../config/db.js';

const FALLBACK_FILE_PATH = path.join(process.cwd(), 'tasks.json');

// Helper to read tasks from fallback JSON file
function readFallbackFile() {
  try {
    if (!fs.existsSync(FALLBACK_FILE_PATH)) {
      // Seed with initial sample tasks if file doesn't exist
      const sampleTasks = [
        {
          _id: 'task_1',
          title: 'Design RESTful API Schema',
          description: 'Define the data models and HTTP endpoints for the internship project submission.',
          status: 'Completed',
          priority: 'High',
          dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
          createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          _id: 'task_2',
          title: 'Integrate MongoDB with Mongoose',
          description: 'Establish database connection, create schemas, and handle connection fallbacks.',
          status: 'In Progress',
          priority: 'Medium',
          dueDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          _id: 'task_3',
          title: 'Build Interactive React Dashboard',
          description: 'Design a highly polished user interface with request logger to debug RESTful API in real-time.',
          status: 'Pending',
          priority: 'High',
          dueDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          _id: 'task_4',
          title: 'Draft Project Documentation',
          description: 'Write README.md containing setup guides, API endpoints tables, and curl requests.',
          status: 'Pending',
          priority: 'Low',
          dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      ];
      fs.writeFileSync(FALLBACK_FILE_PATH, JSON.stringify(sampleTasks, null, 2));
      return sampleTasks;
    }
    const data = fs.readFileSync(FALLBACK_FILE_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading fallback storage file:', error);
    return [];
  }
}

// Helper to write tasks to fallback JSON file
function writeFallbackFile(tasks) {
  try {
    fs.writeFileSync(FALLBACK_FILE_PATH, JSON.stringify(tasks, null, 2));
  } catch (error) {
    console.error('Error writing fallback storage file:', error);
  }
}

/**
 * Task Repository Layer.
 * Decides whether to interact with MongoDB or local file fallback
 * based on database connection state.
 */
export const TaskRepository = {
  // GET tasks with filters, search, sorting, and pagination
  async findAll({ search, status, priority, sortBy, sortOrder = 'asc', page = 1, limit = 10 }) {
    const isFallback = dbInstance.isFallback;

    if (!isFallback) {
      // 🟢 MONGODB FLOW
      const query = {};

      if (search) {
        query.$or = [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
        ];
      }

      if (status) {
        query.status = status;
      }

      if (priority) {
        query.priority = priority;
      }

      const sort = {};
      if (sortBy) {
        sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
      } else {
        sort.createdAt = -1; // Default: newest first
      }

      const skip = (page - 1) * limit;

      const total = await Task.countDocuments(query);
      const dbTasks = await Task.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit);

      // Standardize MongoDB output
      const tasks = dbTasks.map(t => {
        const item = t.toJSON();
        return {
          id: item.id || item._id,
          title: item.title,
          description: item.description,
          status: item.status,
          priority: item.priority,
          dueDate: item.dueDate,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt
        };
      });

      return {
        tasks,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        }
      };
    } else {
      // 🟡 FALLBACK FILE FLOW
      let tasks = readFallbackFile();

      // Search filtering
      if (search) {
        const searchRegex = new RegExp(search, 'i');
        tasks = tasks.filter(t => searchRegex.test(t.title) || searchRegex.test(t.description || ''));
      }

      // Status filtering
      if (status) {
        tasks = tasks.filter(t => t.status === status);
      }

      // Priority filtering
      if (priority) {
        tasks = tasks.filter(t => t.priority === priority);
      }

      // Sorting
      if (sortBy) {
        tasks.sort((a, b) => {
          let valA = a[sortBy];
          let valB = b[sortBy];

          // Handle dates
          if (sortBy === 'dueDate' || sortBy === 'createdAt' || sortBy === 'updatedAt') {
            valA = new Date(valA).getTime();
            valB = new Date(valB).getTime();
          }

          // Handle strings
          if (typeof valA === 'string' && typeof valB === 'string') {
            return sortOrder === 'desc' 
              ? valB.localeCompare(valA) 
              : valA.localeCompare(valB);
          }

          // Fallback number sort
          return sortOrder === 'desc' ? valB - valA : valA - valB;
        });
      } else {
        // Default: newest first
        tasks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }

      // Pagination
      const total = tasks.length;
      const skip = (page - 1) * limit;
      const paginatedTasks = tasks.slice(skip, skip + limit);

      // Standardize format
      const normalizedTasks = paginatedTasks.map(t => ({
        id: t._id,
        title: t.title,
        description: t.description,
        status: t.status,
        priority: t.priority,
        dueDate: t.dueDate,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt
      }));

      return {
        tasks: normalizedTasks,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        }
      };
    }
  },

  // GET single task by ID
  async findById(id) {
    const isFallback = dbInstance.isFallback;

    if (!isFallback) {
      const item = await Task.findById(id);
      if (!item) return null;
      const t = item.toJSON();
      return {
        id: t.id || t._id,
        title: t.title,
        description: t.description,
        status: t.status,
        priority: t.priority,
        dueDate: t.dueDate,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt
      };
    } else {
      const tasks = readFallbackFile();
      const task = tasks.find(t => t._id === id);
      if (!task) return null;
      return {
        id: task._id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        dueDate: task.dueDate,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt
      };
    }
  },

  // POST create new task
  async create(data) {
    const isFallback = dbInstance.isFallback;

    if (!isFallback) {
      const item = await Task.create(data);
      const t = item.toJSON();
      return {
        id: t.id || t._id,
        title: t.title,
        description: t.description,
        status: t.status,
        priority: t.priority,
        dueDate: t.dueDate,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt
      };
    } else {
      const tasks = readFallbackFile();
      const newId = 'task_' + Date.now();
      const now = new Date().toISOString();
      const newTask = {
        _id: newId,
        title: data.title,
        description: data.description || '',
        status: data.status || 'Pending',
        priority: data.priority || 'Medium',
        dueDate: new Date(data.dueDate).toISOString(),
        createdAt: now,
        updatedAt: now,
      };

      tasks.push(newTask);
      writeFallbackFile(tasks);

      return {
        id: newTask._id,
        title: newTask.title,
        description: newTask.description,
        status: newTask.status,
        priority: newTask.priority,
        dueDate: newTask.dueDate,
        createdAt: newTask.createdAt,
        updatedAt: newTask.updatedAt
      };
    }
  },

  // PUT update existing task by ID
  async update(id, data) {
    const isFallback = dbInstance.isFallback;

    if (!isFallback) {
      const item = await Task.findByIdAndUpdate(id, data, {
        new: true,
        runValidators: true,
      });
      if (!item) return null;
      const t = item.toJSON();
      return {
        id: t.id || t._id,
        title: t.title,
        description: t.description,
        status: t.status,
        priority: t.priority,
        dueDate: t.dueDate,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt
      };
    } else {
      const tasks = readFallbackFile();
      const taskIndex = tasks.findIndex(t => t._id === id);
      if (taskIndex === -1) return null;

      const updatedTask = {
        ...tasks[taskIndex],
        title: data.title !== undefined ? data.title : tasks[taskIndex].title,
        description: data.description !== undefined ? data.description : tasks[taskIndex].description,
        status: data.status !== undefined ? data.status : tasks[taskIndex].status,
        priority: data.priority !== undefined ? data.priority : tasks[taskIndex].priority,
        dueDate: data.dueDate !== undefined ? new Date(data.dueDate).toISOString() : tasks[taskIndex].dueDate,
        updatedAt: new Date().toISOString(),
      };

      tasks[taskIndex] = updatedTask;
      writeFallbackFile(tasks);

      return {
        id: updatedTask._id,
        title: updatedTask.title,
        description: updatedTask.description,
        status: updatedTask.status,
        priority: updatedTask.priority,
        dueDate: updatedTask.dueDate,
        createdAt: updatedTask.createdAt,
        updatedAt: updatedTask.updatedAt
      };
    }
  },

  // DELETE task by ID
  async delete(id) {
    const isFallback = dbInstance.isFallback;

    if (!isFallback) {
      const item = await Task.findByIdAndDelete(id);
      return !!item;
    } else {
      const tasks = readFallbackFile();
      const initialLength = tasks.length;
      const filteredTasks = tasks.filter(t => t._id !== id);
      writeFallbackFile(filteredTasks);
      return filteredTasks.length < initialLength;
    }
  }
};
