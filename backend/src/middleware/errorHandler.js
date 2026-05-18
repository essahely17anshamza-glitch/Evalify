import { Prisma } from '@prisma/client';

// Global Express error handler
// IMPORTANT: must always be syntactically valid; controllers depend on server boot.
const errorHandler = (err, req, res, next) => {
  // Ensure we never throw from the error handler
  try {
    console.error('Error occurred:', {
      message: err?.message,
      stack: err?.stack,
      url: req?.url,
      method: req?.method,
      timestamp: new Date().toISOString(),
      userId: req?.user?.id,
    });

    // Default error
    let error = {
      message: 'Internal Server Error',
      statusCode: 500,
      isOperational: false,
    };

    // Prisma errors
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      switch (err.code) {
        case 'P2002':
          error = {
            message: 'A record with this value already exists.',
            statusCode: 409,
            isOperational: true,
          };
          break;
        case 'P2025':
          error = {
            message: 'Record not found.',
            statusCode: 404,
            isOperational: true,
          };
          break;
        case 'P2003':
          error = {
            message: 'Foreign key constraint failed.',
            statusCode: 400,
            isOperational: true,
          };
          break;
        default:
          error = {
            message: 'Database operation failed.',
            statusCode: 500,
            isOperational: true,
          };
      }
    }
    // JWT errors
    else if (err?.name === 'JsonWebTokenError') {
      error = {
        message: 'Invalid authentication token.',
        statusCode: 401,
        isOperational: true,
      };
    } else if (err?.name === 'TokenExpiredError') {
      error = {
        message: 'Authentication token expired.',
        statusCode: 401,
        isOperational: true,
      };
    }
    // Validation errors
    else if (err?.name === 'ValidationError') {
      error = {
        message: err?.message || 'Validation failed.',
        statusCode: 400,
        isOperational: true,
      };
    }
    // Multer errors
    else if (err?.code === 'LIMIT_FILE_SIZE') {
      const limit = req?.originalUrl?.includes('/assignments') ? '50MB' : '100MB';
      error = {
        message: `File size too large. Maximum size is ${limit}.`,
        statusCode: 413,
        isOperational: true,
      };
    } else if (err?.code === 'LIMIT_FILE_COUNT') {
      error = {
        message: 'Too many files uploaded.',
        statusCode: 400,
        isOperational: true,
      };
    } else if (
      err?.message &&
      (
        err.message.includes('ZIP file') ||
        err.message.includes('Unsupported file type') ||
        err.message.includes('Unsupported assignment attachment')
      )
    ) {
      error = {
        message: err.message,
        statusCode: 400,
        isOperational: true,
      };
    }
    // AWS S3 errors
    else if (err?.name === 'NoSuchBucket') {
      error = {
        message: 'S3 bucket not found.',
        statusCode: 500,
        isOperational: true,
      };
    } else if (err?.name === 'NoSuchKey') {
      error = {
        message: 'File not found in storage.',
        statusCode: 404,
        isOperational: true,
      };
    }
    // Custom operational errors
    else if (err?.isOperational) {
      error = {
        message: err.message,
        statusCode: err.statusCode || 500,
        isOperational: true,
      };
    }

    res.status(error.statusCode).json({
      success: false,
      error: {
        message: error.message,
        code: error.statusCode,
        ...(process.env.NODE_ENV === 'development' && {
          stack: err?.stack,
          details: err,
        }),
      },
    });
  } catch (handlerError) {
    // Absolute last resort
    console.error('Error in errorHandler:', handlerError);
    res.status(500).json({
      success: false,
      error: { message: 'Internal Server Error', code: 500 },
    });
  }
};

// Async error wrapper for routes
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// 404 handler
export const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      message: `Route ${req.originalUrl} not found`,
      code: 404,
    },
  });
};

// Custom error class
export class AppError extends Error {
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.name = this.constructor.name;

    Error.captureStackTrace(this, this.constructor);
  }
}

export default errorHandler;
