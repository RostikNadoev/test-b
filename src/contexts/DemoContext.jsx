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
  const [demoBalances, setDemoBalances] = useState({
    ton: 100,
    stars: 1000
  });
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

  // Автоматическое пополнение TON баланса если меньше 2
  useEffect(() => {
    if (isDemoMode && demoBalances.ton < 2) {
      setDemoBalances(prev => ({
        ...prev,
        ton: 100
      }));
    }
  }, [demoBalances.ton, isDemoMode]);

  // Загружаем состояние из localStorage при монтировании
  useEffect(() => {
    const savedDemoMode = localStorage.getItem('demoMode');
    const savedDemoBalances = localStorage.getItem('demoBalances');
    const savedDemoInventory = localStorage.getItem('demoInventory');
    const savedDemoGiftCount = localStorage.getItem('demoGiftCount');

    if (savedDemoMode) {
      setIsDemoMode(JSON.parse(savedDemoMode));
    }
    if (savedDemoBalances) {
      setDemoBalances(JSON.parse(savedDemoBalances));
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
    localStorage.setItem('demoBalances', JSON.stringify(demoBalances));
  }, [demoBalances]);

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

  // Обновленные функции для работы с разными валютами
  const removeFromDemoBalance = (amount, currency = 'ton') => {
    setDemoBalances(prev => ({
      ...prev,
      [currency.toLowerCase()]: Math.max(0, prev[currency.toLowerCase()] - amount)
    }));
  };

  const addToDemoBalance = (amount, currency = 'ton') => {
    setDemoBalances(prev => ({
      ...prev,
      [currency.toLowerCase()]: prev[currency.toLowerCase()] + amount
    }));
  };

  // Функция для проверки достаточности баланса
  const checkDemoBalance = (amount, currency = 'ton') => {
    return demoBalances[currency.toLowerCase()] >= amount;
  };

  // Функция для получения конкретного баланса
  const getDemoBalance = (currency = 'ton') => {
    return demoBalances[currency.toLowerCase()] || 0;
  };

  const removeFromDemoInventory = (index) => {
    setDemoInventory(prev => prev.filter((_, i) => i !== index));
  };

  const clearDemoInventory = () => {
    setDemoInventory([]);
  };

  const value = {
    isDemoMode,
    demoBalances, // Объект с обоими балансами
    demoInventory,
    demoGiftCount,
    toggleDemoMode,
    addToDemoInventory,
    removeFromDemoBalance,
    addToDemoBalance,
    checkDemoBalance,
    getDemoBalance,
    removeFromDemoInventory,
    clearDemoInventory,
    setDemoGiftCount,
    formatBalance
  };

  return (
    <DemoContext.Provider value={value}>
      {children}
    </DemoContext.Provider>
  );
};