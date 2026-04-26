import multer from 'multer';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';

const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: {
    fileSize: env.maxFileSizeMb * 1024 * 1024,
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    if (!env.allowedMimeTypes.includes(file.mimetype)) {
      return cb(
        ApiError.badRequest(
          `Unsupported file type "${file.mimetype}". Allowed: ${env.allowedMimeTypes.join(', ')}`,
        ),
      );
    }
    cb(null, true);
  },
});
