// PvpScreen.jsx
import React, { useState, useRef, useEffect } from 'react';
import MainLayout from './MainLayout';
import '../styles/PvpScreen.css';
import arrow from '../assets/SpinPage/arrow.png';
import emptyPat from '../assets/PVP/empty-pat.png';
import pvpBackground from '../assets/PVP/main.png'; // ← импортируем фон

export default function PvpScreen({ onNavigate }) {
  const [isWaiting, setIsWaiting] = useState(true);
  const scrollerRef = useRef(null);

  // Пустые карточки для демонстрации (0 игроков)
  const emptyFrames = Array(12).fill(null);

  // Анимация ожидания игроков
  useEffect(() => {
    const letters = document.querySelectorAll('.waiting-letter');
    if (!letters.length) return;

    const animateLetters = () => {
      letters.forEach((letter, index) => {
        if (letter.textContent === ' ') return;
        setTimeout(() => {
          letter.style.transform = 'translateY(-5px)';
          setTimeout(() => {
            letter.style.transform = 'translateY(0px)';
          }, 200);
        }, index * 100);
      });
    };

    const interval = setInterval(animateLetters, 1500);
    return () => clearInterval(interval);
  }, [isWaiting]);

  // Анимация прокрутки (заглушка)
  useEffect(() => {
    if (!scrollerRef.current) return;

    const scroller = scrollerRef.current;
    let position = 0;
    let animationId = null;

    const animateScroll = () => {
      position += 3;
      if (position > scroller.scrollWidth / 2) {
        position = 0;
      }
      scroller.scrollLeft = position;
      animationId = requestAnimationFrame(animateScroll);
    };

    animationId = requestAnimationFrame(animateScroll);

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, []);

  const handleJoinClick = () => {
    // Здесь будет логика подключения к PvP сессии
  };

  // Функция для разбивки текста на буквы с сохранением пробелов
  const renderWaitingText = () => {
    const text = 'Waiting for players...';
    return text.split('').map((letter, index) => (
      <span 
        key={index} 
        className={`waiting-letter ${letter === ' ' ? 'space' : ''}`}
        style={{ animationDelay: `${index * 0.1}s` }}
      >
        {letter}
      </span>
    ));
  };

  return (
    <MainLayout 
      onNavigate={onNavigate} 
      currentScreen="pvp"
      customBackground={pvpBackground} // ← передаём фон сюда
    >
      <div className="pvp-screen-content">
        {/* Контейнер с прокручиваемыми рамками */}
        <div className="pvp-frames-container">
          {/* Overlay с сообщением об ожидании */}
          {isWaiting && (
            <div className="waiting-overlay">
              <div className="waiting-text">
                {renderWaitingText()}
              </div>
            </div>
          )}

          {/* Стрелка */}
          <div className={`pvp-arrow-container ${isWaiting ? 'blurred' : ''}`}>
            <img src={arrow} alt="Arrow" className="pvp-arrow" loading="lazy" />
          </div>

          <div
            className={`pvp-frames-scroller ${isWaiting ? 'blurred' : ''}`}
            ref={scrollerRef}
          >
            {emptyFrames.map((_, index) => (
              <div key={index} className="pvp-item-frame">
                <div className="pvp-item-content">
                  {isWaiting ? (
                    <div className="empty-slot">
                      <div className="question-mark">?</div>
                    </div>
                  ) : (
                    <div className="player-slot">
                      <div className="player-avatar"></div>
                      <div className="player-nickname">Player</div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Кнопка JOIN */}
        <div className="pvp-join-section">
          <button className="join-button" onClick={handleJoinClick}>
            JOIN
          </button>
        </div>

        {/* Таблица участников */}
        <div className="participants-table-section">
          <div className="participants-table">
            <div className="table-header">
              <div className="header-cell">USER</div>
              <div className="header-cell">INVESTS</div>
            </div>
            <div className="table-body">
              <div className="empty-table-content">
                <img src={emptyPat} alt="No participants" className="empty-pat-image" />
                <div className="empty-table-message">
                  No active participants
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}