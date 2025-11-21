// components/Header.jsx
import '../styles/MainScreen.css';
import ava from '../assets/MainPage/ava.jpg';
import ton from '../assets/MainPage/ton.svg';
import add_balance from '../assets/MainPage/add_balance.svg';

export default function Header({ onNavigate, balance = "1337" }) {
  return (
    <header className="header-outer">
      <div className="header-inner">
        <div className="user-info" onClick={() => onNavigate('profile')}>
          <img src={ava} alt="User" className="user-avatar" loading="lazy" />
          <span className="user-username">Username</span>

          <div className="balance-container">
            <img src={ton} alt="TON" className="balance-icon" />
            <span className="balance-amount">{balance}</span>
          </div>

          <div className="add_balance-button">
            <img src={add_balance} alt="add" className="add_balance-icon" />
          </div>
        </div>
      </div>
    </header>
  );
}