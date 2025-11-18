import '../styles/MainScreen.css';

import ava from '../assets/MainPage/ava.jpg';
import ton from '../assets/MainPage/ton.svg';
import add_balance from '../assets/MainPage/add_balance.svg';
import foot from '../assets/MainPage/foot.png';
import footover from '../assets/MainPage/foot-on.svg';
import pvpicon from '../assets/MainPage/pvp-icon.svg';
import homeicon from '../assets/MainPage/home-icon.svg';
import tasksicon from '../assets/MainPage/tasks-icon.svg';

export default function MainLayout({ children, onNavigate, currentScreen = 'main', hideFooter = false, customBackground = null }) {
  // Если задан кастомный фон, то не используем стандартный фон из main-screen
  const layoutClassName = customBackground ? 
    "main-screen-no-bg" : 
    "main-screen";

  return (
    <div className={layoutClassName}>
      {/* Header */}
      <header className="header-outer">
        <div className="header-inner">
          <div className="user-info" onClick={() => onNavigate('profile')}>
            <img src={ava} alt="User" className="user-avatar" loading="lazy" />
            <span className="user-username">Username</span>

            <div className="balance-container">
              <img src={ton} alt="TON" className="balance-icon" />
              <span className="balance-amount">1337</span>
            </div>

            <div className="add_balance-button">
              <img src={add_balance} alt="add" className="add_balance-icon" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="main-content">
        {children}
      </main>

      {/* Footer - отображаем только если не скрыт */}
      {!hideFooter && (
        <footer className="main-footer">
          <div className="footer-blocks-container">
            <div className={`footer-block-item ${currentScreen === 'pvp' ? 'footer-block-item--active' : ''}`} onClick={() => onNavigate('pvp')}>
              {currentScreen === 'pvp' && <div className="footer-active-indicator"></div>}
              <div className="footer-block-wrapper">
                <img src={foot} alt="block" className="footer-block"/>
                <img src={pvpicon} alt="PVP" className="footer-block-icon"/>
                <img src={footover} alt="decoration" className="footer-block-overlay"/>
              </div>
              <span className="footer-label">PVP</span>
            </div>
            
            <div className={`footer-block-item ${currentScreen === 'main' ? 'footer-block-item--active' : ''}`} onClick={() => onNavigate('main')}>
              {currentScreen === 'main' && <div className="footer-active-indicator"></div>}
              <div className="footer-block-wrapper">
                <img src={foot} alt="block" className="footer-block"/>
                <img src={homeicon} alt="HOME" className="footer-block-icon"/>
                <img src={footover} alt="decoration" className="footer-block-overlay"/>
              </div>
              <span className="footer-label">MAIN</span>
            </div>
            
            <div className={`footer-block-item ${currentScreen === 'tasks' ? 'footer-block-item--active' : ''}`} onClick={() => onNavigate('tasks')}>
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