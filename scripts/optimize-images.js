const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Path to your top-right.ts file
const configPath = path.join(__dirname, '../src/app/components/top-right/top-right.ts');

// Read and parse imageConfigs from the TypeScript file
const tsContent = fs.readFileSync(configPath, 'utf8');
const imageConfigsMatch = tsContent.match(/imageConfigs\s*=\s*\[(.*?)\];/s);
if (!imageConfigsMatch) {
  console.error('Could not find imageConfigs in top-right.ts');
  process.exit(1);
}
const imageConfigsRaw = '[' + imageConfigsMatch[1] + ']';
const imageConfigs = eval(imageConfigsRaw.replace(/baseName:/g, '"baseName":').replace(/alt:/g, '"alt":').replace(/originalFile:/g, '"originalFile":'));

// Sizes and formats to generate
const sizes = [
  { name: 'small', width: 400 },
  { name: 'medium', width: 600 },
  { name: 'large', width: 800 },
  { name: 'thumb', width: 200 }
];
const formats = ['jpg', 'webp'];

const inputDir = path.join(__dirname, '../src/assets');
const outputDir = path.join(__dirname, '../src/assets/optimized');

if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

console.log('Starting image optimization...');
imageConfigs.forEach(config => {
  const inputFile = path.join(inputDir, config.originalFile);
  if (!fs.existsSync(inputFile)) {
    console.log(`Skipping ${config.originalFile} - file not found`);
    return;
  }
  sizes.forEach(size => {
    formats.forEach(format => {
      const outputFile = path.join(outputDir, `${config.baseName}-${size.name}.${format}`);
      sharp(inputFile)
        .rotate() // <-- This auto-orients based on EXIF
        .resize(size.width)
        .toFormat(format)
        .toFile(outputFile)
        .then(() => {
          console.log(`Created ${outputFile}`);
        })
        .catch(err => {
          console.error(`Error processing ${outputFile}:`, err.message);
        });
    });
  });
});
console.log('Image optimization complete!');

