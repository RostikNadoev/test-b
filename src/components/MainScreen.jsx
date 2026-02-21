// components/MainScreen.jsx - с исправленной информационной модалкой
import { useState } from 'react';
import MainLayout from './MainLayout';
// Импортируем изображения для кнопок
import gameCard1 from '../assets/MainPage/game-card-1.png';
import gameCard2 from '../assets/MainPage/ttmb.png';
import gameCard3 from '../assets/MainPage/cases.png';
import gameCard4 from '../assets/MainPage/pinkocard.png';
// Импортируем изображения для новых кнопок
import inviteBg from '../assets/MainPage/invite.png';
import linkIcon from '../assets/MainPage/link.svg';
// Импортируем иконку замка
import lockIcon from '../assets/MainPage/lock.svg';

export default function MainScreen({ onNavigate, initialCardIndex = 2 }) {
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);

  const handleImageButtonClick = (buttonNumber) => {
    console.log(`🎯 Image button ${buttonNumber} clicked`);
    
    if (buttonNumber === 1) {
      onNavigate('rocket');
    } else if (buttonNumber === 2) {
      onNavigate('plinko');
    } else if (buttonNumber === 3) { 
      onNavigate('luckyballs');
    } else if (buttonNumber === 4) {
      onNavigate('cases');
    }
  };

  const handleInviteClick = () => {
    console.log('Invite button clicked');
    // Добавить логику для инвайта
  };

  const handleLinkClick = () => {
    console.log('Link button clicked');
    // Добавить логику для копирования ссылки
  };

  const openInfoModal = () => {
    setIsInfoModalOpen(true);
  };

  const closeInfoModal = () => {
    setIsInfoModalOpen(false);
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      closeInfoModal();
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
        
        {/* Вторая кнопка (plinko) */}
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
        
              {/* Верхний ряд с надписями (дата и Invited) */}
              <div className="referral-stats-header">
                <div className="inf_date_container">
                  <span className="referral-date-label">
                    You’ll get <span className="referral-date-value">25.08.2026</span>
                  </span>
                  {/* Кнопка с вопросиком - чуть больше */}
                  <div 
                    className="inf_info_button"
                    onClick={openInfoModal}
                    role="button"
                    tabIndex={0}
                    aria-label="Information"
                  >
                    ?
                  </div>
                </div>
                <span className="referral-invited-text">Invited</span>
              </div>
              
              {/* Нижний ряд с полями и числами */}
              <div className="referral-stats-values">
                <div className="referral-stat-field">
                  <span className="referral-stat-number">10 ton</span>
                </div>
                <div className="referral-stat-field">
                  <span className="referral-stat-number">10</span>
                </div>
              </div>
            </div>
          </div>

          {/* Две кнопки под реферальным блоком */}
          <div className="referral-buttons-row">
            {/* Левая кнопка с фоном и надписью INVITE */}
            <div 
              className="referral-button invite-button"
              onClick={handleInviteClick}
              style={{ cursor: 'pointer' }}
            >
              <img src={inviteBg} alt="" className="invite-button-bg" />
              <span className="invite-button-text">INVITE</span>
            </div>

            {/* Правая кнопка с иконкой ссылки */}
            <div 
              className="referral-button link-button"
              onClick={handleLinkClick}
              style={{ cursor: 'pointer' }}
            >
              <img src={linkIcon} alt="Copy link" className="link-icon" />
            </div>
          </div>
        </div>
      </div>

      {/* Информационное модальное окно */}
      {isInfoModalOpen && (
        <div className="inf_overlay" onClick={handleOverlayClick}>
          <div className="inf_modal">
            <div className="inf_close_btn" onClick={closeInfoModal}>×</div>
            
            <div className="inf_content">
              {/* Первый пункт - выплата на внутриигровой баланс (без иконки) */}
              <div className="inf_item">
                <span className="inf_text">
                  <strong>Payment</strong> is made to the in-game balance
                </span>
              </div>

              {/* Второй пункт - с иконкой замка про TON кошелек */}
              <div className="inf_item_with_icon">
                <img src={lockIcon} alt="" className="inf_icon" />
                <span className="inf_text_with_icon">
                  <strong>To receive payments to your TON wallet,</strong> you need 50+ referrals
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}