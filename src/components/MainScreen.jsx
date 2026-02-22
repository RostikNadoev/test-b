import { useState, useEffect } from 'react';
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
// Импортируем API
import { referralsApi } from '../utils/api';

// Константы
const BOT_USERNAME = 'Bouncecase_bot';

export default function MainScreen({ onNavigate, initialCardIndex = 2 }) {
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [referralData, setReferralData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCopyToast, setShowCopyToast] = useState(false);
  const [isToastHiding, setIsToastHiding] = useState(false);
  const [error, setError] = useState(null);

  // Загружаем реферальные данные при монтировании
  useEffect(() => {
    loadReferralData();
  }, []);

  // Отслеживаем изменения referralData
  useEffect(() => {
    if (referralData) {
      console.log('✅ Referral data loaded:', referralData);
      console.log('🔑 referral_code:', referralData.referral_code);
      console.log('🔗 referral_link.start_param:', referralData.referral_link?.start_param);
    }
  }, [referralData]);

  const loadReferralData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      console.log('📥 Loading referral data...');
      
      const data = await referralsApi.getMyReferralInfo();
      console.log('✅ Referral data loaded:', data);
      
      setReferralData(data);
    } catch (error) {
      console.error('❌ Failed to load referral data:', error);
      setError('Failed to load referral data');
      
      // Для тестирования используем мок-данные если API недоступен
      console.log('📦 Using mock data for testing');
      setReferralData({
        referral_code: "15-8785",
        referral_link: { start_param: "15-8785" },
        my_progress: {
          eligible_spend_stars: 10,
          eligible_games: 0,
          activated_at: null
        },
        referrals_count: 10,
        next_payout_utc: "2026-02-27T00:05:00Z",
        payouts: []
      });
    } finally {
      setIsLoading(false);
    }
  };

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

  // Форматирование даты из UTC в формат DD.MM.YYYY
  const formatNextPayoutDate = (utcDateString) => {
    if (!utcDateString) return '25.08.2026'; // fallback
    
    const date = new Date(utcDateString);
    const day = date.getUTCDate().toString().padStart(2, '0');
    const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
    const year = date.getUTCFullYear();
    
    return `${day}.${month}.${year}`;
  };

  // Форматирование суммы из eligible_spend_stars
  const formatEligibleAmount = (stars) => {
    if (stars === undefined || stars === null) return '0 ton';
    return `${stars} ton`;
  };

  // Функция для получения реферальной ссылки
  const getReferralLink = () => {
    // Проверяем разные возможные пути получения кода
    let referralCode = null;
    
    if (referralData?.referral_code) {
      referralCode = referralData.referral_code;
    } else if (referralData?.referral_link?.start_param) {
      referralCode = referralData.referral_link.start_param;
    }
    
    console.log('🔗 Getting referral link, code:', referralCode);
    
    if (!referralCode) {
      console.error('❌ No referral code available');
      return null;
    }
    
    const link = `https://t.me/${BOT_USERNAME}?startapp=${referralCode}`;
    console.log('✅ Generated link:', link);
    return link;
  };

  // Обработчик для кнопки INVITE (открыть окно выбора чатов Telegram)
  const handleInviteClick = () => {
    console.log('👆 Invite button clicked');
    
    const link = getReferralLink();
    if (!link) {
      console.error('❌ No referral link available');
      return;
    }

    console.log('📤 Sharing referral link:', link);
    
    // Текст сообщения с ссылкой
    const message = `🎮 Join me on Bounce Case! Play games, open cases, and win!\n\n${link}`;
    
    // Используем Telegram WebApp API для открытия окна отправки сообщения
    if (window.Telegram?.WebApp) {
      console.log('📱 Using Telegram WebApp API');
      
      // Формируем URL для шаринга
      const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent('🎮 Join me on Bounce Case!')}`;
      
      // Открываем окно отправки сообщения
      window.Telegram.WebApp.openTelegramLink(shareUrl);
    } else {
      console.log('🌐 Using fallback for browser');
      // Fallback для браузера
      window.open(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent('🎮 Join me on Bounce Case!')}`, '_blank');
    }
  };

  // Обработчик для кнопки копирования ссылки
  const handleLinkClick = async () => {
    console.log('👆 Link button clicked');
    
    const link = getReferralLink();
    if (!link) {
      console.error('❌ No referral link available');
      return;
    }

    try {
      console.log('📋 Copying link to clipboard:', link);
      
      // Копируем ссылку в буфер обмена
      await navigator.clipboard.writeText(link);
      console.log('✅ Link copied successfully');
      
      // Показываем тост "Link copied"
      setShowCopyToast(true);
      setIsToastHiding(false);
      
      // Скрываем тост через 2 секунды с анимацией
      setTimeout(() => {
        setIsToastHiding(true);
        // Полностью скрываем после завершения анимации
        setTimeout(() => {
          setShowCopyToast(false);
          setIsToastHiding(false);
        }, 300);
      }, 2000);
    } catch (error) {
      console.error('❌ Failed to copy link:', error);
    }
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
                    You’ll get{' '}
                    <span className="referral-date-value">
                      {isLoading ? 'Loading...' : formatNextPayoutDate(referralData?.next_payout_utc)}
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
                    {isLoading ? '...' : formatEligibleAmount(referralData?.my_progress?.eligible_spend_stars)}
                  </span>
                </div>
                <div className="referral-stat-field">
                  <span className="referral-stat-number">
                    {isLoading ? '...' : referralData?.referrals_count || '0'}
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
      </div>

      {/* Информационное модальное окно */}
      {isInfoModalOpen && (
        <div className="inf_overlay" onClick={handleOverlayClick}>
          <div className="inf_modal">
            <div className="inf_close_btn" onClick={closeInfoModal}>×</div>
            
            <div className="inf_content">
              {/* Первый пункт - выплата на внутриигровой баланс */}
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

      {/* Toast уведомление "Link copied" */}
      {showCopyToast && (
        <div className={`toast_notification ${isToastHiding ? 'hide' : ''}`}>
          <span className="toast_icon">✓</span>
          <span className="toast_text">Link copied</span>
        </div>
      )}
    </MainLayout>
  );
}