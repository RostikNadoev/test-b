// components/MainScreen.jsx - обновленная версия с реферальным блоком
import MainLayout from './MainLayout';
// Импортируем изображения для кнопок
import gameCard1 from '../assets/MainPage/game-card-1.png';
import gameCard2 from '../assets/MainPage/ttmb.png';
import gameCard3 from '../assets/MainPage/cases.png';
import gameCard4 from '../assets/MainPage/pinkocard.png';

export default function MainScreen({ onNavigate, initialCardIndex = 2 }) {
  const handleImageButtonClick = (buttonNumber) => {
    console.log(`🎯 Image button ${buttonNumber} clicked`);
    
    if (buttonNumber === 1) {
      onNavigate('rocket'); // Бывшая вторая кнопка
    } else if (buttonNumber === 2) {
      onNavigate('plinko'); // Бывшая четвертая кнопка
    } else if (buttonNumber === 3) { 
      onNavigate('luckyballs'); // Бывшая первая кнопка
    } else if (buttonNumber === 4) {
      onNavigate('cases'); // Бывшая третья кнопка
    }
  };

  return (
    <MainLayout onNavigate={onNavigate} currentScreen="main">
      {/* Контейнер с кнопками-картинками */}
      <div className="banner-images-container">
        {/* Первая кнопка (ракета) */}
        <div 
          className="banner-image-button"
          onClick={() => handleImageButtonClick(1)}
          style={{ cursor: 'pointer' }}
        >
          <img 
            src={gameCard2} 
            alt="Rocket Game" 
            className="banner-image"
            loading="lazy"
          />
        </div>
        
        {/* Вторая кнопка (plinko) - без отрицательного margin */}
        <div 
          className="banner-image-button"
          onClick={() => handleImageButtonClick(2)}
          style={{ cursor: 'pointer' }}
        >
          <img 
            src={gameCard4} 
            alt="Plinko Game" 
            className="banner-image"
            loading="lazy"
          />
        </div>

        {/* Контейнер для двух квадратных кнопок рядом */}
        <div className="square-buttons-row">
          {/* Третья кнопка (luckyballs) - квадратная */}
          <div 
            className="banner-image-button square-button"
            onClick={() => handleImageButtonClick(3)}
            style={{ cursor: 'pointer' }}
          >
            <img 
              src={gameCard1} 
              alt="Lucky Balls Game" 
              className="banner-image square-image"
              loading="lazy"
            />
          </div>

          {/* Четвертая кнопка (cases) - квадратная */}
          <div 
            className="banner-image-button square-button"
            onClick={() => handleImageButtonClick(4)}
            style={{ cursor: 'pointer' }}
          >
            <img 
              src={gameCard3} 
              alt="Cases Game" 
              className="banner-image square-image"
              loading="lazy"
            />
          </div>
        </div>

        {/* Блок реферальной программы */}
        <div className="referral-block">
          <div className="referral-frame">
            <div className="referral-content">
              <div className="referral-text">
                Invite friends and earn
                <span className="referral-highlight">10%</span> <br />of their top-ups!
              </div>
            </div>
          </div>
          
          {/* Здесь будут две кнопки снизу (добавим позже) */}
        </div>
      </div>
    </MainLayout>
  );
}