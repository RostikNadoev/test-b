// components/CasesScreen.jsx
import '../styles/CasesScreen.css';
import Header from './Header';

export default function CasesScreen({ 
  onNavigate, 
  currentCardIndex = 2 
}) {
  return (
    <div className="cases-screen">
      <Header onNavigate={onNavigate} />

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