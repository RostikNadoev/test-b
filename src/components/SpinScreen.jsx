import React, { useState, useEffect, useRef } from 'react';
import '../styles/SpinScreen.css';
import { useDemo } from '../contexts/DemoContext';

import item1 from '../assets/MainPage/chest3/in/3-1.png';
import item2 from '../assets/MainPage/chest3/in/3-2.png';
import item3 from '../assets/MainPage/chest3/in/3-3.png';
import item4 from '../assets/MainPage/chest3/in/3-4.png';
import item5 from '../assets/MainPage/chest3/in/3-5.png';
import item6 from '../assets/MainPage/chest3/in/3-6.png';
import item7 from '../assets/MainPage/chest3/in/3-7.png';
import item8 from '../assets/MainPage/chest3/in/3-8.png';
import item9 from '../assets/MainPage/chest3/in/3-9.png';
import item10 from '../assets/MainPage/chest3/in/3-10.png';
import item11 from '../assets/MainPage/chest3/in/3-11.png';
import cardton3 from '../assets/MainPage/chest3/ton.png';
import arrow from '../assets/SpinPage/arrow.png';

export default function Spin3Screen({ onNavigate }) {
  const { 
    isDemoMode, 
    demoBalance, 
    removeFromDemoBalance, 
    addToDemoBalance, 
    addToDemoInventory 
  } = useDemo();

  const demoProbabilities = [
    { img: item11, price: '1800 TON', probability: 0.002 },  // 0.05% (увеличено)
    { img: item10, price: '150 TON', probability: 0.007 },    // 0.2% (увеличено)
    { img: item1, price: '30 TON', probability: 0.01 },      // 0.8% (увеличено)
    { img: item4, price: '26 TON', probability: 0.02 },      // 1.1% (увеличено)
    { img: item2, price: '12 TON', probability: 0.03 },      // 1.8% (увеличено)
    { img: item3, price: '11 TON', probability: 0.04 },      // 2.5% (увеличено)
    { img: item8, price: '10 TON', probability: 0.05 },      // 3.5% (увеличено)
    { img: item9, price: '7 TON', probability: 0.1 },       // 5.5% (увеличено)
    { img: item5, price: '4 TON', probability: 0.2 },       // 7.5% (уменьшено)
    { img: cardton3, price: '2 TON', probability: 0.26 },     // 11% (уменьшено)
    { img: item7, price: '1.7 TON', probability: 0.23 },      // 14% (уменьшено)
    { img: item6, price: '1.7 TON', probability: 0.22 },      // 14% (уменьшено)
    { img: cardton3, price: '1.5 TON', probability: 0.22 },   // 18% (уменьшено)
    { img: cardton3, price: '1 TON', probability: 0.22 }      // 22% (уменьшено)
  ];

  const normalProbabilities = [
    { img: item11, price: '1800 TON' },
    { img: item10, price: '150 TON' },
    { img: item1, price: '30 TON' },
    { img: item4, price: '26 TON' },
    { img: item2, price: '12 TON' },
    { img: item3, price: '11 TON' },
    { img: item8, price: '10 TON' },
    { img: item9, price: '7 TON' },
    { img: item5, price: '4 TON' },
    { img: cardton3, price: '2 TON' },
    { img: item7, price: '1.7 TON' },
    { img: item6, price: '1.7 TON' },
    { img: cardton3, price: '1.5 TON' },
    { img: cardton3, price: '1 TON' }
  ];

  const frameContents = isDemoMode ? demoProbabilities : normalProbabilities;

  const scrollerRef = useRef(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [targetItemIndex, setTargetItemIndex] = useState(null);
  const [frames, setFrames] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [winningItem, setWinningItem] = useState(null);
  const [particles, setParticles] = useState([]);
  const [glowOpacity, setGlowOpacity] = useState(0);
  const [hasCharged, setHasCharged] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const animationRef = useRef(null);

  const isCardtonItem = (item) => {
    return item && item.img === cardton3;
  };

  const getRandomItemIndex = () => {
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
      if (demoBalance < 4) {
        alert("Not enough TON in demo balance!");
        onNavigate('card3');
        return;
      }
      removeFromDemoBalance(4);
      setHasCharged(true);
    }

    const serverResultIndex = getRandomItemIndex();
    setTargetItemIndex(serverResultIndex);
    const newFrames = generateFrames(serverResultIndex);
    setFrames(newFrames);
    setIsSpinning(true);
    setWinningItem(frameContents[serverResultIndex]);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      startSpin();
    }, 100);

    return () => clearTimeout(timer);
  }, []);

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

  const handleSell = () => {
    if (isProcessing) return;
    setIsProcessing(true);

    if (isDemoMode && winningItem) {
      const priceValue = parseFloat(winningItem.price.replace(/[^\d.-]/g, ''));
      addToDemoBalance(priceValue);
    }

    setShowModal(false);
    onNavigate('card3');
    setIsProcessing(false);
  };

  const handleAddToInventory = () => {
    if (isProcessing) return;
    setIsProcessing(true);

    if (isDemoMode && winningItem) {
      addToDemoInventory(winningItem);
    }

    setShowModal(false);
    onNavigate('card3');
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
        const glowProgress = Math.min((elapsed - glowStartTime) / 400, 1);
        setGlowOpacity(glowProgress);
      }

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        const exactTargetScroll = targetFrameIndex * totalFrameWidth - (visibleWidth / 2) + (frameWidth / 2);
        scroller.scrollLeft = exactTargetScroll;
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
            
            {isCardtonItem(winningItem) ? (
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