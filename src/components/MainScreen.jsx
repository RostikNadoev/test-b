import { useState, useEffect } from 'react';
import MainLayout from './MainLayout';
// Импортируем изображения для кнопок
import gameCard1 from '../assets/MainPage/newplinkocard.png';
import gameCard2 from '../assets/MainPage/newupgradecard.png';
import gameCard3 from '../assets/MainPage/newcasescard.png';
import gameCard4 from '../assets/MainPage/newluckycard.png';
import gameCard5 from '../assets/MainPage/newrocketcard.png';
// Импортируем изображения для кнопок рефералов
import inviteBg from '../assets/MainPage/invite1.png';
import linkIcon from '../assets/MainPage/link.svg';
// Импортируем иконку замка и иконку для новой кнопки
import lockIcon from '../assets/MainPage/lock.png';
import referralsIcon from '../assets/MainPage/refferals.svg';
// Импортируем API
import { referralsApi } from '../utils/api';

// Константы
const BOT_USERNAME = 'Bouncecase_bot';

export default function MainScreen({ onNavigate, initialCardIndex = 2 }) {
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [isReferralModalOpen, setIsReferralModalOpen] = useState(false);
  const [referralData, setReferralData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCopyToast, setShowCopyToast] = useState(false);
  const [isToastHiding, setIsToastHiding] = useState(false);
  const [error, setError] = useState(null);

  // Загружаем реферальные данные при монтировании
  useEffect(() => {
    loadReferralData();
  }, []);

  const loadReferralData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const data = await referralsApi.getMyReferralInfo();
      setReferralData(data);
    } catch (error) {
      setError('Failed to load referral data');
      
      // Для тестирования используем мок-данные если API недоступен
      setReferralData({
        invited_count: 10,
        accrual_date_utc: "2026-02-27T00:05:00Z",
        amount_due_ton: 10.5,
        referral_link: "https://t.me/Bouncecase_bot?start=15-8785",
        referral_code: "15-8785"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageButtonClick = (buttonNumber) => {
    if (buttonNumber === 1) {
      onNavigate('plinko');
    } else if (buttonNumber === 2) {
      onNavigate('upgrade');
    } else if (buttonNumber === 3) { 
      onNavigate('cases');
    } else if (buttonNumber === 4) {
      onNavigate('luckyballs');
    } else if (buttonNumber === 5) {
      onNavigate('rocket');
    }
  };

  // Форматирование даты из UTC в формат DD.MM.YYYY
  const formatNextPayoutDate = (utcDateString) => {
    if (!utcDateString) return '25.08.2026';
    
    const date = new Date(utcDateString);
    const day = date.getUTCDate().toString().padStart(2, '0');
    const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
    const year = date.getUTCFullYear();
    
    return `${day}.${month}.${year}`;
  };

  // Форматирование суммы из amount_due_ton с одним знаком после запятой
  const formatDueAmount = (amount) => {
    if (amount === undefined || amount === null) return '0.0 ton';
    
    const num = Number(amount);
    if (isNaN(num)) return '0.0 ton';
    
    return `${num.toFixed(1)} ton`;
  };

  // Функция для получения реферальной ссылки
  const getReferralLink = () => {
    let referralCode = null;
    
    if (referralData?.referral_code) {
      referralCode = referralData.referral_code;
    } else if (referralData?.referral_link) {
      const link = referralData.referral_link;
      const match = link.match(/[?&]start=([^&]+)/);
      if (match) {
        referralCode = match[1];
      }
    }
    
    if (!referralCode) {
      return null;
    }
    
    return `https://t.me/${BOT_USERNAME}?start=${referralCode}`;
  };

  // Обработчик для кнопки INVITE
  const handleInviteClick = () => {
    const link = getReferralLink();
    if (!link) return;

    const message = `Join me on Bounce! Play games, open cases, and win!\n\n${link}`;
    
    if (window.Telegram?.WebApp) {
      const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent('Join me on Bounce!')}`;
      window.Telegram.WebApp.openTelegramLink(shareUrl);
    } else {
      window.open(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent('Join me on Bounce!')}`, '_blank');
    }
  };

  // Обработчик для кнопки копирования ссылки
  const handleLinkClick = async () => {
    const link = getReferralLink();
    if (!link) return;

    try {
      await navigator.clipboard.writeText(link);
      
      setShowCopyToast(true);
      setIsToastHiding(false);
      
      setTimeout(() => {
        setIsToastHiding(true);
        setTimeout(() => {
          setShowCopyToast(false);
          setIsToastHiding(false);
        }, 300);
      }, 1300);
    } catch (error) {
      console.error('Failed to copy link:', error);
    }
  };

  const openInfoModal = () => {
    setIsInfoModalOpen(true);
  };

  const closeInfoModal = () => {
    setIsInfoModalOpen(false);
  };

  const openReferralModal = () => {
    setIsReferralModalOpen(true);
  };

  const closeReferralModal = () => {
    setIsReferralModalOpen(false);
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      closeInfoModal();
      closeReferralModal();
    }
  };

  // Компонент реферального блока (для переиспользования)
  const ReferralContent = () => (
    <div className="referral-block">
      <div className="referral-frame">
        <div className="referral-content">
          <div className="referral-text">
            Invite friends and earn
            <span className="referral-highlight">10%</span> <br />of their top-ups!
          </div>
    
          {/* Верхний ряд с надписями */}
          <div className="referral-stats-header">
            <div className="inf_date_container">
              <span className="referral-date-label">
                You'll get{' '}
                <span className="referral-date-value">
                  {isLoading ? 'Loading...' : formatNextPayoutDate(referralData?.accrual_date_utc)}
                </span>
              </span>
              {/* Кнопка с вопросиком */}
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
              <span className="referral-stat-number">
                {isLoading ? '...' : formatDueAmount(referralData?.amount_due_ton)}
              </span>
            </div>
            <div className="referral-stat-field">
              <span className="referral-stat-number">
                {isLoading ? '...' : referralData?.invited_count || '0'}
              </span>
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
  );

  return (
    <MainLayout onNavigate={onNavigate} currentScreen="main">
      {/* Контейнер с кнопками-картинками */}
      <div className="banner-images-container">
        
        {/* НОВАЯ КНОПКА РЕФЕРАЛОВ ВВЕРХУ */}
        <div className="referral-top-button" onClick={openReferralModal}>
          <span className="referral-top-text">Refferal</span>
          <img src={referralsIcon} alt="" className="referral-top-icon" />
          <span className="referral-top-count">
            {isLoading ? '...' : referralData?.invited_count || '0'}
          </span>
          <div className="referral-top-badge"></div>
        </div>

        {/* Ряд 1: кнопки 1 и 2 (Plinko и Upgrade) */}
        <div className="buttons-row">
          <div 
            className="game-button half-button"
            onClick={() => handleImageButtonClick(1)}
          >
            <img 
              src={gameCard1} 
              alt="Plinko game" 
              className="game-image"
              loading="lazy"
            />
          </div>
          
          <div 
            className="game-button half-button"
            onClick={() => handleImageButtonClick(2)}
          >
            <img 
              src={gameCard2} 
              alt="Upgrade Game" 
              className="game-image"
              loading="lazy"
            />
          </div>
        </div>

        {/* Ряд 2: кнопка 3 (Cases) - полная ширина */}
        <div className="buttons-row">
          <div 
            className="game-button full-button"
            onClick={() => handleImageButtonClick(3)}
          >
            <img 
              src={gameCard3} 
              alt="Cases" 
              className="game-image"
              loading="lazy"
            />
          </div>
        </div>

        {/* Ряд 3: кнопки 4 и 5 (LuckyBalls и Rocket) */}
        <div className="buttons-row">
          <div 
            className="game-button half-button"
            onClick={() => handleImageButtonClick(4)}
          >
            <img 
              src={gameCard4} 
              alt="LuckyBalls" 
              className="game-image"
              loading="lazy"
            />
          </div>
          
          <div 
            className="game-button half-button"
            onClick={() => handleImageButtonClick(5)}
          >
            <img 
              src={gameCard5} 
              alt="Rocket" 
              className="game-image"
              loading="lazy"
            />
          </div>
        </div>
      </div>

      {/* Информационное модальное окно (вопросик) */}
      {isInfoModalOpen && (
        <div className="inf_overlay" onClick={handleOverlayClick}>
          <div className="inf_modal">
            <div className="inf_close_btn" onClick={closeInfoModal}>×</div>
            
            <div className="inf_content">
              {/* Первый пункт */}
              <div className="inf_item">
                <span className="inf_text">
                  <strong>Default payment</strong> is to the in-game balance
                </span>
              </div>

              {/* Второй пункт с иконкой замка */}
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

      {/* Модальное окно с реферальной программой */}
      {isReferralModalOpen && (
        <div className="inf_overlay referral-modal-overlay" onClick={handleOverlayClick}>
          <div className="inf_modal referral-modal">
            <div className="inf_close_btn" onClick={closeReferralModal}>×</div>
            <div className="referral-modal-content">
              <ReferralContent />
            </div>
          </div>
        </div>
      )}

      {/* Toast уведомление */}
      {showCopyToast && (
        <div className={`toast_notification ${isToastHiding ? 'hide' : ''}`}>
          <span className="toast_icon">✓</span>
          <span className="toast_text">Link copied</span>
        </div>
      )}
    </MainLayout>
  );
}