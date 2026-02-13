// replace-imports.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Функция для замены импортов в одном файле
function replaceImportsInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Заменяем импорты PNG/JPG на WebP
    content = content.replace(
      /from\s+['"]\.\.\/assets\/(.+\.(png|jpg|jpeg))['"]/g,
      (match, imagePath, ext) => {
        const newPath = `../assets-optimized/webp/${imagePath.replace(/\.(png|jpg|jpeg)$/, '.webp')}`;
        console.log(`🔄 ${path.basename(imagePath)} → ${path.basename(newPath)}`);
        modified = true;
        return `from '${newPath}'`;
      }
    );
    
    // Заменяем импорты SVG
    content = content.replace(
      /from\s+['"]\.\.\/assets\/(.+\.svg)['"]/g,
      (match, imagePath) => {
        const newPath = `../assets-optimized/${imagePath}`;
        console.log(`🔄 ${path.basename(imagePath)} → ${path.basename(newPath)}`);
        modified = true;
        return `from '${newPath}'`;
      }
    );
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      return true;
    }
    return false;
  } catch (error) {
    console.error(`❌ Ошибка в файле ${filePath}:`, error.message);
    return false;
  }
}

// Основная функция
async function main() {
  console.log('🔍 Ищем файлы для обновления импортов...\n');
  
  const extensions = ['.js', '.jsx'];
  const files = [];
  
  // Ищем все JS/JSX файлы в src
  function scanDirectory(dir) {
    if (!fs.existsSync(dir)) return;
    
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        scanDirectory(fullPath);
      } else if (extensions.includes(path.extname(item))) {
        files.push(fullPath);
      }
    }
  }
  
  scanDirectory('src');
  
  console.log(`📁 Найдено файлов: ${files.length}\n`);
  
  let updatedCount = 0;
  
  for (const file of files) {
    if (replaceImportsInFile(file)) {
      updatedCount++;
    }
  }
  
  console.log(`\n🎉 Готово! Обновлено файлов: ${updatedCount}/${files.length}`);
}

main();