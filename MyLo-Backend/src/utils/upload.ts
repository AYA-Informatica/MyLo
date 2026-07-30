import multer, { FileFilterCallback, StorageEngine } from 'multer';
import { Request } from 'express';
import { v2 as cloudinary } from 'cloudinary';
import path from 'path';
import fs from 'fs';
import { config } from 'dotenv';
import { errorLogger, infoLogger } from './logger';

config();

// -------------------- Cloudinary Configuration --------------------

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

// -------------------- Upload to Cloudinary --------------------

export const uploadToCloudinary = (
  file: Express.Multer.File,
  folder: string = 'menyalo-images',
): Promise<string> =>
  new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('No file provided for upload'));
      return;
    }

    const base64Data = file.buffer.toString('base64');
    const dataURI = `data:${file.mimetype};base64,${base64Data}`;

    cloudinary.uploader.upload(
      dataURI,
      {
        folder,
        use_filename: true,
        unique_filename: true,
        overwrite: false,
        resource_type: 'auto',
      },
      (error, result) => {
        if (error) {
          errorLogger(error, 'uploadToCloudinary');
          reject(error);
          return;
        }
        if (!result?.secure_url) {
          reject(new Error('No secure URL returned from Cloudinary'));
          return;
        }
        resolve(result.secure_url);
      },
    );
  });

export const uploadProfileImage = (file: Express.Multer.File): Promise<string> =>
  uploadToCloudinary(file, 'menyalo-profiles');

// -------------------- File Filters --------------------

const imageFilter = (req: Request, file: Express.Multer.File, cb: FileFilterCallback): void => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'));
  }
};

const pdfFilter = (req: Request, file: Express.Multer.File, cb: FileFilterCallback): void => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed'));
  }
};

// -------------------- Storage Strategies --------------------

export const memoryStorage = multer.memoryStorage();

export const diskStorage = (destination: string): StorageEngine => {
  // Ensure directory exists
  if (!fs.existsSync(destination)) {
    fs.mkdirSync(destination, { recursive: true });
    infoLogger(`Directory created: ${destination}`, 'diskStorage');
  }

  return multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, destination);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const ext = path.extname(file.originalname);
      cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
    },
  });
};

// -------------------- Multer Configurations --------------------

export const imageUpload = multer({
  storage: memoryStorage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

export const pdfUpload = (destination: string = path.join(process.cwd(), 'uploads')): multer.Multer =>
  multer({
    storage: diskStorage(destination),
    fileFilter: pdfFilter,
    limits: {
      fileSize: 100 * 1024 * 1024, // 100MB per file
      files: 10, // Maximum 10 files
    },
  });

// -------------------- Generic Upload Function --------------------

export const createUpload = (options: {
  storage?: StorageEngine;
  // eslint-disable-next-line no-unused-vars
  fileFilter?: (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => void;
  limits?: {
    fileSize?: number;
    files?: number;
  };
}): multer.Multer => multer(options);