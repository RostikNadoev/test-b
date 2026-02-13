// components/MainLayout.jsx
import '../styles/MainScreen.css';
import Header from './Header';
import { useDemo } from '../contexts/DemoContext';

import foot from '../assets/MainPage/foot.png';
import footover from '../assets/MainPage/foot-on.svg';
import pvpicon from '../assets/MainPage/pvp-icon.svg';
import homeicon from '../assets/MainPage/home-icon.svg';
import tasksicon from '../assets/MainPage/tasks-icon.svg';

export default function MainLayout({ 
  children, 
  onNavigate, 
  currentScreen = 'main', 
  hideFooter = false, 
  customBackground = null 
}) {
  const { isDemoMode } = useDemo();

  return (
    <div 
      className="main-screen"
      style={customBackground ? { 
        backgroundImage: `url(${customBackground})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed'
      } : {}}
    >
      <Header onNavigate={onNavigate} />

      <main className="main-content">
        {children}
      </main>

      {!hideFooter && (
        <footer className="main-footer">
          <div className="footer-blocks-container">
            {/* PVP кнопка - disabled в демо-режиме */}
            <div 
              className={`footer-block-item ${currentScreen === 'pvp' ? 'footer-block-item--active' : ''} ${isDemoMode ? 'footer-block-item--disabled' : ''}`} 
              onClick={!isDemoMode ? () => onNavigate('pvp') : undefined}
            >
              {currentScreen === 'pvp' && <div className="footer-active-indicator"></div>}
              <div className="footer-block-wrapper">
                <img src={foot} alt="block" className="footer-block"/>
                <img src={pvpicon} alt="PVP" className="footer-block-icon"/>
                <img src={footover} alt="decoration" className="footer-block-overlay"/>
              </div>
              <span className="footer-label">PVP</span>
            </div>
            
            {/* MAIN кнопка - всегда активна */}
            <div 
              className={`footer-block-item ${currentScreen === 'main' ? 'footer-block-item--active' : ''}`} 
              onClick={() => onNavigate('main')}
            >
              {currentScreen === 'main' && <div className="footer-active-indicator"></div>}
              <div className="footer-block-wrapper">
                <img src={foot} alt="block" className="footer-block"/>
                <img src={homeicon} alt="HOME" className="footer-block-icon"/>
                <img src={footover} alt="decoration" className="footer-block-overlay"/>
              </div>
              <span className="footer-label">MAIN</span>
            </div>
            
            {/* TASKS кнопка - disabled в демо-режиме */}
            <div 
              className={`footer-block-item ${currentScreen === 'tasks' ? 'footer-block-item--active' : ''} ${isDemoMode ? 'footer-block-item--disabled' : ''}`} 
              onClick={!isDemoMode ? () => onNavigate('tasks') : undefined}
            >
              {currentScreen === 'tasks' && <div className="footer-active-indicator"></div>}
              <div className="footer-block-wrapper">
                <img src={foot} alt="block" className="footer-block"/>
                <img src={tasksicon} alt="TASKS" className="footer-block-icon"/>
                <img src={footover} alt="decoration" className="footer-block-overlay"/>
              </div>
              <span className="footer-label">TASKS</span>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}