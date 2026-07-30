import { Request, Response, NextFunction } from 'express';
import { ResponseService } from '../utils/response';

export interface FileValidationOptions {
  fieldName: string;
  maxFiles?: number;
  minFiles?: number;
  allowedMimeTypes?: string[];
  maxFileSize?: number;
}

export const fileValidationMiddleware =
  (options: FileValidationOptions) =>
  (req: Request, res: Response, next: NextFunction): unknown => {
    try {
      const files = req.files as Express.Multer.File[];

      // Check if files exist
      if (!files || files.length === 0) {
        if (options.minFiles && options.minFiles > 0) {
          return ResponseService({
            data: null,
            success: false,
            status: 400,
            message: `${options.fieldName} are required`,
            res,
          });
        }
        return next(); // No files required
      }

      // Check minimum files
      if (options.minFiles && files.length < options.minFiles) {
        return ResponseService({
          data: null,
          success: false,
          status: 400,
          message: `At least ${options.minFiles} ${options.fieldName} required`,
          res,
        });
      }

      // Check maximum files
      if (options.maxFiles && files.length > options.maxFiles) {
        return ResponseService({
          data: null,
          success: false,
          status: 400,
          message: `Maximum ${options.maxFiles} ${options.fieldName} allowed`,
          res,
        });
      }

      // Check file types
      if (options.allowedMimeTypes) {
        for (const file of files) {
          if (!options.allowedMimeTypes.includes(file.mimetype)) {
            return ResponseService({
              data: null,
              success: false,
              status: 400,
              message: `Invalid file type. Allowed types: ${options.allowedMimeTypes.join(', ')}`,
              res,
            });
          }
        }
      }

      // Check file sizes
      if (options.maxFileSize) {
        for (const file of files) {
          if (file.size > options.maxFileSize) {
            return ResponseService({
              data: null,
              success: false,
              status: 400,
              message: `File ${file.originalname} is too large. Maximum size: ${Math.round(options.maxFileSize / (1024 * 1024))}MB`,
              res,
            });
          }
        }
      }

      next();
    } catch (error) {
      return ResponseService({
        data: error as Error,
        success: false,
        status: 500,
        message: 'File validation error',
        res,
      });
    }
  };

// Predefined validators for common use cases
export const postImageValidation = fileValidationMiddleware({
  fieldName: 'images',
  minFiles: 1,
  maxFiles: 8,
  allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  maxFileSize: 5 * 1024 * 1024, // 5MB
});

export const profileImageValidation = fileValidationMiddleware({
  fieldName: 'profilePicture',
  minFiles: 0,
  maxFiles: 1,
  allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  maxFileSize: 2 * 1024 * 1024, // 2MB
});

export const documentValidation = fileValidationMiddleware({
  fieldName: 'documents',
  minFiles: 1,
  maxFiles: 1,
  allowedMimeTypes: ['application/pdf', 'application/msword'],
  maxFileSize: 100 * 1024 * 1024, // 10MB
});
