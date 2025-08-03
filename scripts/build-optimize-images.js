const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

/**
 * Build-time image optimization script
 * This script can be run as part of the build process to ensure
 * all images are optimized for production
 */

const config = {
  inputDir: path.join(__dirname, '../src/assets'),
  outputDir: path.join(__dirname, '../src/assets/optimized'),
  
  // Image quality settings
  jpegQuality: 85,
  webpQuality: 80,
  
  // Size variants to generate
  sizes: [
    { suffix: '-thumb', width: 300, height: 300 },
    { suffix: '-small', width: 400, height: 400 },
    { suffix: '-medium', width: 600, height: 600 },
    { suffix: '-large', width: 800, height: 800 }
  ],
  
  // File patterns to process
  patterns: ['*.jpg', '*.jpeg', '*.JPG', '*.JPEG', '*.png', '*.PNG']
};

async function optimizeForBuild() {
  console.log('🖼️  Starting build-time image optimization...');
  
  // Ensure output directory exists
  if (!fs.existsSync(config.outputDir)) {
    fs.mkdirSync(config.outputDir, { recursive: true });
  }
  
  // Get all image files
  const files = fs.readdirSync(config.inputDir)
    .filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.jpg', '.jpeg', '.png'].includes(ext);
    })
    .filter(file => !file.startsWith('.')); // Skip hidden files
  
  let totalSaved = 0;
  
  for (const file of files) {
    const inputPath = path.join(config.inputDir, file);
    const baseName = path.parse(file).name;
    
    try {
      console.log(`📐 Processing ${file}...`);
      
      // Get original file size
      const originalStats = fs.statSync(inputPath);
      const originalSize = originalStats.size;
      
      let variantSizes = 0;
      
      for (const size of config.sizes) {
        // Generate JPEG variant with orientation correction
        const jpegPath = path.join(config.outputDir, `${baseName}${size.suffix}.jpg`);
        await sharp(inputPath)
          .rotate() // Automatically rotates based on EXIF orientation
          .resize(size.width, size.height, { 
            fit: 'cover',
            position: 'center'
          })
          .jpeg({ 
            quality: config.jpegQuality, 
            progressive: true,
            mozjpeg: true 
          })
          .toFile(jpegPath);
        
        // Generate WebP variant with orientation correction
        const webpPath = path.join(config.outputDir, `${baseName}${size.suffix}.webp`);
        await sharp(inputPath)
          .rotate() // Automatically rotates based on EXIF orientation
          .resize(size.width, size.height, { 
            fit: 'cover',
            position: 'center'
          })
          .webp({ quality: config.webpQuality })
          .toFile(webpPath);
        
        // Calculate space saved
        const jpegStats = fs.statSync(jpegPath);
        const webpStats = fs.statSync(webpPath);
        variantSizes += jpegStats.size + webpStats.size;
      }
      
      const saved = originalSize - (variantSizes / config.sizes.length);
      totalSaved += saved;
      
      console.log(`✅ ${file}: ${formatBytes(originalSize)} → ~${formatBytes(variantSizes / config.sizes.length)} (${Math.round((saved / originalSize) * 100)}% saved)`);
      
    } catch (error) {
      console.error(`❌ Error processing ${file}:`, error.message);
    }
  }
  
  console.log(`\n🎉 Optimization complete!`);
  console.log(`💾 Total space saved: ~${formatBytes(totalSaved)}`);
  console.log(`📁 Optimized images saved to: ${config.outputDir}`);
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Run if called directly
if (require.main === module) {
  optimizeForBuild().catch(console.error);
}

module.exports = { optimizeForBuild, config };
