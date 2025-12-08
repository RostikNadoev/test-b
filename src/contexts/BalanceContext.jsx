import React, { createContext, useState, useContext, useEffect } from 'react';
import { authApi, tonApi } from '../utils/api';

const BalanceContext = createContext();

export const useBalance = () => useContext(BalanceContext);

export const BalanceProvider = ({ children }) => {
  const [balance, setBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState(null);

  // Загружаем баланс
  const loadBalance = async () => {
    try {
      setIsLoading(true);
      const user = authApi.getCurrentUser();
      if (user) {
        const data = await authApi.getMe();
        setBalance(data.user.balance_ton || 0);
        console.log('Balance loaded:', data.user.balance_ton);
      }
    } catch (error) {
      console.error('Error loading balance:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Проверяем достаточно ли баланса
  const checkBalance = (requiredAmount) => {
    return balance >= requiredAmount;
  };

  // Открываем модалку пополнения
  const openTopUpModal = (amount = null) => {
    setTopUpAmount(amount);
    setShowTopUpModal(true);
  };

  // Закрываем модалку пополнения
  const closeTopUpModal = () => {
    setShowTopUpModal(false);
    setTopUpAmount(null);
  };

  // Обновляем баланс после успешной оплаты
  const updateBalance = async () => {
    await loadBalance();
  };

  useEffect(() => {
    loadBalance();
    
    // Обновляем баланс каждые 30 секунд
    const interval = setInterval(loadBalance, 30000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <BalanceContext.Provider
      value={{
        balance,
        isLoading,
        showTopUpModal,
        topUpAmount,
        loadBalance,
        checkBalance,
        openTopUpModal,
        closeTopUpModal,
        updateBalance
      }}
    >
      {children}
    </BalanceContext.Provider>
  );
};