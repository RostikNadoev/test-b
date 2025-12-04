// contexts/DemoContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';

const DemoContext = createContext();

export const useDemo = () => {
  const context = useContext(DemoContext);
  if (!context) {
    throw new Error('useDemo must be used within a DemoProvider');
  }
  return context;
};

export const DemoProvider = ({ children }) => {
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [demoBalance, setDemoBalance] = useState(500);
  const [demoInventory, setDemoInventory] = useState([]);
  const [demoGiftCount, setDemoGiftCount] = useState(0);

  // Функция для форматирования баланса до сотых
  const formatBalance = (balanceValue) => {
    if (typeof balanceValue === 'number') {
      return balanceValue.toFixed(2);
    }
    if (typeof balanceValue === 'string') {
      const num = parseFloat(balanceValue);
      return isNaN(num) ? '0.00' : num.toFixed(2);
    }
    return '0.00';
  };

  // Автоматическое пополнение баланса если меньше 2
  useEffect(() => {
    if (isDemoMode && demoBalance < 2) {
      setDemoBalance(500);
    }
  }, [demoBalance, isDemoMode]);

  // Загружаем состояние из localStorage при монтировании
  useEffect(() => {
    const savedDemoMode = localStorage.getItem('demoMode');
    const savedDemoBalance = localStorage.getItem('demoBalance');
    const savedDemoInventory = localStorage.getItem('demoInventory');
    const savedDemoGiftCount = localStorage.getItem('demoGiftCount');

    if (savedDemoMode) {
      setIsDemoMode(JSON.parse(savedDemoMode));
    }
    if (savedDemoBalance) {
      setDemoBalance(JSON.parse(savedDemoBalance));
    }
    if (savedDemoInventory) {
      setDemoInventory(JSON.parse(savedDemoInventory));
    }
    if (savedDemoGiftCount) {
      setDemoGiftCount(JSON.parse(savedDemoGiftCount));
    }
  }, []);

  // Сохраняем состояние в localStorage при изменении
  useEffect(() => {
    localStorage.setItem('demoMode', JSON.stringify(isDemoMode));
  }, [isDemoMode]);

  useEffect(() => {
    localStorage.setItem('demoBalance', JSON.stringify(demoBalance));
  }, [demoBalance]);

  useEffect(() => {
    localStorage.setItem('demoInventory', JSON.stringify(demoInventory));
  }, [demoInventory]);

  useEffect(() => {
    localStorage.setItem('demoGiftCount', JSON.stringify(demoGiftCount));
  }, [demoGiftCount]);

  const toggleDemoMode = () => {
    setIsDemoMode(!isDemoMode);
  };

  const addToDemoInventory = (item) => {
    setDemoInventory(prev => [...prev, item]);
  };

  const removeFromDemoBalance = (amount) => {
    setDemoBalance(prev => Math.max(0, prev - amount));
  };

  const addToDemoBalance = (amount) => {
    setDemoBalance(prev => prev + amount);
  };

  const removeFromDemoInventory = (index) => {
    setDemoInventory(prev => prev.filter((_, i) => i !== index));
  };

  // Новая функция для очистки всего инвентаря
  const clearDemoInventory = () => {
    setDemoInventory([]);
  };

  const value = {
    isDemoMode,
    demoBalance,
    demoInventory,
    demoGiftCount,
    toggleDemoMode,
    addToDemoInventory,
    removeFromDemoBalance,
    addToDemoBalance,
    removeFromDemoInventory,
    clearDemoInventory, // ← Добавляем новую функцию
    setDemoGiftCount,
    formatBalance
  };

  return (
    <DemoContext.Provider value={value}>
      {children}
    </DemoContext.Provider>
  );
};