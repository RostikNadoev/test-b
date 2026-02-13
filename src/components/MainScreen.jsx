// components/MainScreen.jsx - обновленная версия
import MainLayout from './MainLayout';
// Импортируем изображения для кнопок
import gameCard1 from '../assets/MainPage/game-card-1.png';
import gameCard2 from '../assets/MainPage/ttmb.png';
import gameCard3 from '../assets/MainPage/cases.png';

export default function MainScreen({ onNavigate, initialCardIndex = 2 }) {
  const handleImageButtonClick = (buttonNumber) => {
    console.log(`🎯 Image button ${buttonNumber} clicked`);
    
    if (buttonNumber === 1) {
      onNavigate('luckyballs');
    } else if (buttonNumber === 2) {
      onNavigate('rocket');
    } else if (buttonNumber === 3) {
      onNavigate('cases');
    } else if (buttonNumber === 4) {
      onNavigate('plinko'); // Новая навигация на Plinko
    }
  };

  return (
    <MainLayout onNavigate={onNavigate} currentScreen="main">
      {/* Контейнер с кнопками-картинками */}
      <div className="banner-images-container">
        <div 
          className="banner-image-button"
          onClick={() => handleImageButtonClick(1)}
          style={{ cursor: 'pointer' }}
        >
          <img 
            src={gameCard1} 
            alt="Game Card 1" 
            className="banner-image"
            loading="lazy"
          />
        </div>
        
        <div 
          className="banner-image-button button-2"
          onClick={() => handleImageButtonClick(2)}
          style={{ cursor: 'pointer' }}
        >
          <img 
            src={gameCard2} 
            alt="Game Card 2" 
            className="banner-image"
            loading="lazy"
          />
        </div>

        <div 
          className="banner-image-button button-3"
          onClick={() => handleImageButtonClick(3)}
          style={{ cursor: 'pointer' }}
        >
          <img 
            src={gameCard3} 
            alt="Game Card 3" 
            className="banner-image"
            loading="lazy"
          />
        </div>

        {/* Новая 4-я кнопка */}
        <div 
          className="banner-image-button button-4"
          onClick={() => handleImageButtonClick(4)}
          style={{ cursor: 'pointer' }}
        >
          <img 
            src={gameCard3} 
            alt="Plinko Game" 
            className="banner-image"
            loading="lazy"
          />
        </div>
      </div>
    </MainLayout>
  );
}