import cloudinary from 'cloudinary';
import fs from 'node:fs/promises';
import { CLOUDINARY } from '../constants/index.js';
import { getEnvVar } from './getEnvVar.js';

cloudinary.v2.config({
  secure: true,
  cloud_name: getEnvVar(CLOUDINARY.CLOUD_NAME),
  api_key: getEnvVar(CLOUDINARY.API_KEY),
  api_secret: getEnvVar(CLOUDINARY.API_SECRET),
});

export const saveFileToCloudinary = async (file) => {
  const response = await cloudinary.v2.uploader.upload(file.path, {
    folder: 'images',
    use_filename: true,
  });
  await fs.unlink(file.path);
  return response.secure_url;
};
