/**
 * src/services/image.service.js
 * Image optimization service for Cloudinary
 */

class ImageService {
    /**
     * Get optimized image URL with Cloudinary transformations
     * @param {string} url - Original Cloudinary URL
     * @param {Object} options - Transformation options
     * @returns {string} - Optimized URL
     */
    getOptimizedUrl(url, options = {}) {
        if (!url || !url.includes('cloudinary.com')) {
            return url;
        }

        const {
            width,
            height,
            quality = 'auto',
            format = 'auto',
            crop = 'fill',
        } = options;

        // Split URL to inject transformations
        // Example: https://res.cloudinary.com/[cloud]/image/upload/v123/[path]
        // Target: https://res.cloudinary.com/[cloud]/image/upload/w_300,h_200,c_fill,q_auto,f_auto/v123/[path]

        const parts = url.split('/upload/');
        if (parts.length !== 2) {
            return url;
        }

        const transformations = [];
        if (width) transformations.push(`w_${width}`);
        if (height) transformations.push(`h_${height}`);
        if (crop) transformations.push(`c_${crop}`);
        if (quality) transformations.push(`q_${quality}`);
        if (format) transformations.push(`f_${format}`);

        const transformationString = transformations.join(',');

        return `${parts[0]}/upload/${transformationString}/${parts[1]}`;
    }

    /**
     * Get thumbnail URL
     */
    getThumbnailUrl(url) {
        return this.getOptimizedUrl(url, { width: 200, height: 200 });
    }

    /**
     * Get banner URL
     */
    getBannerUrl(url) {
        return this.getOptimizedUrl(url, { width: 800, height: 400 });
    }
}

module.exports = new ImageService();
