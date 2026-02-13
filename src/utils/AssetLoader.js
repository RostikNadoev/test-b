// utils/AssetLoader.js

export const preloadImages = (imageUrls) => {
    return new Promise((resolve) => {
      let loaded = 0;
      const total = imageUrls.length;
  
      if (total === 0) {
        resolve();
        return;
      }
  
      imageUrls.forEach((url) => {
        const img = new Image();
        img.onload = () => {
          loaded++;
          if (loaded === total) {
            resolve();
          }
        };
        img.onerror = () => {
          loaded++;
          if (loaded === total) {
            console.warn(`⚠️ Не удалось загрузить изображение: ${url}`);
            resolve(); // Продолжаем, даже если одна ошибка
          }
        };
        img.src = url;
      });
    });
  };