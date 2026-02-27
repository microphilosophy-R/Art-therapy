import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const uploadAvatar = async (fileBuffer: Buffer, userId: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        { folder: 'avatars', public_id: userId, overwrite: true, transformation: [{ width: 200, height: 200, crop: 'fill' }] },
        (error, result) => {
          if (error || !result) return reject(error ?? new Error('Upload failed'));
          resolve(result.secure_url);
        }
      )
      .end(fileBuffer);
  });
};

export const uploadArtwork = async (fileBuffer: Buffer, noteId: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        { folder: 'artwork', public_id: noteId, overwrite: true },
        (error, result) => {
          if (error || !result) return reject(error ?? new Error('Upload failed'));
          resolve(result.secure_url);
        }
      )
      .end(fileBuffer);
  });
};

export const uploadPoster = async (fileBuffer: Buffer, planId: string): Promise<string> => {
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
          if (error || !result) return reject(error ?? new Error('Upload failed'));
          resolve(result.secure_url);
        }
      )
      .end(fileBuffer);
  });
};

export const uploadVideo = async (fileBuffer: Buffer, planId: string): Promise<string> => {
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
          if (error || !result) return reject(error ?? new Error('Upload failed'));
          resolve(result.secure_url);
        }
      )
      .end(fileBuffer);
  });
};

export const uploadPlanImage = async (fileBuffer: Buffer, imageId: string): Promise<string> => {
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
          if (error || !result) return reject(error ?? new Error('Upload failed'));
          resolve(result.secure_url);
        }
      )
      .end(fileBuffer);
  });
};

export const uploadPdf = async (fileBuffer: Buffer, planId: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          resource_type: 'raw',
          folder: 'plan-pdfs',
          public_id: `plan-pdf-${planId}`,
          overwrite: true,
        },
        (error, result) => {
          if (error || !result) return reject(error ?? new Error('Upload failed'));
          resolve(result.secure_url);
        }
      )
      .end(fileBuffer);
  });
};
