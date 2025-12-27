// components/Spin1Screen.jsx
import React, { useState, useEffect, useRef } from 'react';
import '../styles/SpinScreen.css';
import { useDemo } from '../contexts/DemoContext';
import { usersApi } from '../utils/api';

import item1 from '../assets/MainPage/chest1/in/1-1.png';
import item2 from '../assets/MainPage/chest1/in/1-2.png';
import item3 from '../assets/MainPage/chest1/in/1-3.png';
import item4 from '../assets/MainPage/chest1/in/1-4.png';
import item5 from '../assets/MainPage/chest1/in/1-5.png';
import item6 from '../assets/MainPage/chest1/in/1-6.png';
import item7 from '../assets/MainPage/chest1/in/1-7.png';
import item8 from '../assets/MainPage/chest1/in/1-8.png';
import item9 from '../assets/MainPage/chest1/in/1-9.png';
import item10 from '../assets/MainPage/chest1/in/1-10.png';
import item11 from '../assets/MainPage/chest1/in/1-11.png';
import item12 from '../assets/MainPage/chest1/in/1-12.png';
import cardton1 from '../assets/MainPage/chest1/ton.png';
import arrow from '../assets/SpinPage/arrow.png';

export default function Spin1Screen({ onNavigate, winData }) {
  const { 
    isDemoMode, 
    demoBalance, 
    removeFromDemoBalance, 
    addToDemoBalance, 
    addToDemoInventory 
  } = useDemo();

  const demoProbabilities = [
    { img: item1, price: '150 TON', probability: 0.005 },
    { img: item2, price: '80 TON', probability: 0.02 },
    { img: item3, price: '65 TON', probability: 0.03 },
    { img: item4, price: '7.5 TON', probability: 0.1 },
    { img: item5, price: '3 TON', probability: 0.12 },
    { img: item6, price: '2.5 TON', probability: 0.15 },
    { img: item7, price: '2.5 TON', probability: 0.15 },
    { img: item8, price: '1.7 TON', probability: 0.15 },
    { img: item9, price: '1.7 TON', probability: 0.15 },
    { img: item10, price: '1.7 TON', probability: 0.15 },
    { img: item11, price: '1.7 TON', probability: 0.15 },
    { img: item12, price: '1.7 TON', probability: 0.15 },
    { img: cardton1, price: '1.5 TON', probability: 0.15 },
    { img: cardton1, price: '1 TON', probability: 0.15 },
    { img: cardton1, price: '0.5 TON', probability: 0.15 }
  ];

  const [winningItem, setWinningItem] = useState(null);
  const [frameContents, setFrameContents] = useState([]);
  const scrollerRef = useRef(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [targetItemIndex, setTargetItemIndex] = useState(null);
  const [frames, setFrames] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [particles, setParticles] = useState([]);
  const [glowOpacity, setGlowOpacity] = useState(0);
  const [hasCharged, setHasCharged] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const animationRef = useRef(null);

  // Инициализация данных
  useEffect(() => {
    if (isDemoMode) {
      setFrameContents(demoProbabilities);
    } else if (winData?.winItem) {
      // Используем данные из API для реального режима
      const apiItem = winData.winItem;
      const winItem = {
        img: apiItem.image_url ? getImageFromUrl(apiItem.image_url) : cardton1,
        price: `${apiItem.price_ton || 0} TON`,
        name: apiItem.name || 'Item',
        item_type: apiItem.item_type
      };
      setWinningItem(winItem);
      
      // Создаем содержимое фреймов с выигранным предметом
      const contents = [...demoProbabilities];
      // Заменяем один случайный предмет на выигранный
      const randomIndex = Math.floor(Math.random() * contents.length);
      contents[randomIndex] = winItem;
      setFrameContents(contents);
    } else {
      setFrameContents(demoProbabilities);
    }
  }, [isDemoMode, winData]);

  const isCardtonItem = (item) => {
    return item && item.img === cardton1;
  };

  const getRandomItemIndex = () => {
    if (!isDemoMode && winningItem) {
      // В реальном режиме используем выигранный предмет из API
      return frameContents.findIndex(item => 
        item.price === winningItem.price && 
        item.img === winningItem.img
      ) || 0;
    }

    if (!isDemoMode) {
      return Math.floor(Math.random() * frameContents.length);
    }

    const rand = Math.random();
    let cumulativeProbability = 0;
    for (let i = 0; i < demoProbabilities.length; i++) {
      cumulativeProbability += demoProbabilities[i].probability;
      if (rand <= cumulativeProbability) {
        return i;
      }
    }
    return demoProbabilities.length - 1;
  };

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

  const startSpin = () => {
    if (isDemoMode && !hasCharged) {
      if (demoBalance < 2.5) {
        alert("Not enough TON in demo balance!");
        onNavigate('card1');
        return;
      }
      removeFromDemoBalance(2);
      setHasCharged(true);
    }

    const serverResultIndex = getRandomItemIndex();
    setTargetItemIndex(serverResultIndex);
    const newFrames = generateFrames(serverResultIndex);
    setFrames(newFrames);
    setIsSpinning(true);
    
    // В демо-режиме используем случайный предмет
    if (isDemoMode) {
      setWinningItem(frameContents[serverResultIndex]);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      startSpin();
    }, 100);
    return () => clearTimeout(timer);
  }, [frameContents]);

  const stopAnimation = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    setIsSpinning(false);
  };

  const handleSkip = () => {
    stopAnimation();
    setGlowOpacity(1);
    setShowModal(true);
  };

  const handleSell = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    if (isDemoMode && winningItem) {
      const priceValue = parseFloat(winningItem.price.replace(/[^\d.-]/g, ''));
      addToDemoBalance(priceValue);
    } else if (winningItem && !isDemoMode) {
      // В реальном режиме - продажа через API
      try {
        // TODO: Добавить API для продажи предметов
        console.log('Selling item:', winningItem);
        // await usersApi.sellItem(winningItem.id);
      } catch (error) {
        console.error('Error selling item:', error);
      }
    }

    setShowModal(false);
    onNavigate('card1');
    setIsProcessing(false);
  };

  const handleAddToInventory = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    if (isDemoMode && winningItem) {
      addToDemoInventory(winningItem);
    } else if (winData?.inventoryAdded && !isDemoMode) {
      // В реальном режиме предмет уже добавлен через API
      console.log('Item already added to inventory via API');
    }

    setShowModal(false);
    onNavigate('card1');
    setIsProcessing(false);
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
    const glowStartTime = duration - 400;
    const startTime = performance.now();
    const startScroll = scroller.scrollLeft;

    const easeOutQuart = (t) => 1 - Math.pow(1 - t, 4);

    const animate = (time) => {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutQuart(progress);

      scroller.scrollLeft = startScroll + (targetScroll - startScroll) * easedProgress;

      if (elapsed >= glowStartTime) {
        const glowProgress = Math.min((elapsed - glowStartTime) / 800, 1);
        setGlowOpacity(glowProgress);
      }

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        scroller.scrollLeft = targetScroll;
        setGlowOpacity(1);
        setIsSpinning(false);
        setTimeout(() => setShowModal(true), 500);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
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

  // Вспомогательная функция для получения изображения
  const getImageFromUrl = (url) => {
    // Здесь можно реализовать логику загрузки изображений из URL
    // Пока возвращаем дефолтное изображение
    return cardton1;
  };

  return (
    <div className="spin-screen-content">
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
                <div className={`${getPriceClass(winningItem.price)} winning-price-large`}>
                  {winningItem.price}
                </div>
              </div>
              <div className="purple-border-overlay"></div>
            </div>
            
            {isCardtonItem(winningItem) || winningItem.item_type === 'reward_ton' ? (
              <button 
                className="modal-secondary-button modal-single-button" 
                onClick={handleSell}
                disabled={isProcessing}
              >
                SELL FOR {winningItem.price}
              </button>
            ) : (
              <>
                <button 
                  className="modal-secondary-button" 
                  onClick={handleSell}
                  disabled={isProcessing}
                >
                  SELL FOR {winningItem.price}
                </button>
                <button 
                  className="modal-exit-button" 
                  onClick={handleAddToInventory}
                  disabled={isProcessing}
                >
                  ADD TO INVENTORY
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}