const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const assetsDir = path.join(__dirname, '../src/assets');
const outputDir = path.join(assetsDir, 'optimized');

// Create optimized directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Image files to optimize
const imageFiles = [
  '20230806_140516 (3).jpg',
  '20250510_111134.jpg',
  'DSC_1693~2 (2).JPG'
];

async function optimizeImages() {
  console.log('Starting image optimization...');
  
  for (const file of imageFiles) {
    const inputPath = path.join(assetsDir, file);
    const baseName = path.parse(file).name;
    
    try {
      // Skip if file doesn't exist
      if (!fs.existsSync(inputPath)) {
        console.log(`Skipping ${file} - file not found`);
        continue;
      }
      
      console.log(`Optimizing ${file}...`);
      
      // Create multiple sizes and formats
      const variants = [
        { suffix: '-thumb', width: 300, height: 300 },
        { suffix: '-small', width: 400, height: 400 },
        { suffix: '-medium', width: 600, height: 600 },
        { suffix: '-large', width: 800, height: 800 }
      ];
      
      for (const variant of variants) {
        // JPEG version with automatic orientation correction
        await sharp(inputPath)
          .rotate() // Automatically rotates based on EXIF orientation
          .resize(variant.width, variant.height, { 
            fit: 'cover',
            position: 'center'
          })
          .jpeg({ quality: 85, progressive: true })
          .toFile(path.join(outputDir, `${baseName}${variant.suffix}.jpg`));
        
        // WebP version with automatic orientation correction
        await sharp(inputPath)
          .rotate() // Automatically rotates based on EXIF orientation
          .resize(variant.width, variant.height, { 
            fit: 'cover',
            position: 'center'
          })
          .webp({ quality: 80 })
          .toFile(path.join(outputDir, `${baseName}${variant.suffix}.webp`));
      }
      
      console.log(`✓ Optimized ${file}`);
    } catch (error) {
      console.error(`Error optimizing ${file}:`, error.message);
    }
  }
  
  console.log('Image optimization complete!');
}

optimizeImages().catch(console.error);
