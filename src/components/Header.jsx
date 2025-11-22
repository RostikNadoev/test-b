// components/Header.jsx
import '../styles/Header.css';
import { useState, useRef, useEffect } from 'react';
import ava from '../assets/MainPage/ava.jpg';
import ton from '../assets/MainPage/ton.svg';
import add_balance from '../assets/MainPage/add_balance.svg';
import modalCloseIcon from '../assets/Profile/close.svg';

export default function Header({ onNavigate, balance = "1337" }) {
  const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [isClosing, setIsClosing] = useState(false);
  const modalRef = useRef(null);
  const inputRef = useRef(null);

  const handleOpenBalanceModal = () => {
    setIsBalanceModalOpen(true);
    setIsClosing(false);
  };

  const handleCloseBalanceModal = () => {
    setIsClosing(true);
    // Скрываем клавиатуру если она открыта
    if (inputRef.current) {
      inputRef.current.blur();
    }
  };

  const handleAnimationEnd = () => {
    if (isClosing) {
      setIsBalanceModalOpen(false);
      setIsClosing(false);
      setTopUpAmount('');
    }
  };

  const handleTopUp = () => {
    console.log(`Пополнение на ${topUpAmount} TON`);
  };

  const handleInputChange = (e) => {
    const value = e.target.value.replace(/[^\d]/g, '');
    setTopUpAmount(value);
  };

  // Обработчик для закрытия клавиатуры при тапе вне инпута
  const handleModalClick = (e) => {
    // Если клик не по инпуту и не по кнопкам, скрываем клавиатуру
    if (inputRef.current && !inputRef.current.contains(e.target)) {
      inputRef.current.blur();
    }
  };

  return (
    <>
      <header className="header-outer">
        <div className="header-inner">
          <div className="user-info">
            <img src={ava} alt="User" className="user-avatar" loading="lazy" onClick={() => onNavigate('profile')}/>
            <span className="user-username" onClick={() => onNavigate('profile')}>Username</span>

            <div className="balance-container">
              <img src={ton} alt="TON" className="balance-icon" />
              <span className="balance-amount">{balance}</span>
            </div>

            <div className="add_balance-button" onClick={handleOpenBalanceModal}>
              <img src={add_balance} alt="add" className="add_balance-icon" />
            </div>
          </div>
        </div>
      </header>

      {/* Модальное окно пополнения баланса */}
      {isBalanceModalOpen && (
        <div className="balance-modal-overlay">
          <div className="balance-modal-blur-layer"></div>

          <div
            ref={modalRef}
            className={`balance-modal-content ${isClosing ? 'closing' : ''}`}
            onClick={handleModalClick}
            onAnimationEnd={handleAnimationEnd}
          >
            <div className="balance-modal-body">
              <h2 className="balance-modal-title">Top up Ton balance</h2>
              <p className="balance-modal-instruction">Enter the amount</p>
              
              <div className="balance-input-container">
                <input
                  ref={inputRef}
                  type="text"
                  className="balance-input"
                  value={topUpAmount}
                  onChange={handleInputChange}
                  placeholder="0"
                  inputMode="numeric"
                  pattern="[0-9]*"
                />
              </div>

              <button 
                className={`balance-modal-action-btn ${!topUpAmount ? 'disabled' : ''}`}
                onClick={handleTopUp}
                disabled={!topUpAmount}
              >
                <span className="balance-btn-text">
                  Top up 
                  {topUpAmount && (
                    <>
                      <img src={ton} alt="TON" className="balance-btn-ton-icon" />
                      {topUpAmount}
                    </>
                  )}
                </span>
              </button>
            </div>

            <button className="balance-modal-close-btn" onClick={handleCloseBalanceModal}>
              <img src={modalCloseIcon} alt="Close" className="balance-modal-close-icon" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}