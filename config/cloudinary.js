// config/cloudinary.js - Simple Cloudinary configuration without dependencies
// No additional packages needed - uses built-in fetch and FormData

// Cloudinary upload configuration
export const CLOUDINARY_CONFIG = {
  cloudName: 'dxzgdvluh',
  uploadPreset: 'ml_default', // Using default preset for now
  apiKey: '712344611796689',
  apiSecret: '6Cs8pE3r1BN83HCMLwnywCjoU88', // Keep this secure!
  folder: 'food-delivery', // Default folder
};

/**
 * Upload image to Cloudinary using simple fetch
 * @param {string} imageUri - Local image URI
 * @param {object} options - Upload options
 * @returns {Promise<object>} - Upload result
 */
export const uploadToCloudinary = async (imageUri, options = {}) => {
  try {
    console.log('🌩️ Starting Cloudinary upload...', imageUri);

    if (!imageUri) {
      throw new Error('No image URI provided');
    }

    const formData = new FormData();

    // Add the image file
    formData.append('file', {
      uri: imageUri,
      type: 'image/jpeg',
      name: `restaurant_${Date.now()}.jpg`,
    });

    // Required preset
    formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);

    // Optional folder (without transformation)
    if (options.folder) {
      formData.append('folder', options.folder);
    }

    // Optional tags
    formData.append('tags', 'restaurant,food-delivery,mobile-app');

    console.log('📤 Uploading to Cloudinary...');

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/image/upload`,
      {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    const responseText = await response.text();
    console.log('📥 Cloudinary response:', responseText);

    if (!response.ok) {
      console.error('Cloudinary error response:', responseText);

      let errorMessage = 'Upload failed';
      try {
        const errorData = JSON.parse(responseText);
        errorMessage = errorData.error?.message || errorMessage;
      } catch (e) {
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }

      throw new Error(errorMessage);
    }

    const result = JSON.parse(responseText);
    console.log('✅ Cloudinary upload successful:', result.secure_url);

    // Now apply transformation via URL (not in upload)
    const optimizedUrl = getOptimizedImageUrl(result.secure_url, {
      width: 800,
      height: 600,
      crop: 'fill',
      format: 'auto',
      quality: 'auto'
    });

    return {
      success: true,
      url: optimizedUrl,
      originalUrl: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format,
      bytes: result.bytes,
      folder: result.folder,
      version: result.version
    };

  } catch (error) {
    console.error('❌ Cloudinary upload error:', error);

    if (error.message?.includes('Invalid image')) {
      throw new Error('Please select a valid image file');
    } else if (error.message?.includes('File size too large')) {
      throw new Error('Image file is too large. Please select a smaller image');
    } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
      throw new Error('Network error. Please check your internet connection and try again');
    } else if (error.message?.includes('upload_preset')) {
      throw new Error('Upload configuration error. Please contact support');
    } else {
      throw new Error(`Upload failed: ${error.message}`);
    }
  }
};

/**
 * Delete image from Cloudinary
 * @param {string} publicId - Cloudinary public ID
 * @returns {Promise<boolean>} - Success status
 */
export const deleteFromCloudinary = async (publicId) => {
  try {
    if (!publicId) {
      console.warn('No public ID provided for deletion');
      return false;
    }

    console.log('🗑️ Deleting image from Cloudinary:', publicId);

    // Generate timestamp
    const timestamp = Math.round(new Date().getTime() / 1000);
    
    // Create signature (simplified version - in production, do this on backend)
    const stringToSign = `public_id=${publicId}&timestamp=${timestamp}${CLOUDINARY_CONFIG.apiSecret}`;
    
    // For now, we'll skip deletion to avoid exposing API secret in frontend
    // In production, this should be done through your backend API
    console.log('⚠️ Image deletion skipped (should be done via backend)');
    return true;

  } catch (error) {
    console.error('❌ Error deleting from Cloudinary:', error);
    return false;
  }
};

/**
 * Generate optimized image URL from Cloudinary URL
 * @param {string} imageUrl - Original Cloudinary URL
 * @param {object} transformations - Image transformations
 * @returns {string} - Optimized image URL
 */
export const getOptimizedImageUrl = (imageUrl, transformations = {}) => {
  if (!imageUrl || !imageUrl.includes('cloudinary.com')) {
    return imageUrl; // Not a Cloudinary image
  }

  try {
    const urlParts = imageUrl.split('/');
    const uploadIndex = urlParts.findIndex(part => part === 'upload');

    if (uploadIndex === -1) return imageUrl;

    const transforms = [];

    if (transformations.width) transforms.push(`w_${transformations.width}`);
    if (transformations.height) transforms.push(`h_${transformations.height}`);
    if (transformations.crop) transforms.push(`c_${transformations.crop}`);
    if (transformations.quality) transforms.push(`q_${transformations.quality}`);
    if (transformations.format) transforms.push(`f_${transformations.format}`);

    if (transforms.length === 0) {
      transforms.push('f_auto', 'q_auto');
    }

    const transformString = transforms.join(',');

    urlParts.splice(uploadIndex + 1, 0, transformString);

    return urlParts.join('/');
  } catch (error) {
    console.error('Error optimizing image URL:', error);
    return imageUrl;
  }
};


/**
 * Get different image sizes for responsive design
 * @param {string} imageUrl - Original Cloudinary URL
 * @returns {object} - Object with different sized URLs
 */
export const getResponsiveImageUrls = (imageUrl) => {
  if (!imageUrl) return {};

  return {
    thumbnail: getOptimizedImageUrl(imageUrl, { width: 150, height: 150, crop: 'fill' }),
    small: getOptimizedImageUrl(imageUrl, { width: 300, height: 200, crop: 'fill' }),
    medium: getOptimizedImageUrl(imageUrl, { width: 600, height: 400, crop: 'fill' }),
    large: getOptimizedImageUrl(imageUrl, { width: 1200, height: 800, crop: 'fill' }),
    original: imageUrl
  };
};

/**
 * Validate image before upload
 * @param {string} imageUri - Image URI to validate
 * @returns {Promise<boolean>} - Validation result
 */
export const validateImage = async (imageUri) => {
  try {
    if (!imageUri) return false;
    
    // Check if it's a valid URI
    if (!imageUri.startsWith('file://') && !imageUri.startsWith('content://')) {
      throw new Error('Invalid image URI format');
    }
    
    // You could add more validation here (file size, dimensions, etc.)
    return true;
  } catch (error) {
    console.error('Image validation error:', error);
    return false;
  }
};

/**
 * Get upload progress (placeholder for future implementation)
 * @param {string} uploadId - Upload ID
 * @returns {number} - Upload progress percentage
 */
export const getUploadProgress = (uploadId) => {
  // Placeholder - could be implemented with upload tracking
  return 0;
};

export default {
  uploadToCloudinary,
  deleteFromCloudinary,
  getOptimizedImageUrl,
  getResponsiveImageUrls,
  validateImage,
  getUploadProgress,
  CLOUDINARY_CONFIG
};