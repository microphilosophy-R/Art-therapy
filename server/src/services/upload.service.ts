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

export const uploadAvatar = async (fileBuffer: Buffer, userId: string): Promise<string> => {
  logToFile(`[UploadService] uploadAvatar: ${userId}`);
  if (!isCloudinaryConfigured()) {
    return saveLocalFile(fileBuffer, 'avatars', `${userId}.jpg`);
  }
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        { folder: 'avatars', public_id: userId, overwrite: true, transformation: [{ width: 200, height: 200, crop: 'fill' }] },
        (error, result) => {
          if (error || !result) {
            logToFile(`[UploadService] Cloudinary uploadAvatar failed: ${error?.message}`);
            return reject(error ?? new Error('Upload failed'));
          }
          resolve(result.secure_url);
        }
      )
      .end(fileBuffer);
  });
};

export const uploadArtwork = async (fileBuffer: Buffer, noteId: string): Promise<string> => {
  logToFile(`[UploadService] uploadArtwork: ${noteId}`);
  if (!isCloudinaryConfigured()) {
    return saveLocalFile(fileBuffer, 'artwork', `${noteId}.jpg`);
  }
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        { folder: 'artwork', public_id: noteId, overwrite: true },
        (error, result) => {
          if (error || !result) {
            logToFile(`[UploadService] Cloudinary uploadArtwork failed: ${error?.message}`);
            return reject(error ?? new Error('Upload failed'));
          }
          resolve(result.secure_url);
        }
      )
      .end(fileBuffer);
  });
};

export const uploadPoster = async (fileBuffer: Buffer, planId: string): Promise<string> => {
  logToFile(`[UploadService] uploadPoster: ${planId}`);
  if (!isCloudinaryConfigured()) {
    return saveLocalFile(fileBuffer, 'plan-posters', `${planId}.jpg`);
  }
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder: 'plan-posters',
          public_id: planId,
          overwrite: true,
          transformation: [{ width: 800, height: 450, crop: 'fill' }],
        },
        (error, result) => {
          if (error || !result) {
            logToFile(`[UploadService] Cloudinary uploadPoster failed: ${error?.message}`);
            return reject(error ?? new Error('Upload failed'));
          }
          resolve(result.secure_url);
        }
      )
      .end(fileBuffer);
  });
};

export const uploadVideo = async (fileBuffer: Buffer, planId: string): Promise<string> => {
  logToFile(`[UploadService] uploadVideo: ${planId}`);
  if (!isCloudinaryConfigured()) {
    return saveLocalFile(fileBuffer, 'plan-videos', `${planId}.mp4`);
  }
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          resource_type: 'video',
          folder: 'plan-videos',
          public_id: planId,
          overwrite: true,
          quality: 'auto',
        },
        (error, result) => {
          if (error || !result) {
            logToFile(`[UploadService] Cloudinary uploadVideo failed: ${error?.message}`);
            return reject(error ?? new Error('Upload failed'));
          }
          resolve(result.secure_url);
        }
      )
      .end(fileBuffer);
  });
};

export const uploadPlanImage = async (fileBuffer: Buffer, imageId: string): Promise<string> => {
  logToFile(`[UploadService] uploadPlanImage: ${imageId}`);
  if (!isCloudinaryConfigured()) {
    return saveLocalFile(fileBuffer, 'plan-images', `plan-image-${imageId}.jpg`);
  }
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          resource_type: 'image',
          folder: 'plan-images',
          public_id: `plan-image-${imageId}`,
          overwrite: true,
        },
        (error, result) => {
          if (error || !result) {
            logToFile(`[UploadService] Cloudinary uploadPlanImage failed: ${error?.message}`);
            return reject(error ?? new Error('Upload failed'));
          }
          resolve(result.secure_url);
        }
      )
      .end(fileBuffer);
  });
};

export const uploadPdf = async (fileBuffer: Buffer, planId: string): Promise<string> => {
  logToFile(`[UploadService] uploadPdf: ${planId}`);
  if (!isCloudinaryConfigured()) {
    return saveLocalFile(fileBuffer, 'plan-attachments', `${planId}.pdf`);
  }
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          resource_type: 'raw',
          folder: 'plan-attachments',
          public_id: `plan-pdf-${planId}`,
          overwrite: true,
        },
        (error, result) => {
          if (error || !result) {
            logToFile(`[UploadService] Cloudinary uploadPdf failed: ${error?.message}`);
            return reject(error ?? new Error('Upload failed'));
          }
          resolve(result.secure_url);
        }
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
      // Basic public_id extraction for our known folders
      // Cloudinary URL: https://res.cloudinary.com/cloud_name/image/upload/v12345/folder/id.jpg
      // We extract the part after /upload/v[number]/ excluding the extension
      const parts = url.split('/');
      const fileNameWithExt = parts.pop();
      const folder = parts.pop();
      if (fileNameWithExt && folder) {
        const publicId = `${folder}/${fileNameWithExt.split('.')[0]}`;

        // Determine resource type
        let resource_type: "image" | "video" | "raw" = "image";
        if (url.includes('/video/upload/')) resource_type = "video";
        if (url.includes('/raw/upload/')) resource_type = "raw";

        const result = await cloudinary.uploader.destroy(publicId, { resource_type });
        logToFile(`[UploadService] Cloudinary asset deleted (${resource_type}): ${publicId}. Result: ${result.result}`);
      }
      return;
    }
  } catch (err: any) {
    logToFile(`[UploadService] deleteAsset failed for ${url}: ${err.message}`);
    // We don't throw here to avoid failing higher-level operations if cleanup fails
  }
};
