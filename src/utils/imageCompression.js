/**
 * Compresses an image file using HTML5 Canvas.
 * @param {File} file - The uploaded file object.
 * @param {Object} options - Compression options.
 * @param {number} options.maxWidth - Maximum width of the output image. Default 1200.
 * @param {number} options.quality - JPEG quality (0 to 1). Default 0.8.
 * @returns {Promise<File>} - A promise that resolves with the compressed File object.
 */
export const compressImage = async (file, { maxWidth = 1600, quality = 0.8 } = {}) => {
    // Only compress images
    if (!file.type.startsWith('image/')) return file;

    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Resize if larger than maxWidth
                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // Compress
                canvas.toBlob((blob) => {
                    if (!blob) {
                        // Fallback if compression fails (e.g. very explicit security policies)
                        resolve(file);
                        return;
                    }

                    // If compressed blob is LARGER than original (rare but possible for already opt images), return original
                    if (blob.size > file.size) {
                        resolve(file);
                        return;
                    }

                    const compressedFile = new File([blob], file.name, {
                        type: 'image/jpeg',
                        lastModified: Date.now(),
                    });
                    resolve(compressedFile);
                }, 'image/jpeg', quality);
            };
            img.onerror = (error) => reject(error);
        };
        reader.onerror = (error) => reject(error);
    });
};
