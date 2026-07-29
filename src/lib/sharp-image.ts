import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';

export interface ProcessedImageResult {
  largeUrl: string;
  mediumUrl: string;
  thumbnailUrl: string;
}

export async function processProductImage(
  inputBuffer: Buffer,
  filename: string
): Promise<ProcessedImageResult> {
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
  await fs.mkdir(uploadsDir, { recursive: true });

  const baseName = path.parse(filename).name.replace(/[^a-zA-Z0-9_-]/g, '_');
  const timestamp = Date.now();

  const largeFileName = `${baseName}_${timestamp}_large.webp`;
  const mediumFileName = `${baseName}_${timestamp}_med.webp`;
  const thumbFileName = `${baseName}_${timestamp}_thumb.webp`;

  // 1. Large image (detail produktu) - max 2000px
  await sharp(inputBuffer)
    .rotate() // Automatické otáčení dle EXIF orientace
    .resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 85 })
    .toFile(path.join(uploadsDir, largeFileName));

  // 2. Medium image (katalog produktů) - max 800px
  await sharp(inputBuffer)
    .rotate()
    .resize({ width: 800, height: 800, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 80 })
    .toFile(path.join(uploadsDir, mediumFileName));

  // 3. Thumbnail (košík / administrace) - max 300px
  await sharp(inputBuffer)
    .rotate()
    .resize({ width: 300, height: 300, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 75 })
    .toFile(path.join(uploadsDir, thumbFileName));

  return {
    largeUrl: `/uploads/${largeFileName}`,
    mediumUrl: `/uploads/${mediumFileName}`,
    thumbnailUrl: `/uploads/${thumbFileName}`,
  };
}
