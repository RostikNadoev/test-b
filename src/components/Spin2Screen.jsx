import React, { useState, useEffect, useRef } from 'react';
import '../styles/SpinScreen.css';
import item1 from '../assets/MainPage/chest2/in/2-1.png';
import item2 from '../assets/MainPage/chest2/in/2-2.png';
import item3 from '../assets/MainPage/chest2/in/2-3.png';
import item4 from '../assets/MainPage/chest2/in/2-4.png';
import item5 from '../assets/MainPage/chest2/in/2-5.png';
import item6 from '../assets/MainPage/chest2/in/2-6.png';
import item7 from '../assets/MainPage/chest2/in/2-7.png';
import item8 from '../assets/MainPage/chest2/in/2-8.png';
import item9 from '../assets/MainPage/chest2/in/2-9.png';
import item10 from '../assets/MainPage/chest2/in/2-10.png';
import cardton2 from '../assets/MainPage/chest2/ton.png';
import arrow from '../assets/SpinPage/arrow.png';

export default function Spin2Screen({ onNavigate }) {
  const frameContents = [
    { img: item1, price: '6500 TON' },
    { img: item2, price: '1000 TON' },
    { img: item3, price: '80 TON' },
    { img: item4, price: '65 TON' },
    { img: item5, price: '30 TON' },
    { img: item6, price: '5 TON' },
    { img: item7, price: '3 TON' },
    { img: item8, price: '1.7 TON' },
    { img: item9, price: '1.7 TON' },
    { img: item10, price: '1.7 TON' },
    { img: cardton2, price: '1.5 TON' },
    { img: cardton2, price: '1 TON' },
    { img: cardton2, price: '0.5 TON' }
  ];

  const scrollerRef = useRef(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [targetItemIndex, setTargetItemIndex] = useState(null);
  const [frames, setFrames] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [winningItem, setWinningItem] = useState(null);
  const [particles, setParticles] = useState([]);
  const [glowOpacity, setGlowOpacity] = useState(0); // Прозрачность рамки
  const animationRef = useRef(null);
  const glowAnimationRef = useRef(null);

  // Создаем частицы для снежного эффекта
  useEffect(() => {
    const createParticles = () => {
      const newParticles = [];
      const particleCount = 25;

      for (let i = 0; i < particleCount; i++) {
        newParticles.push({
          id: i,
          left: Math.random() * 100,
          size: Math.random() * 4 + 2,
          opacity: Math.random() * 0.4 + 0.2,
          duration: Math.random() * 10 + 10,
          delay: Math.random() * -20,
          sway: Math.random() * 20 - 10
        });
      }
      return newParticles;
    };

    setParticles(createParticles());
  }, []);

  useEffect(() => {
    const generateFrames = (targetIndex = 0) => {
      const frames = [];
      for (let i = 0; i < 95; i++) {
        const randomIndex = Math.floor(Math.random() * frameContents.length);
        frames.push(frameContents[randomIndex]);
      }
      frames.push(frameContents[targetIndex]);
      for (let i = 0; i < 2; i++) {
        const randomIndex = Math.floor(Math.random() * frameContents.length);
        frames.push(frameContents[randomIndex]);
      }
      return frames;
    };

    setFrames(generateFrames(0));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      const serverResultIndex = Math.floor(Math.random() * frameContents.length);
      setTargetItemIndex(serverResultIndex);
      const newFrames = [...frames];
      const targetFrameIndex = frames.length - 3;
      newFrames[targetFrameIndex] = frameContents[serverResultIndex];
      setFrames(newFrames);
      setIsSpinning(true);
    }, 100);

    return () => clearTimeout(timer);
  }, [frames.length]);

  // Функция для остановки анимации
  const stopAnimation = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    if (glowAnimationRef.current) {
      cancelAnimationFrame(glowAnimationRef.current);
      glowAnimationRef.current = null;
    }
    setIsSpinning(false);
  };

  // Функция для показа модалки с выигрышем
  const showWinningModal = () => {
    if (targetItemIndex !== null) {
      setWinningItem(frameContents[targetItemIndex]);
      setShowModal(true);
    }
  };

  // Функция для пропуска анимации
  const handleSkip = () => {
    stopAnimation();
    setGlowOpacity(1); // Полностью показать рамку при пропуске
    showWinningModal();
  };

  useEffect(() => {
    if (!isSpinning || targetItemIndex === null || !scrollerRef.current || frames.length === 0) return;

    const scroller = scrollerRef.current;
    const frameElement = scroller.querySelector('.spin-item-frame');
    if (!frameElement) return;
    const frameWidth = frameElement.offsetWidth;
    const gap = 10;
    const totalFrameWidth = frameWidth + gap;
    const targetFrameIndex = frames.length - 3;
    const visibleWidth = scroller.offsetWidth;
    const targetScroll = targetFrameIndex * totalFrameWidth - (visibleWidth / 2) + (frameWidth / 2);

    const duration = 9000;
    const glowStartTime = duration - 400; // Начать появление рамки за 400мс до конца
    const startTime = performance.now();
    const startScroll = scroller.scrollLeft;

    const easeOutQuart = (t) => 1 - Math.pow(1 - t, 4);

    const animate = (time) => {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutQuart(progress);

      scroller.scrollLeft = startScroll + (targetScroll - startScroll) * easedProgress;

      // Управление прозрачностью рамки
      if (elapsed >= glowStartTime) {
        const glowProgress = Math.min((elapsed - glowStartTime) / 400, 1);
        setGlowOpacity(glowProgress);
      }

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        scroller.scrollLeft = targetScroll;
        setGlowOpacity(1); // Убедиться, что рамка полностью видна в конце
        setIsSpinning(false);
        setWinningItem(frameContents[targetItemIndex]);
        setTimeout(() => setShowModal(true), 500);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    // Очистка при размонтировании
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (glowAnimationRef.current) {
        cancelAnimationFrame(glowAnimationRef.current);
      }
    };
  }, [isSpinning, targetItemIndex, frames.length]);

  const getPriceClass = (priceStr) => {
    const priceValue = parseFloat(priceStr.replace(/[^\d.-]/g, ''));
    if (priceValue >= 501) return 'item-price-gradient-3';
    if (priceValue >= 51) return 'item-price-gradient-2';
    if (priceValue >= 11) return 'item-price-gradient-1';
    return 'item-price';
  };

  const getTargetFrameIndex = () => frames.length - 3;

  const handleExit = () => {
    onNavigate('card2');
  };

  return (
    <div className="spin-screen-content">
      {/* Эффект падающих частиц */}
      <div className="snow-particles-container">
        {particles.map(particle => (
          <div
            key={particle.id}
            className="snow-particle"
            style={{
              left: `${particle.left}%`,
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              opacity: particle.opacity,
              animationDuration: `${particle.duration}s`,
              animationDelay: `${particle.delay}s`,
              transform: `translateX(${particle.sway}px)`
            }}
          />
        ))}
      </div>

      <div className="spin-frames-container">
        <div className="spin-arrow-container">
          <img src={arrow} alt="Arrow" className="spin-arrow" loading="lazy" />
        </div>

        <div
          className={`spin-frames-scroller ${isSpinning ? 'spinning' : ''}`}
          ref={scrollerRef}
        >
          {frames.map((content, index) => (
            <div
              key={index}
              className={`spin-item-frame ${
                index === getTargetFrameIndex() && glowOpacity > 0 
                  ? `spin-item-frame-glowing` 
                  : index === getTargetFrameIndex() 
                    ? 'spin-item-frame-center' 
                    : ''
              }`}
              style={{
                boxShadow: index === getTargetFrameIndex() 
                  ? `0 0 15px ${glowOpacity * 7}px rgba(58, 171, 237, ${glowOpacity * 0.7})` 
                  : undefined,
                border: index === getTargetFrameIndex() 
                  ? `2px solid rgba(58, 171, 237, ${glowOpacity})` 
                  : undefined
              }}
            >
              <div className="spin-item-content">
                <img src={content.img} alt={`Item ${index + 1}`} className="spin-item-image" loading="lazy" />
                <div className={getPriceClass(content.price)}>{content.price}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="spin-skip-footer">
        <button className="spin-skip-button" onClick={handleSkip}>
          Skip
        </button>
      </div>

      {showModal && winningItem && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="winning-frame-large">
              <div className="winning-content-large">
                <img src={winningItem.img} alt="Winning Item" className="winning-image-large" loading="lazy" />
                <div className={`${getPriceClass(winningItem.price)} winning-price-large`}>{winningItem.price}</div>
              </div>
              <div className="purple-border-overlay"></div>
            </div>
            <button className="modal-secondary-button">
              SELL FOR {winningItem.price}
            </button>
            <button className="modal-exit-button" onClick={handleExit}>
              ADD TO INVENTORY
            </button>
          </div>
        </div>
      )}
    </div>
  );
}