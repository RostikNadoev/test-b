// components/CaseModal.jsx
import '../styles/CasesScreen.css';

export default function CaseModal({ caseItem, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="case-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        
        <h2 className="modal-title">{caseItem.title}</h2>
        
        <img 
          src={caseItem.image} 
          alt={caseItem.title}
          className="modal-image"
        />
        
        <div className="modal-content">
          {/* Здесь будет контент модального окна */}
          <p>Содержимое кейса {caseItem.title}</p>
        </div>
      </div>
    </div>
  );
}