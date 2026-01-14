import '../styles/CardScreen.css';
import Header from './Header';

export default function CardScreen({ 
  children, 
  onNavigate, 
  cardData,
  cardImage,
  cardMainImage,
  cardTonImage,
  currentCardIndex = 2
}) {
  
  const handleClose = () => {
    onNavigate('main', currentCardIndex);
  };

  return (
    <div className="card-screen">
      {/* Используем компонент Header */}
      <Header onNavigate={onNavigate} />

      {/* Контент карточки */}
      <main className="card-content">
        {children}
      </main>

      {/* Футер УБРАН - вместо него используется Telegram BackButton */}
    </div>
  );
}