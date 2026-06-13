/**
 * Client-side image compression utility.
 * Compresses images before uploading to Cloudinary to save bandwidth and speed up uploads.
 */

export interface CompressOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.0 - 1.0
  mimeType?: string;
}

const DEFAULT_OPTIONS: Required<CompressOptions> = {
  maxWidth: 1920,
  maxHeight: 1920,
  quality: 0.8,
  mimeType: "image/jpeg",
};

/**
 * Compress an image file using Canvas API.
 * Returns a new File with reduced size.
 */
export async function compressImage(
  file: File,
  options: CompressOptions = {}
): Promise<File> {
  // Skip non-image files
  if (!file.type.startsWith("image/")) return file;
  
  // Skip small images (under 500KB)
  if (file.size < 500 * 1024) return file;

  // Skip GIFs (animation would be lost)
  if (file.type === "image/gif") return file;

  const opts = { ...DEFAULT_OPTIONS, ...options };

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(img.src);

      // Calculate new dimensions preserving aspect ratio
      let { width, height } = img;
      
      if (width > opts.maxWidth) {
        height = Math.round((height * opts.maxWidth) / width);
        width = opts.maxWidth;
      }
      if (height > opts.maxHeight) {
        width = Math.round((width * opts.maxHeight) / height);
        height = opts.maxHeight;
      }

      // Draw to canvas
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(file); // Fallback to original
        return;
      }

      // Use high quality rendering
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, width, height);

      // Convert to blob
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }

          // If compressed is larger than original, use original
          if (blob.size >= file.size) {
            resolve(file);
            return;
          }

          const compressedFile = new File(
            [blob],
            file.name.replace(/\.[^.]+$/, ".jpg"),
            { type: opts.mimeType, lastModified: Date.now() }
          );

          console.log(
            `[Compress] ${file.name}: ${formatBytes(file.size)} → ${formatBytes(compressedFile.size)} (${Math.round((1 - compressedFile.size / file.size) * 100)}% saved)`
          );

          resolve(compressedFile);
        },
        opts.mimeType,
        opts.quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      resolve(file); // Fallback to original on error
    };

    img.src = URL.createObjectURL(file);
  });
}

/**
 * Format bytes to human readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

/**
 * Get Cloudinary optimized URL for an image.
 * Applies automatic quality/format and width constraints.
 */
export function getOptimizedImageUrl(
  url: string,
  width?: number
): string {
  if (!url || !url.includes("res.cloudinary.com")) return url;

  // Cloudinary URL format: .../upload/v123/image.jpg
  // Insert transformation after /upload/
  const transforms = ["f_auto", "q_auto"];
  if (width) transforms.push(`w_${width}`);

  return url.replace(
    "/upload/",
    `/upload/${transforms.join(",")}/`
  );
}
