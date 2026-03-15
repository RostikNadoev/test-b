import { useState, useEffect } from 'react';
import '../styles/CasesScreen.css';
import Header from './Header';
import rocketBack from '../assets/Plinko/Back.png';
import CaseModal from './CaseModal';
import { casesApi } from '../utils/api';
import { useDemo } from '../contexts/DemoContext';

// Импортируем иконки
import tonIcon from '../assets/MainPage/cases/tonicon.png';
import starsIcon from '../assets/MainPage/cases/starsicon.png';

// Импортируем изображения кейсов
import firstCase from '../assets/MainPage/cases/firstcase1.png';
import secondCase from '../assets/MainPage/cases/secondcase1.png';
import thirdCase from '../assets/MainPage/cases/thirdcase1.png';
import fourthCase from '../assets/MainPage/cases/fourthcase1.png';
import fifthCase from '../assets/MainPage/cases/fifthcase.png';
import sixthCase from '../assets/MainPage/cases/sixthcase.png';

// Маппинг ID кейсов к изображениям
const caseImages = {
  1: firstCase,
  2: secondCase,
  3: thirdCase,
  4: fourthCase,
  5: fifthCase,
  6: sixthCase
};

// Демо-цены для кейсов (когда API не работает)
const DEMO_CASE_PRICES = {
  1: { ton: 0, stars: 0 }, // FREE
  2: { ton: 1, stars: 100 },
  3: { ton: 3, stars: 300 },
  4: { ton: 5, stars: 500 },
  5: { ton: 10, stars: 1000 },
  6: { ton: 15, stars: 1500 }
};

// Функция для предзагрузки изображений
const preloadImages = (imageUrls) => {
  return Promise.all(
    imageUrls.map((url) => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = url;
        img.onload = resolve;
        img.onerror = reject;
      });
    })
  );
};

