const cloudinary = require('cloudinary').v2;
const logger = require('./logger');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Uploads a file buffer directly to Cloudinary
 * @param {Buffer} fileBuffer - The buffer from multer req.file.buffer
 * @param {string} folderName - The target folder in Cloudinary
 * @returns {Promise<string>} - Returns the secure_url of the uploaded asset
 */
const uploadToCloudinary = (fileBuffer, folderName = 'general_uploads') => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            { folder: folderName, resource_type: 'auto' },
            (error, result) => {
                if (error) {
                    logger.error('Cloudinary upload failed', { error: error.message });
                    reject(error);
                } else {
                    resolve(result.secure_url);
                }
            }
        );
        stream.end(fileBuffer);
    });
};

module.exports = {
    cloudinary,
    uploadToCloudinary
};
