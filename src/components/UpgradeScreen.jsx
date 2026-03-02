import React, { useState, useMemo, useEffect, useRef } from 'react';
import Header from './Header';
import rocketBack from '../assets/Plinko/Back.png';
import arrow from '../assets/SpinPage/arrow.png';
import cardton1 from '../assets/MainPage/chest1/ton.png';
import modalCloseIcon from '../assets/Profile/close.png';
import tonIcon from '../assets/MainPage/ton.svg';
import switchr from '../assets/Rocket/switchr.svg';
import '../styles/UpgradeScreen.css';

const MOCK_MY_INVENTORY = [
  { id: 1, name: 'Small Chest', price: 10, img: cardton1 },
  { id: 2, name: 'Medium Chest', price: 50, img: cardton1 },
  { id: 3, name: 'Big Chest', price: 120, img: cardton1 },
  { id: 4, name: 'Silver Chest', price: 250, img: cardton1 },
  { id: 5, name: 'Gold Chest', price: 500, img: cardton1 },
  { id: 6, name: 'Diamond Chest', price: 1000, img: cardton1 },
];

const MOCK_TARGET_ITEMS = [
  { id: 101, name: 'Rare Item', price: 100, img: cardton1 },
  { id: 102, name: 'Epic Item', price: 500, img: cardton1 },
  { id: 103, name: 'Legendary Item', price: 1500, img: cardton1 },
  { id: 104, name: 'Mythic Item', price: 3000, img: cardton1 },
];

