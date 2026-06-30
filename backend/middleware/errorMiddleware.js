/**
 * Global Error Handling Middleware.
 * Catches all runtime errors passed to next(err) and formats them
 * into clean, standard RESTful JSON responses.
 */
export const errorHandler = (err, req, res, next) => {
  console.error(`💥 Runtime Error [${req.method} ${req.url}]:`, err.stack || err);

  // Set default values for status and message
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    error: err.name || 'InternalServerError',
    message: message,
    // Include stack trace only in development mode to prevent leaking server directory paths
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
};

/**
 * Fallback Middleware for 404 (Not Found) Routes.
 * Catches any HTTP requests that do not match our registered endpoints.
 */
export const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route Not Found',
    message: `The requested endpoint [${req.method}] ${req.originalUrl} does not exist on this server.`
  });
};
