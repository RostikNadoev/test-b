// optimize-images.mjs
import imagemin from 'imagemin';
import imageminWebp from 'imagemin-webp';
import imageminMozjpeg from 'imagemin-mozjpeg';
import imageminPngquant from 'imagemin-pngquant';
import imageminSvgo from 'imagemin-svgo';
import fs from 'fs';
import path from 'path';

// Конфигурация
const CONFIG = {
  sourceDir: 'src/assets',
  outputDir: 'src/assets-optimized',
  quality: {
    jpeg: 80,
    png: [0.7, 0.9],
    webp: 75,
    svg: true
  }
};

async function optimizeImages() {
  console.log('🚀 Начинаем оптимизацию изображений...\n');
  
  // Создаем выходную директорию
  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
  }

  try {
    // 1. Оптимизируем JPEG
    console.log('🔄 Оптимизируем JPEG...');
    await imagemin([`${CONFIG.sourceDir}/**/*.{jpg,jpeg}`], {
      destination: CONFIG.outputDir,
      plugins: [
        imageminMozjpeg({
          quality: CONFIG.quality.jpeg,
          progressive: true
        })
      ]
    });

    // 2. Оптимизируем PNG
    console.log('🔄 Оптимизируем PNG...');
    await imagemin([`${CONFIG.sourceDir}/**/*.png`], {
      destination: CONFIG.outputDir,
      plugins: [
        imageminPngquant({
          quality: CONFIG.quality.png,
          speed: 4
        })
      ]
    });

    // 3. Оптимизируем SVG
    console.log('🔄 Оптимизируем SVG...');
    await imagemin([`${CONFIG.sourceDir}/**/*.svg`], {
      destination: CONFIG.outputDir,
      plugins: [
        imageminSvgo({
          plugins: [
            { name: 'removeViewBox', active: false },
            { name: 'removeDimensions', active: true }
          ]
        })
      ]
    });

    // 4. Конвертируем в WebP (из оптимизированных файлов)
    console.log('🔄 Конвертируем в WebP...');
    await imagemin([`${CONFIG.outputDir}/**/*.{jpg,jpeg,png}`], {
      destination: `${CONFIG.outputDir}/webp`,
      plugins: [
        imageminWebp({
          quality: CONFIG.quality.webp,
          method: 6
        })
      ]
    });

    console.log('\n✅ Оптимизация завершена!');
    console.log(`📁 Оптимизированные файлы: ${CONFIG.outputDir}`);
    console.log(`📁 WebP файлы: ${CONFIG.outputDir}/webp`);
    
  } catch (error) {
    console.error('❌ Ошибка при оптимизации:', error);
  }
}

optimizeImages();