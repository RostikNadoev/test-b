import { useState, useEffect } from 'react';
import '../styles/CasesScreen.css';
import Header from './Header';
import rocketBack from '../assets/Plinko/Back.png';
import CaseModal from './CaseModal';
import { casesApi } from '../utils/api';

// Импортируем иконки
import tonIcon from '../assets/MainPage/cases/tonicon.png';
import starsIcon from '../assets/MainPage/cases/starsicon.png';

// Заглушки для изображений кейсов (бэк должен отдавать image_url)
import defaultCaseImage from '../assets/MainPage/cases/firstcasee.png';

export default function CasesScreen({ onNavigate, currentCardIndex = 2 }) {
  const [cases, setCases] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCase, setSelectedCase] = useState(null);

  // Загрузка кейсов с бэка
  useEffect(() => {
    const loadCases = async () => {
      try {
        setIsLoading(true);
        console.log('📦 Загрузка списка кейсов...');
        
        const casesData = await casesApi.getAllCases();
        console.log('✅ Загружены кейсы:', casesData);
        
        setCases(casesData);
      } catch (error) {
        console.error('❌ Ошибка загрузки кейсов:', error);
        // Заглушка на случай ошибки
        setCases([
          {
            id: 1,
            name: 'FREE',
            description: 'Free case',
            is_active: true,
            price: { ton: 2.0, stars: 0 },
            image_url: null
          },
          {
            id: 2,
            name: 'BASIC',
            description: 'Basic case',
            is_active: true,
            price: { ton: 5.0, stars: 0 },
            image_url: null
          },
          {
            id: 3,
            name: 'LADY',
            description: 'Lady case',
            is_active: true,
            price: { ton: 4.0, stars: 0 },
            image_url: null
          }
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    loadCases();
  }, []);

  const handleCaseClick = (caseItem) => {
    setSelectedCase(caseItem);
  };

  const handleCloseModal = () => {
    setSelectedCase(null);
  };

  // Получить URL изображения кейса
  const getCaseImage = (caseItem) => {
    if (caseItem.image_url) {
      if (caseItem.image_url.startsWith('/static/')) {
        return `https://shamefully-gifted-catbird.cloudpub.ru${caseItem.image_url}`;
      }
      return caseItem.image_url;
    }
    return defaultCaseImage;
  };

  if (isLoading) {
    return (
      <div className="cases-screen" style={{ backgroundImage: `url(${rocketBack})` }}>
        <Header onNavigate={onNavigate} variant="cases" />
        <div className="cases-loading">
          <div className="spinner"></div>
          <p>Loading cases...</p>
        </div>
      </div>
    );
  }

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
          <div className="cases-grid">
            {cases.filter(c => c.is_active).map((caseItem) => (
              <div 
                key={caseItem.id} 
                className="case-card"
                onClick={() => handleCaseClick(caseItem)}
              >
                <h3 className="case-title">{caseItem.name}</h3>
                
                <img 
                  src={getCaseImage(caseItem)} 
                  alt={caseItem.name}
                  className="case-image"
                  onError={(e) => {
                    e.target.src = defaultCaseImage;
                  }}
                />
                
                <div className="case-prices">
                  <div className="price-box ton-box">
                    <img src={tonIcon} alt="TON" className="price-icon" />
                    <span className="price-value ton-value">
                      {caseItem.price?.ton?.toFixed(2) || '0'}
                    </span>
                  </div>
                  <div className="price-box stars-box">
                    <img src={starsIcon} alt="STARS" className="price-icon" />
                    <span className="price-value stars-value">
                      {caseItem.price?.stars || '0'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>

      {selectedCase && (
        <CaseModal 
          caseItem={selectedCase} 
          onClose={handleCloseModal}
          onNavigate={onNavigate}
        />
      )}
    </>
  );
}