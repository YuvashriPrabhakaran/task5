/**
 * Middleware to validate request body for task creation and updates.
 * This runs BEFORE the controllers to prevent junk data from hitting the database
 * and returns detailed, helpful error messages to developers/Postman.
 */
export const validateTask = (req, res, next) => {
  const { title, status, priority, dueDate } = req.body;
  const errors = [];

  // 1. Validation for Task Creation (POST)
  if (req.method === 'POST') {
    if (!title || typeof title !== 'string' || title.trim() === '') {
      errors.push('Title is required and must be a non-empty string');
    } else if (title.length > 100) {
      errors.push('Title cannot exceed 100 characters');
    }

    if (!dueDate) {
      errors.push('Due date is required');
    } else if (isNaN(Date.parse(dueDate))) {
      errors.push('Due date must be a valid ISO Date format (e.g. YYYY-MM-DD)');
    }
  }

  // 2. Validation for Task Updates (PUT) - fields are optional, but if present must be valid
  if (req.method === 'PUT') {
    if (title !== undefined) {
      if (typeof title !== 'string' || title.trim() === '') {
        errors.push('Title must be a non-empty string');
      } else if (title.length > 100) {
        errors.push('Title cannot exceed 100 characters');
      }
    }

    if (dueDate !== undefined) {
      if (isNaN(Date.parse(dueDate))) {
        errors.push('Due date must be a valid ISO Date format (e.g. YYYY-MM-DD)');
      }
    }
  }

  // 3. Shared Enums validation for both POST and PUT
  if (status !== undefined) {
    const validStatuses = ['Pending', 'In Progress', 'Completed'];
    if (!validStatuses.includes(status)) {
      errors.push(`Status must be one of: ${validStatuses.join(', ')}`);
    }
  }

  if (priority !== undefined) {
    const validPriorities = ['Low', 'Medium', 'High'];
    if (!validPriorities.includes(priority)) {
      errors.push(`Priority must be one of: ${validPriorities.join(', ')}`);
    }
  }

  // If there are validation errors, return them with 400 Bad Request
  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      message: 'Invalid request payload properties',
      errors: errors
    });
  }

  next();
};
