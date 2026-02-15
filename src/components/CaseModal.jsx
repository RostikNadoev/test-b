// components/CaseModal.jsx
import { useEffect } from 'react';
import '../styles/CaseModal.css';

export default function CaseModal({ caseItem, onClose }) {
  useEffect(() => {
    // Блокируем скролл body при открытии модалки
    document.body.style.overflow = 'hidden';
    
    return () => {
      // Возвращаем скролл при закрытии
      document.body.style.overflow = 'unset';
    };
  }, []);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container">
        <div className="case-modal" onClick={(e) => e.stopPropagation()}>
          <button className="modal-close" onClick={onClose}>×</button>
          <h2 className="modal-title">{caseItem.title}</h2>
          <img 
            src={caseItem.image} 
            alt={caseItem.title}
            className="modal-image"
          />
          <div className="modal-content">
            <p>Содержимое кейса {caseItem.title}</p>
            <p>Цена: {caseItem.tonPrice} TON / {caseItem.starsPrice} STARS</p>
          </div>
        </div>
      </div>
    </div>
  );
}