// components/CasesScreen.jsx
import '../styles/CasesScreen.css';
import Header from './Header';
// Импортируем тот же фон что и в Plinko/Rocket
import rocketBack from '../assets/Plinko/Back.png';

export default function CasesScreen({ 
  onNavigate, 
  currentCardIndex = 2 
}) {
  return (
    <div 
      className="cases-screen"
      style={{
        backgroundImage: `url(${rocketBack})`,
        backgroundSize: '100% 100%',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center'
      }}
    >
      {/* Добавляем variant="cases" для специального стиля хедера */}
      <Header onNavigate={onNavigate} variant="cases" />

      <main className="cases-content">
        <div className="cases-container">
          <h1 className="cases-title">Cases Screen</h1>
          <p className="cases-description">
          </p>
        </div>
      </main>
    </div>
  );
}