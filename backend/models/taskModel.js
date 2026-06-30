import mongoose from 'mongoose';

/**
 * Task Schema Definition for MongoDB using Mongoose.
 * This outlines the exact structure of a task in the database.
 */
const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
      default: '',
    },
    status: {
      type: String,
      required: [true, 'Task status is required'],
      enum: {
        values: ['Pending', 'In Progress', 'Completed'],
        message: '{VALUE} is not a valid status (Pending, In Progress, Completed)',
      },
      default: 'Pending',
    },
    priority: {
      type: String,
      required: [true, 'Task priority is required'],
      enum: {
        values: ['Low', 'Medium', 'High'],
        message: '{VALUE} is not a valid priority (Low, Medium, High)',
      },
      default: 'Medium',
    },
    dueDate: {
      type: Date,
      required: [true, 'Task due date is required'],
    },
  },
  {
    timestamps: true, // Automatically creates and manages 'createdAt' and 'updatedAt' fields
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for ID mapping (standardizes Mongoose _id to a simple 'id' field for frontend consumption)
taskSchema.virtual('id').get(function () {
  return this._id.toHexString();
});

const Task = mongoose.models.Task || mongoose.model('Task', taskSchema);

export default Task;
