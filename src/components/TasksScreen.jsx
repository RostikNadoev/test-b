import React, { useState, useEffect } from 'react';
import '../styles/TasksScreen.css';
import MainLayout from './MainLayout';
import coinIcon from '../assets/Tasks/coin.png';
import leaderboardImage from '../assets/Tasks/leaderboard.png';
import { usersApi, authApi } from '../utils/api';

export default function TasksScreen({ onNavigate }) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [balance, setBalance] = useState(0);
  const [quests, setQuests] = useState([]);
  const [completedQuests, setCompletedQuests] = useState([]);
  const [isClaiming, setIsClaiming] = useState(false);

  // Форматирование баланса
  const formatBalance = (value) => {
    return Math.floor(value);
  };

  // Загрузка баланса через usersApi
  const loadBalance = async () => {
    try {
      const data = await usersApi.getBalance();
      if (data && data.balances && typeof data.balances.coins !== 'undefined') {
        setBalance(data.balances.coins);
        console.log('💰 Balance loaded:', data.balances.coins);
      }
    } catch (err) {
      console.error('❌ Error loading balance:', err);
    }
  };

  // Загрузка квестов через usersApi
  const loadQuests = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const data = await usersApi.getQuests();
      
      if (data && data.quests) {
        // Активные квесты: не завершены ИЛИ завершены но не забраны
        const active = data.quests.filter(quest => 
          !quest.completed || (quest.completed && !quest.claimed)
        );
        
        // Завершенные и забранные квесты
        const completed = data.quests.filter(quest => 
          quest.completed && quest.claimed
        );
        
        setQuests(active);
        setCompletedQuests(completed);
        console.log('🎯 Quests loaded:', { 
          active: active.length, 
          completed: completed.length 
        });
      }
    } catch (err) {
      console.error('❌ Error loading quests:', err);
      setError('Failed to load quests. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  // Функция для получения награды через usersApi
  const claimReward = async (questId) => {
    if (isClaiming) return false;
    
    try {
      setIsClaiming(true);
      console.log(`🎁 Claiming reward for quest ${questId}...`);
      
      const data = await usersApi.claimQuest(questId);
      
      console.log('✅ Claim response:', data);
      
      if (data.message === 'Quest reward claimed' || data.quest) {
        console.log('🎉 Reward claimed for quest:', questId);
        
        // Обновляем баланс из ответа
        if (data.balances && typeof data.balances.coins !== 'undefined') {
          setBalance(data.balances.coins);
          authApi.updateUserData({ balance: data.balances.coins });
        }
        
        // Обновляем локальное состояние квестов
        setQuests(prevQuests => 
          prevQuests.map(quest => 
            quest.id === questId 
              ? { ...quest, claimed: true, completed: true }
              : quest
          )
        );
        
        // Перемещаем забранный квест в завершенные
        const claimedQuest = quests.find(q => q.id === questId);
        if (claimedQuest) {
          setCompletedQuests(prev => [
            { ...claimedQuest, claimed: true, completed: true },
            ...prev
          ]);
          
          // Удаляем из активных квестов
          setQuests(prev => prev.filter(q => q.id !== questId));
        }
        
        // Перезагружаем данные после небольшой задержки
        setTimeout(() => {
          loadQuests();
          loadBalance();
        }, 500);
        
        return true;
      } else {
        console.warn('⚠️ Unexpected response format:', data);
        setTimeout(() => {
          loadQuests();
          loadBalance();
        }, 500);
        return true;
      }
    } catch (err) {
      console.error('❌ Error claiming reward:', err);
      const errorMessage = err.response?.data?.message || 'Failed to claim reward. Please try again.';
      alert(errorMessage);
      return false;
    } finally {
      setIsClaiming(false);
    }
  };

  // Функция для забора всех наград
  const claimAllRewards = async () => {
    if (isClaiming) return;
    
    const claimableQuests = quests.filter(q => q.completed && !q.claimed);
    
    if (claimableQuests.length === 0) {
      alert('No rewards available to claim!');
      return;
    }
    
    try {
      setIsClaiming(true);
      
      for (const quest of claimableQuests) {
        const success = await claimReward(quest.id);
        if (!success) {
          console.warn(`Failed to claim quest ${quest.id}, continuing with others...`);
        }
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      
      console.log(`✅ All rewards claimed`);
    } catch (err) {
      console.error('❌ Error mass claiming rewards:', err);
    } finally {
      setIsClaiming(false);
    }
  };

  // Загрузка данных при монтировании
  useEffect(() => {
    const loadData = async () => {
      await Promise.all([loadBalance(), loadQuests()]);
    };
    
    loadData();
    
    const handleFocus = () => {
      loadBalance();
      loadQuests();
    };
    
    document.addEventListener('visibilitychange', handleFocus);
    
    return () => {
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, []);

  // Проверяем есть ли доступные для забора награды
  const hasClaimableRewards = quests.some(q => q.completed && !q.claimed);

  // Разделяем квесты на ежедневные (id 13 и 14) и остальные
  const dailyQuests = quests.filter(q => q.id === 13 || q.id === 14);
  const otherQuests = quests.filter(q => q.id !== 13 && q.id !== 14);

  if (error) {
    return (
      <MainLayout onNavigate={onNavigate} currentScreen="tasks">
        <div className="tasks-content-section">
          <div className="error-message">
            <p>{error}</p>
            <button onClick={loadQuests}>Try Again</button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout onNavigate={onNavigate} currentScreen="tasks">
      <div className="tasks-content-section">
        <div className="tasks-leaderboard-image-container">
          <img 
            src={leaderboardImage} 
            alt="Leaderboard" 
            className="tasks-leaderboard-image" 
          />
        </div>

        <div className="tasks-header">
          <div className="coin-balance-container">
            <img src={coinIcon} alt="Coin" className="coin-icon" />
            <span className="coin-balance">{formatBalance(balance)}</span>
          </div>
          <button 
            className={`claim-all-button ${!hasClaimableRewards ? 'claim-all-button--disabled' : 'claim-all-button--pulse'}`} 
            disabled={!hasClaimableRewards}
            onClick={claimAllRewards}
          >
            {isClaiming ? 'CLAIMING...' : 'CLAIM ALL'}
          </button>
        </div>

        <div className="tasks-main-content">
          {isLoading ? (
            <div className="loading-spinner">Loading quests...</div>
          ) : (
            <>
              {/* Ежедневные задания */}
              {dailyQuests.length > 0 && (
                <>
                  <div className="completed-tasks-header-container">
                    <h2 className="completed-tasks-header">Daily tasks</h2>
                  </div>
                  <div className="active-tasks-list">
                    {dailyQuests.map(quest => (
                      <TaskItem 
                        key={quest.id} 
                        quest={quest} 
                        coinIcon={coinIcon}
                        onClaim={claimReward}
                        isClaiming={isClaiming}
                      />
                    ))}
                  </div>
                </>
              )}

              {/* Остальные задания */}
              {otherQuests.length > 0 && (
                <>
                  <div className="completed-tasks-header-container">
                    <h2 className="completed-tasks-header">General tasks</h2>
                  </div>
                  <div className="active-tasks-list">
                    {otherQuests.map(quest => (
                      <TaskItem 
                        key={quest.id} 
                        quest={quest} 
                        coinIcon={coinIcon}
                        onClaim={claimReward}
                        isClaiming={isClaiming}
                      />
                    ))}
                  </div>
                </>
              )}

              {/* Сообщение если нет активных заданий */}
              {dailyQuests.length === 0 && otherQuests.length === 0 && (
                <div className="no-tasks-message">No active quests</div>
              )}

              {/* Завершенные задания */}
              {completedQuests.length > 0 && (
                <>
                  <div className="completed-tasks-header-container">
                    <h2 className="completed-tasks-header">Completed tasks</h2>
                  </div>

                  <div className="completed-tasks-list">
                    {completedQuests.map(quest => (
                      <CompletedTaskItem 
                        key={`completed-${quest.id}`} 
                        quest={quest} 
                        coinIcon={coinIcon} 
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </MainLayout>
  );
}

function TaskItem({ quest, coinIcon, onClaim, isClaiming }) {
  const isClaimable = quest.completed && !quest.claimed;
  const isCompleted = quest.completed && quest.claimed;

  const handleClaim = async () => {
    if (isClaimable && onClaim && !isClaiming) {
      await onClaim(quest.id);
    }
  };

  const progress = quest.current_progress || quest.progress || 0;
  const target = quest.required_progress || quest.target || 1;

  return (
    <div className={`task-item ${isCompleted ? 'task-item--completed' : ''}`}>
      <div className={`task-content ${isCompleted ? 'task-content--completed' : ''}`}>
        <div className="task-text">
          <div className="task-title">{quest.title || 'Quest'}</div>
        </div>
        {!isCompleted && (
          <div className="task-progress">
            {progress}/{target}
          </div>
        )}
      </div>

      {!isCompleted ? (
        <button 
          className={`task-claim-button ${!isClaimable ? 'task-claim-button--disabled' : 'task-claim-button--pulse'}`} 
          disabled={!isClaimable || isClaiming}
          onClick={handleClaim}
        >
          <span className="task-claim-button-text">
            {isClaiming ? 'CLAIMING...' : 'CLAIM'}
          </span>
          <div className="task-claim-reward">
            <span className="task-claim-amount">{quest.reward_coins || 0}</span>
            <img src={coinIcon} alt="Reward Coin" className="task-claim-coin" />
          </div>
        </button>
      ) : (
        <div className="task-completed-reward-container">
          <div className="task-claim-reward task-claim-reward--disabled">
            <span className="task-claim-amount task-claim-amount--disabled">
              {quest.reward_coins || 0}
            </span>
            <img 
              src={coinIcon} 
              alt="Reward Coin" 
              className="task-claim-coin task-claim-coin--disabled" 
            />
          </div>
        </div>
      )}
    </div>
  );
}

function CompletedTaskItem({ quest, coinIcon }) {
  const progress = quest.current_progress || quest.progress || 1;
  const target = quest.required_progress || quest.target || 1;

  return (
    <div className="task-item task-item--completed">
      <div className="task-content task-content--completed">
        <div className="task-text">
          <div className="task-title">{quest.title || 'Quest'}</div>
        </div>
        <div className="task-progress task-progress--completed">
          {progress}/{target}
        </div>
      </div>

      <div className="task-completed-reward-container">
        <div className="task-claim-reward task-claim-reward--disabled">
          <span className="task-claim-amount task-claim-amount--disabled">
            {quest.reward_coins || 0}
          </span>
          <img 
            src={coinIcon} 
            alt="Reward Coin" 
            className="task-claim-coin task-claim-coin--disabled" 
          />
        </div>
      </div>
    </div>
  );
}