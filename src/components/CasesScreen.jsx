import { useState, useEffect } from 'react';
import '../styles/CasesScreen.css';
import Header from './Header';
import rocketBack from '../assets/Plinko/Back.png';
import CaseModal from './CaseModal';
import { casesApi } from '../utils/api';

// Импортируем иконки
import tonIcon from '../assets/MainPage/cases/tonicon.png';
import starsIcon from '../assets/MainPage/cases/starsicon.png';

// Импортируем изображения кейсов
import firstCase from '../assets/MainPage/cases/firstcasee.png';
import secondCase from '../assets/MainPage/cases/secondcasee.png';
import thirdCase from '../assets/MainPage/cases/thirdcasee.png';
import fourthCase from '../assets/MainPage/cases/fourthcasee.png';
import fifthCase from '../assets/MainPage/cases/fifthcasee.png';
import sixthCase from '../assets/MainPage/cases/esixthcase.png';

// Маппинг ID кейсов к изображениям
const caseImages = {
  1: firstCase,
  2: secondCase,
  3: thirdCase,
  4: fourthCase,
  5: fifthCase,
  6: sixthCase
};

export default function CasesScreen({ onNavigate }) {
  const [selectedCase, setSelectedCase] = useState(null);
  const [cases, setCases] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Загружаем список кейсов с бэкенда
  useEffect(() => {
    const loadCases = async () => {
      try {
        setIsLoading(true);
        console.log('📦 Загрузка списка кейсов...');
        
        const casesData = await casesApi.getAllCases();
        console.log('✅ Кейсы загружены:', casesData);
        
        setCases(casesData);
      } catch (error) {
        console.error('❌ Ошибка загрузки кейсов:', error);
        // В случае ошибки используем заглушки
        setCases([
          { id: 1, name: 'FREE', price: { ton: 2, stars: 200 } },
          { id: 2, name: 'BASIC', price: { ton: 5, stars: 500 } },
          { id: 3, name: 'LADY', price: { ton: 10, stars: 1000 } },
          { id: 4, name: 'STREETRACER', price: { ton: 20, stars: 2000 } },
          { id: 5, name: 'BUSINESSMAN', price: { ton: 50, stars: 5000 } },
          { id: 6, name: 'CRYSTAL', price: { ton: 100, stars: 10000 } }
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
          {isLoading ? (
            <div className="cases-loading">
              <div className="spinner"></div>
              <p>Loading cases...</p>
            </div>
          ) : (
            <div className="cases-grid">
              {cases.map((caseItem) => (
                <div 
                  key={caseItem.id} 
                  className="case-card"
                  onClick={() => handleCaseClick(caseItem)}
                >
                  <h3 className="case-title">{caseItem.name}</h3>
                  
                  <img 
                    src={caseImages[caseItem.id] || firstCase} 
                    alt={caseItem.name}
                    className="case-image"
                  />
                  
                  <div className="case-prices">
                    <div className="price-box ton-box">
                      <img src={tonIcon} alt="TON" className="price-icon" />
                      <span className="price-value ton-value">
                        {caseItem.price?.ton || caseItem.price_ton || '0'}
                      </span>
                    </div>
                    <div className="price-box stars-box">
                      <img src={starsIcon} alt="STARS" className="price-icon" />
                      <span className="price-value stars-value">
                        {caseItem.price?.stars || caseItem.price_stars || '0'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
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