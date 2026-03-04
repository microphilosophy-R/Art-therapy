import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const logToFile = (msg: string) => {
  try {
    fs.appendFileSync(path.join(process.cwd(), 'debug.log'), `${new Date().toISOString()} - ${msg}\n`);
  } catch { }
};

const isCloudinaryConfigured = () => {
  return (
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_CLOUD_NAME !== 'placeholder' &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_KEY !== 'placeholder' &&
    process.env.CLOUDINARY_API_SECRET &&
    process.env.CLOUDINARY_API_SECRET !== 'placeholder'
  );
};

const saveLocalFile = async (fileBuffer: Buffer, subfolder: string, filename: string): Promise<string> => {
  logToFile(`[UploadService] saveLocalFile: ${subfolder}/${filename}`);
  try {
    const uploadsBase = path.join(process.cwd(), 'uploads');
    const dir = path.join(uploadsBase, subfolder);
    if (!fs.existsSync(dir)) {
      logToFile(`[UploadService] Creating subfolder: ${dir}`);
      fs.mkdirSync(dir, { recursive: true });
    }
    const filePath = path.join(dir, filename);
    await fs.promises.writeFile(filePath, fileBuffer);

    const serverUrl = process.env.SERVER_URL || `http://localhost:${process.env.PORT || 3001}`;
    const url = `${serverUrl}/uploads/${subfolder}/${filename}`;
    logToFile(`[UploadService] File saved locally at: ${filePath}. URL: ${url}`);
    return url;
  } catch (err: any) {
    logToFile(`[UploadService] saveLocalFile failed: ${err.message}`);
    throw err;
  }
};

export type AssetType =
  | 'avatar'
  | 'artwork'
  | 'poster'
  | 'video'
  | 'plan-image'
  | 'plan-pdf'
  | 'therapist-file'
  | 'therapist-portrait'
  | 'therapist-gallery'
  | 'therapist-cert'
  | 'therapist-qr'
  | 'user-portrait'
  | 'user-gallery';

const ASSET_CONFIG: Record<AssetType, {
  folder: string;
  resourceType: 'image' | 'video' | 'raw' | 'auto';
  localExt: string;
  publicIdPrefix?: string;
  transformation?: object[];
}> = {
  'avatar':         { folder: 'avatars',         resourceType: 'image', localExt: 'jpg', transformation: [{ width: 200, height: 200, crop: 'fill' }] },
  'artwork':        { folder: 'artwork',          resourceType: 'image', localExt: 'jpg' },
  'poster':         { folder: 'plan-posters',     resourceType: 'image', localExt: 'jpg', transformation: [{ width: 800, height: 450, crop: 'fill' }] },
  'video':          { folder: 'plan-videos',      resourceType: 'video', localExt: 'mp4' },
  'plan-image':     { folder: 'plan-images',      resourceType: 'image', localExt: 'jpg', publicIdPrefix: 'plan-image-' },
  'plan-pdf':           { folder: 'plan-attachments',      resourceType: 'raw',   localExt: 'pdf', publicIdPrefix: 'plan-pdf-' },
  'therapist-file':     { folder: 'therapists',            resourceType: 'auto',  localExt: '' },
  'therapist-portrait': { folder: 'therapists/portraits',  resourceType: 'image', localExt: '' },
  'therapist-gallery':  { folder: 'therapists/gallery',    resourceType: 'image', localExt: '' },
  'therapist-cert':     { folder: 'therapists/certificates', resourceType: 'auto', localExt: '' },
  'therapist-qr':       { folder: 'therapists/qr-codes',   resourceType: 'image', localExt: '' },
  'user-portrait':      { folder: 'users/portraits',       resourceType: 'image', localExt: 'jpg' },
  'user-gallery':       { folder: 'users/gallery',         resourceType: 'image', localExt: 'jpg' },
};

export const uploadAsset = async (
  fileBuffer: Buffer,
  type: AssetType,
  id: string,
): Promise<string> => {
  const cfg = ASSET_CONFIG[type];
  logToFile(`[UploadService] uploadAsset type=${type} id=${id}`);

  const publicId = cfg.publicIdPrefix ? `${cfg.publicIdPrefix}${id}` : id;

  if (!isCloudinaryConfigured()) {
    const localFilename = type === 'therapist-file'
      ? id
      : `${publicId}.${cfg.localExt}`;
    return saveLocalFile(fileBuffer, cfg.folder, localFilename);
  }

  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          resource_type: cfg.resourceType,
          folder: cfg.folder,
          public_id: type === 'therapist-file' ? path.parse(id).name : publicId,
          overwrite: true,
          ...(cfg.transformation ? { transformation: cfg.transformation } : {}),
          ...(type === 'video' ? { quality: 'auto' } : {}),
        },
        (error, result) => {
          if (error || !result) {
            logToFile(`[UploadService] Cloudinary uploadAsset failed (${type}): ${error?.message}`);
            return reject(error ?? new Error('Upload failed'));
          }
          resolve(result.secure_url);
        },
      )
      .end(fileBuffer);
  });
};

/**
 * Deletes an asset from storage (Cloudinary or Local) based on its URL.
 */
export const deleteAsset = async (url: string | null | undefined): Promise<void> => {
  if (!url) return;
  logToFile(`[UploadService] deleteAsset: ${url}`);

  try {
    // 1. Local storage case
    if (url.includes('/uploads/')) {
      const urlPath = new URL(url).pathname; // e.g., /uploads/plan-images/plan-image-xxx.jpg
      const relativePath = urlPath.replace(/^\/uploads\//, '');
      const filePath = path.join(process.cwd(), 'uploads', relativePath);

      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
        logToFile(`[UploadService] Local file deleted: ${filePath}`);
      } else {
        logToFile(`[UploadService] Local file not found for deletion: ${filePath}`);
      }
      return;
    }

    // 2. Cloudinary case
    if (url.includes('cloudinary.com') && isCloudinaryConfigured()) {
      const parts = url.split('/');
      const fileNameWithExt = parts.pop();
      const folder = parts.pop();
      if (fileNameWithExt && folder) {
        const publicId = `${folder}/${fileNameWithExt.split('.')[0]}`;

        let resource_type: 'image' | 'video' | 'raw' = 'image';
        if (url.includes('/video/upload/')) resource_type = 'video';
        if (url.includes('/raw/upload/')) resource_type = 'raw';

        const result = await cloudinary.uploader.destroy(publicId, { resource_type });
        logToFile(`[UploadService] Cloudinary asset deleted (${resource_type}): ${publicId}. Result: ${result.result}`);
      }
      return;
    }
  } catch (err: any) {
    logToFile(`[UploadService] deleteAsset failed for ${url}: ${err.message}`);
  }
};