export default function UpgradeScreen({ onNavigate }) {
  const [myItem, setMyItem] = useState(null);
  const [targetItem, setTargetItem] = useState(null);
  const [activeModal, setActiveModal] = useState(null);
  const [isClosing, setIsClosing] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [isReturning, setIsReturning] = useState(false);
  const [arrowRotation, setArrowRotation] = useState(0);

  const vibRef = useRef(null);

  const winChance = useMemo(() => {
    if (!myItem || !targetItem) return 0;
    const chance = (myItem.price / targetItem.price) * 100;
    return Math.min(Math.max(chance, 1), 95);
  }, [myItem, targetItem]);

  const radius = 110;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = `${(winChance / 100) * circumference} ${circumference}`;

  useEffect(() => {
    return () => { if (vibRef.current) clearInterval(vibRef.current); };
  }, []);

  const triggerVibration = (type = 'light') => {
    const tg = window.Telegram?.WebApp;
    if (tg && tg.HapticFeedback) {
      if (type === 'impact') tg.HapticFeedback.impactOccurred('light');
      else if (type === 'notification') tg.HapticFeedback.notificationOccurred('success');
      else tg.HapticFeedback.impactOccurred('medium');
    }
  };

  const openModal = (type) => {
    if (isSpinning || isReturning) return;
    setIsClosing(false);
    setActiveModal(type);
  };

  const closeModal = () => {
    setIsClosing(true);
    setTimeout(() => {
      setActiveModal(null);
      setIsClosing(false);
    }, 300);
  };

  const handleSelectItem = (item, type) => {
    setIsClosing(true);

    if (type === 'my') {
      setMyItem(item);
      setTargetItem(null);
    } else {
      setTargetItem(item);
    }

    setTimeout(() => {
      setActiveModal(null);
      setIsClosing(false);
    }, 300);
  };

  const handleSpin = () => {
    if (!myItem || !targetItem || isSpinning || isReturning) return;

    setIsSpinning(true);
    setIsReturning(false);

    vibRef.current = setInterval(() => {
      triggerVibration('impact');
    }, 150);

    const roll = Math.random() * 100;
    const isWin = roll < winChance;
    const coloredDegrees = (winChance / 100) * 360;

    let finalAngle = 0;
    if (isWin) {
      finalAngle = 2 + Math.random() * (coloredDegrees - 4);
    } else {
      finalAngle = coloredDegrees + 2 + Math.random() * (360 - coloredDegrees - 4);
    }

    const rotations = 360 * 6;
    const targetRotation = rotations + finalAngle;

    setArrowRotation(targetRotation);

    setTimeout(() => {
      if (vibRef.current) {
        clearInterval(vibRef.current);
        vibRef.current = null;
      }

      setIsSpinning(false);
      triggerVibration(isWin ? 'notification' : 'impact');

      setTimeout(() => {

  setIsReturning(true);

  // Докручиваем по часовой до полного круга
  const nextFullCircle = Math.ceil(targetRotation / 360) * 360;
  setArrowRotation(nextFullCircle);

  setTimeout(() => {

    // 🔥 КРИТИЧНО — выключаем transition
    setIsReturning(false);

    // Мгновенно сбрасываем в 0 (без анимации назад)
    setArrowRotation(0);

    // Сбрасываем игру
    setMyItem(null);
    setTargetItem(null);

  }, 1500);

}, 1000);

    }, 4500);
  };

  const availableTargets = useMemo(() => {
    if (!myItem) return [];
    return MOCK_TARGET_ITEMS.filter(item => item.price > myItem.price);
  }, [myItem]);

  return (
    <div className="upgrade-screen" style={{ backgroundImage: `url(${rocketBack})` }}>
      <div className="upgrade-header-wrapper">
        <Header onNavigate={onNavigate} variant="upgrade" />
      </div>

      <main className="upgrade-content">
        <div className="upgrade-container">
          <div className="upgrade-wheel-section">
            <div className="upgrade-wheel-wrapper">
              <svg className="upgrade-wheel-svg" width="280" height="280" viewBox="0 0 280 280">
                <circle cx="140" cy="140" r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="20" />
                <circle
                  cx="140" cy="140" r={radius} fill="none"
                  stroke="url(#upgradeGradient)" strokeWidth="20"
                  strokeDasharray={strokeDasharray}
                  transform="rotate(-90 140 140)"
                  strokeLinecap="round"
                />
                <defs>
                  <linearGradient id="upgradeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#f1bf28" />
                    <stop offset="100%" stopColor="#db7900" />
                  </linearGradient>
                </defs>
              </svg>

              <div className="upgrade-chance-display">
                <span className="chance-value">{winChance.toFixed(2)}</span>
                <span className="chance-symbol">%</span>
              </div>

              <div
                className={`upgrade-arrow-container ${isSpinning ? 'is-spinning' : ''} ${isReturning ? 'is-returning' : ''}`}
                style={{ transform: `rotate(${arrowRotation}deg)` }}
              >
                <img src={arrow} alt="Arrow" className="upgrade-arrow" />
              </div>
            </div>
          </div>

          <div className="upgrade-items-selection">
            <div className="upgrade-item-slot" onClick={() => openModal('my')}>
              <div className="slot-title">Your Item</div>
              <div className={`slot-frame ${myItem ? 'has-item' : ''}`}>
                {myItem ? (
                  <>
                    <img src={myItem.img} alt="Mine" className="slot-item-image" />
                    <div className="slot-item-price">{myItem.price} TON</div>
                  </>
                ) : <div className="slot-empty-text">+ Select</div>}
              </div>
            </div>

            <div className="upgrade-items-divider">
              <img src={switchr} alt="divider" className="upgrade-switch-icon" />
            </div>

            <div className={`upgrade-item-slot ${!myItem ? 'disabled' : ''}`} onClick={() => myItem && openModal('target')}>
              <div className="slot-title">Target Item</div>
              <div className={`slot-frame ${targetItem ? 'has-item' : ''}`}>
                {targetItem ? (
                  <>
                    <img src={targetItem.img} alt="Target" className="slot-item-image" />
                    <div className="slot-item-price">{targetItem.price} TON</div>
                  </>
                ) : <div className="slot-empty-text">+ Select</div>}
              </div>
            </div>
          </div>

          <button
            className="upgrade-action-button"
            disabled={!myItem || !targetItem || isSpinning || isReturning}
            onClick={handleSpin}
          >
            {isSpinning ? 'UPGRADING...' : 'UPGRADE'}
          </button>
        </div>
      </main>

      {activeModal && (
        <div className="upgrade-modal-overlay" onClick={closeModal}>
          <div className="upgrade-modal-blur"></div>
          <div
            className={`upgrade-modal-content ${isClosing ? 'closing' : ''}`}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="upgrade-modal-title">
              {activeModal === 'my' ? 'SELECT YOUR ITEM' : 'SELECT TARGET ITEM'}
            </h2>

            <div className="upgrade-inventory-grid">
              {(activeModal === 'my' ? MOCK_MY_INVENTORY : availableTargets).map((item) => (
                <div key={item.id} className="upgrade-inventory-item" onClick={() => handleSelectItem(item, activeModal)}>
                  <img src={item.img} alt="item" className="inventory-item-img" />
                  <div className="inventory-item-price">
                    {item.price} <img src={tonIcon} alt="ton" className="ton-icon-small" />
                  </div>
                </div>
              ))}
            </div>

            <button className="upgrade-modal-close-btn" onClick={closeModal}>
              <img src={modalCloseIcon} alt="Close" className="upgrade-modal-close-icon" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}