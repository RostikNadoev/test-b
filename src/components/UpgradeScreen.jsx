import React from 'react';
import Header from './Header';
import rocketBack from '../assets/Plinko/Back.png';
import '../styles/UpgradeScreen.css';

export default function UpgradeScreen({ onNavigate }) {
  return (
    <div 
      className="upgrade-screen"
      style={{
        backgroundImage: `url(${rocketBack})`,
        backgroundSize: 'cover',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center'
      }}
    >
      <div className="upgrade-header-wrapper">
        <Header onNavigate={onNavigate} variant="upgrade" />
      </div>
      
      <main className="upgrade-content">
        <div className="upgrade-container">
          {/* Здесь будет контент страницы апгрейда */}
          <div className="upgrade-placeholder">
            <h2 className="upgrade-placeholder-title">Upgrade</h2>
            <p className="upgrade-placeholder-text">Coming Soon</p>
          </div>
        </div>
      </main>
    </div>
  );
}