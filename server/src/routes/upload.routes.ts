import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { uploadAsset, type AssetType } from '../services/upload.service';
import { authenticate } from '../middleware/authenticate';

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

const TYPE_MAP: Record<string, AssetType> = {
    portrait: 'therapist-portrait',
    gallery:  'therapist-gallery',
    cert:     'therapist-cert',
    qr:       'therapist-qr',
};

export const uploadRouter = Router();

uploadRouter.post('/', authenticate, upload.single('file'), async (req: Request, res: Response) => {
    const file = req.file;
    if (!file) {
        return res.status(400).json({ message: 'No file uploaded' });
    }
    const ext = path.extname(file.originalname);
    const safeId = `${uuidv4()}${ext}`;
    const assetType: AssetType = TYPE_MAP[req.query.type as string] ?? 'therapist-file';
    const url = await uploadAsset(file.buffer, assetType, safeId);
    res.json({ url });
});

// Error handler MUST be registered via router.use() AFTER the route,
// with exactly 4 parameters so Express recognises it as an error handler.
uploadRouter.use((err: any, req: Request, res: Response, next: NextFunction) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({ message: 'File too large. Maximum size is 10 MB.' });
        }
        return res.status(400).json({ message: err.message });
    }
    next(err);
});

