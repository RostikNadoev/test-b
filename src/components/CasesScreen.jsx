import { useState } from 'react';
import '../styles/CasesScreen.css';
import Header from './Header';
import rocketBack from '../assets/Plinko/Back.png';
import CaseModal from './CaseModal';

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

const casesData = [
  {
    id: 1,
    image: firstCase,
    title: 'FREE',
    tonPrice: '150',
    starsPrice: '300'
  },
  {
    id: 2,
    image: secondCase,
    title: 'BASIC',
    tonPrice: '250',
    starsPrice: '500'
  },
  {
    id: 3,
    image: thirdCase,
    title: 'LADY',
    tonPrice: '350',
    starsPrice: '700'
  },
  {
    id: 4,
    image: fourthCase,
    title: 'STREETRACER',
    tonPrice: '450',
    starsPrice: '900'
  },
  {
    id: 5,
    image: fifthCase,
    title: 'BUSINESSMAN',
    tonPrice: '550',
    starsPrice: '1100'
  },
  {
    id: 6,
    image: sixthCase,
    title: 'CRYSTAL',
    tonPrice: '650',
    starsPrice: '1300'
  }
];

export default function CasesScreen({ onNavigate, currentCardIndex = 2 }) {
  const [selectedCase, setSelectedCase] = useState(null);

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
          <div className="cases-grid">
            {casesData.map((caseItem) => (
              <div 
                key={caseItem.id} 
                className="case-card"
                onClick={() => handleCaseClick(caseItem)}
              >
                <h3 className="case-title">{caseItem.title}</h3>
                
                <img 
                  src={caseItem.image} 
                  alt={caseItem.title}
                  className="case-image"
                />
                
                <div className="case-prices">
                  <div className="price-box ton-box">
                    <img src={tonIcon} alt="TON" className="price-icon" />
                    <span className="price-value ton-value">{caseItem.tonPrice}</span>
                  </div>
                  <div className="price-box stars-box">
                    <img src={starsIcon} alt="STARS" className="price-icon" />
                    <span className="price-value stars-value">{caseItem.starsPrice}</span>
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
          onNavigate={onNavigate} // Добавляем onNavigate
        />
      )}
    </>
  );
}