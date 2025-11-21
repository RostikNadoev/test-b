// components/CardScreen.jsx
import '../styles/CardScreen.css';
import Header from './Header';
import foot from '../assets/MainPage/foot.png';
import footover from '../assets/MainPage/foot-on.svg';
import closeIcon from '../assets/MainPage/close.svg';

export default function CardScreen({ 
  children, 
  onNavigate, 
  cardData,
  cardImage,
  cardMainImage,
  cardTonImage,
  currentCardIndex = 2
}) {
  
  const handleClose = () => {
    onNavigate('main', currentCardIndex);
  };

  return (
    <div className="card-screen">
      {/* Используем компонент Header */}
      <Header onNavigate={onNavigate}  />

      {/* Контент карточки */}
      <main className="card-content">
        {children}
      </main>

      {/* Футер с кнопкой CLOSE */}
      <footer className="card-footer">
        <div className="footer-close-container">
          <div className="footer-close-item" onClick={handleClose}>
            <div className="footer-close-indicator"></div>
            <div className="footer-close-wrapper">
              <img src={foot} alt="block" className="footer-close-block"/>
              <img src={closeIcon} alt="CLOSE" className="footer-close-icon"/>
              <img src={footover} alt="decoration" className="footer-close-overlay"/>
            </div>
            <span className="footer-close-label">CLOSE</span>
          </div>
        </div>
      </footer>
    </div>
  );
}