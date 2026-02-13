import React, { useRef } from 'react';
import NeonPlinko from './NeonPlinko';
import Header from './Header';
import '../styles/PlinkoScreen.css';
// Импортируем тот же фон что и в Rocket (потом можно заменить)
import rocketBack from '../assets/Plinko/BackPinko.jpg';

export default function PlinkoScreen({ onNavigate }) {
  const plinkoRef = useRef();

  const handleDropBall = () => {
    if (plinkoRef.current) {
      console.log('Dropping ball...');
      plinkoRef.current.dropBall();
    }
  };

  return (
    <div 
      className="plinko-screen"
      style={{
        backgroundImage: `url(${rocketBack})`,
        backgroundSize: '100% 100%',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center'
      }}
    >
      <Header onNavigate={onNavigate} />
      
      <main className="plinko-content">
        <div className="plinko-container">
          <div className="plinko-game-area">
            <NeonPlinko ref={plinkoRef} />
          </div>
          
          <div className="plinko-controls">
            <button 
              className="plinko-drop-btn"
              onClick={handleDropBall}
            >
              DROP bALL1
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}