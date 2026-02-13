import React, { createContext, useState, useContext, useCallback } from 'react';
import { authApi, usersApi } from '../utils/api';

const BalanceContext = createContext();

export const useBalance = () => useContext(BalanceContext);

export const BalanceProvider = ({ children }) => {
  const [balances, setBalances] = useState({ 
    ton: 0, 
    stars: 0, 
    coins: 0 
  });
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  
  // Загружаем балансы
  const loadBalances = useCallback(async () => {
    try {
      setIsLoading(true);
      
      const user = authApi.getCurrentUser();
      if (!user) return;
      
      // Получаем свежие балансы
      const response = await usersApi.getBalance();
      
      if (response.balances) {
        setBalances(response.balances);
        setLastUpdate(new Date());
        
        // Обновляем данные пользователя в localStorage
        const userData = authApi.getCurrentUser();
        if (userData) {
          authApi.updateUserData({
            balance_ton: response.balances.ton || 0,
            balance_stars: response.balances.stars || 0,
            balance_coins: response.balances.coins || 0
          });
        }
        
        console.log('💰 Balances loaded:', response.balances);
      }
    } catch (error) {
      console.error('Error loading balances:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Обновляем конкретный баланс
  const updateBalance = useCallback((currency, amount) => {
    setBalances(prev => ({
      ...prev,
      [currency]: prev[currency] + amount
    }));
    
    // Обновляем localStorage
    const userData = authApi.getCurrentUser();
    if (userData) {
      authApi.updateUserData({
        [`balance_${currency}`]: (userData[`balance_${currency}`] || 0) + amount
      });
    }
    
    console.log(`💰 Balance updated: ${currency} += ${amount}`);
  }, []);

  // Устанавливаем новые балансы
  const setNewBalances = useCallback((newBalances) => {
    setBalances(newBalances);
    setLastUpdate(new Date());
    
    // Обновляем localStorage
    const userData = authApi.getCurrentUser();
    if (userData) {
      authApi.updateUserData({
        balance_ton: newBalances.ton || 0,
        balance_stars: newBalances.stars || 0,
        balance_coins: newBalances.coins || 0
      });
    }
  }, []);

  // Проверяем достаточно ли баланса
  const checkBalance = useCallback((currency, requiredAmount) => {
    const currentBalance = balances[currency] || 0;
    return currentBalance >= requiredAmount;
  }, [balances]);

  // Событие для обновления балансов в реальном времени
  const emitBalanceUpdate = useCallback(() => {
    const event = new CustomEvent('balanceUpdate', { detail: { balances } });
    window.dispatchEvent(event);
  }, [balances]);

  return (
    <BalanceContext.Provider
      value={{
        balances,
        isLoading,
        lastUpdate,
        loadBalances,
        updateBalance,
        setNewBalances,
        checkBalance,
        emitBalanceUpdate
      }}
    >
      {children}
    </BalanceContext.Provider>
  );
};