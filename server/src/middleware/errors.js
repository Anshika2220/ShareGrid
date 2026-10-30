function notFound(req, res, next) {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}`, errors: [] });
}

function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  const status = error.status ||
    (error.code === 11000 ? 409 :
      error.name === 'CastError' || error.name === 'ValidationError' || error.name === 'ZodError' ? 400 :
        error.name === 'MulterError' && error.code === 'LIMIT_FILE_SIZE' ? 413 : 500);
  if (status >= 500) console.error(error);
  const errors = error.details ||
    (error.name === 'ZodError' ? error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })) :
      error.code === 11000 ? [{ field: Object.keys(error.keyPattern || {})[0], message: 'Value already exists' }] : []);
  res.status(status).json({
    success: false,
    message: status >= 500 ? 'Internal server error' : error.message,
    errors
  });
}

module.exports = { notFound, errorHandler };