export default function CasesScreen({ onNavigate }) {
  const [selectedCase, setSelectedCase] = useState(null);
  const [cases, setCases] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const { isDemoMode } = useDemo();

  // Загружаем список кейсов с бэкенда и изображения
  useEffect(() => {
    const loadCasesAndImages = async () => {
      try {
        setIsLoading(true);
        setLoadingProgress(10);
        
        console.log('📦 Загрузка списка кейсов...');
        
        // Загружаем данные кейсов
        const casesData = await casesApi.getAllCases();
        console.log('✅ Кейсы загружены:', casesData);
        
        setCases(casesData);
        setLoadingProgress(50);
        
        // Предзагружаем все изображения кейсов
        console.log('🖼️ Предзагрузка изображений кейсов...');
        const imageUrls = Object.values(caseImages);
        
        // Обновляем прогресс по мере загрузки изображений
        const totalImages = imageUrls.length;
        let loadedCount = 0;
        
        await Promise.all(
          imageUrls.map((url) => {
            return new Promise((resolve, reject) => {
              const img = new Image();
              img.src = url;
              img.onload = () => {
                loadedCount++;
                setLoadingProgress(50 + Math.floor((loadedCount / totalImages) * 50));
                resolve();
              };
              img.onerror = reject;
            });
          })
        );
        
        setImagesLoaded(true);
        setLoadingProgress(100);
        console.log('✅ Все изображения загружены');
        
      } catch (error) {
        console.error('❌ Ошибка загрузки кейсов, используем демо-цены:', error);
        
        // В случае ошибки используем заглушки с демо-ценами
        const demoCases = [
          { id: 1, name: 'FREE', price: DEMO_CASE_PRICES[1] },
          { id: 2, name: 'BASIC', price: DEMO_CASE_PRICES[2] },
          { id: 3, name: 'LADY', price: DEMO_CASE_PRICES[3] },
          { id: 4, name: 'STREETRACER', price: DEMO_CASE_PRICES[4] },
          { id: 5, name: 'BUSINESSMAN', price: DEMO_CASE_PRICES[5] },
          { id: 6, name: 'CRYSTAL', price: DEMO_CASE_PRICES[6] }
        ];
        
        setCases(demoCases);
        setLoadingProgress(50);
        
        // Даже при ошибке API пробуем загрузить изображения
        try {
          const imageUrls = Object.values(caseImages);
          await preloadImages(imageUrls);
          setImagesLoaded(true);
          setLoadingProgress(100);
        } catch (imgError) {
          console.error('❌ Ошибка загрузки изображений:', imgError);
          setImagesLoaded(true); // Все равно показываем контент, даже если картинки не загрузились
          setLoadingProgress(100);
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    loadCasesAndImages();
  }, []);

  const handleCaseClick = (caseItem) => {
    setSelectedCase(caseItem);
  };

  const handleCloseModal = () => {
    setSelectedCase(null);
  };

  // Функция для получения класса изображения в зависимости от ID кейса
  const getCaseImageClass = (caseId) => {
    switch(caseId) {
      case 1: return 'case-image case-image-1';
      case 2: return 'case-image case-image-2';
      case 3: return 'case-image case-image-3';
      case 4: return 'case-image case-image-4';
      case 5: return 'case-image case-image-5';
      case 6: return 'case-image case-image-6';
      default: return 'case-image';
    }
  };

  // Функция для получения цены (из API или демо)
  const getCasePrice = (caseItem) => {
    // Если есть price из API
    if (caseItem.price?.ton !== undefined) {
      return caseItem.price;
    }
    // Если есть отдельные поля price_ton/price_stars из API
    if (caseItem.price_ton !== undefined) {
      return {
        ton: caseItem.price_ton,
        stars: caseItem.price_stars
      };
    }
    // Иначе используем демо-цены
    return DEMO_CASE_PRICES[caseItem.id] || { ton: 0, stars: 0 };
  };

  return (
    <>
      <div 
        className="cases-screen"
        style={{
          backgroundImage: `url(${rocketBack})`,
          backgroundSize: '100% 100%',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center'
        }}
      >
        <Header onNavigate={onNavigate} variant="cases" />

        <main className="cases-content">
          {isLoading || !imagesLoaded ? (
            <div className="cases-loading">
              <div className="spinner"></div>
              <div className="loading-progress">
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${loadingProgress}%` }}
                  ></div>
                </div>
                <p>
                  {loadingProgress < 50 
                    ? 'Loading cases data...' 
                    : loadingProgress < 100 
                    ? 'Loading images...' 
                    : 'Ready!'}
                </p>
                <p className="progress-text">{loadingProgress}%</p>
              </div>
            </div>
          ) : (
            <div className="cases-grid">
              {cases.map((caseItem) => {
                const price = getCasePrice(caseItem);
                const isFreeCase = caseItem.id === 1;
                
                return (
                  <div 
                    key={caseItem.id} 
                    className="case-card"
                    onClick={() => handleCaseClick(caseItem)}
                  >
                    <h3 className="case-title">{caseItem.name}</h3>
                    
                    <img 
                      src={caseImages[caseItem.id] || firstCase} 
                      alt={caseItem.name}
                      className={getCaseImageClass(caseItem.id)}
                      loading="lazy"
                      decoding="async"
                    />
                    
                    {isFreeCase ? (
                      // Для первого кейса одна кнопка FREE
                      <div className="case-price-single free-box">
                        <span className="price-value free-value">
                          FREE
                        </span>
                      </div>
                    ) : (
                      // Для остальных кейсов две кнопки
                      <div className="case-prices">
                        <div className="price-box ton-box">
                          <img src={tonIcon} alt="TON" className="price-icon" />
                          <span className="price-value ton-value">
                            {price.ton}
                          </span>
                        </div>
                        <div className="price-box stars-box">
                          <img src={starsIcon} alt="STARS" className="price-icon" />
                          <span className="price-value stars-value">
                            {price.stars}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {selectedCase && (
        <CaseModal 
          caseItem={selectedCase} 
          onClose={handleCloseModal}
          onNavigate={onNavigate}
          // Передаем статус бесплатного кейса, если это первый кейс
          freeCaseStatus={selectedCase.id === 1 ? {
            eligible: selectedCase.free_case_eligible_today || false,
            opened: selectedCase.free_case_opened_today || false,
            available: selectedCase.free_case_available_today || false
          } : null}
        />
      )}
    </>
  );
}