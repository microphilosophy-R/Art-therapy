import { Router, Request, Response, NextFunction } from 'express';
import multer, { type FileFilterCallback } from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { uploadAsset, type AssetType } from '../../services/upload.service';
import { authenticate } from '../../middleware/authenticate';

const imageUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

const videoUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB
    fileFilter: (_req, file, cb: FileFilterCallback) => {
        const allowed = ['video/mp4', 'video/quicktime', 'video/webm'];
        if (allowed.includes(file.mimetype)) cb(null, true);
        else cb(new Error('Only mp4, mov, and webm video files are allowed'));
    },
});

const TYPE_MAP: Record<string, AssetType> = {
    portrait: 'therapist-portrait',
    gallery:  'therapist-gallery',
    cert:     'therapist-cert',
    qr:       'therapist-qr',
    productPoster: 'product-poster',
    productVideo: 'product-video',
    productGallery: 'product-image',
};

export const uploadRouter = Router();

uploadRouter.post('/', authenticate, (req: Request, res: Response, next: NextFunction) => {
    const type = String(req.query.type ?? '');
    const middleware = type === 'productVideo' ? videoUpload.single('file') : imageUpload.single('file');
    middleware(req, res, next);
}, async (req: Request, res: Response) => {
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
            const maxSizeMb = String(req.query.type ?? '') === 'productVideo' ? 100 : 10;
            return res.status(413).json({ message: `File too large. Maximum size is ${maxSizeMb} MB.` });
        }
        return res.status(400).json({ message: err.message });
    }
    next(err);
});


