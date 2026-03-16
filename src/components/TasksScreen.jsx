import React, { useState, useEffect } from 'react';
import '../styles/TasksScreen.css';
import MainLayout from './MainLayout';
import coinIcon from '../assets/Tasks/coin.png';
import leaderboardImage from '../assets/Tasks/leaderboard.png';
import inviteBg from '../assets/MainPage/invite1.png'; // Импортируем фон для кнопки INVITE
import linkIcon from '../assets/MainPage/link.svg'; // Импортируем иконку ссылки
import { usersApi, authApi } from '../utils/api';

export default function TasksScreen({ onNavigate }) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [balance, setBalance] = useState(0);
  const [quests, setQuests] = useState([]);
  const [completedQuests, setCompletedQuests] = useState([]);
  const [isClaiming, setIsClaiming] = useState(false);
  const [showCopyToast, setShowCopyToast] = useState(false);
  const [isToastHiding, setIsToastHiding] = useState(false);

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

  // Функция для получения реферальной ссылки
  const getReferralLink = () => {
    // Здесь нужно получить реферальный код пользователя
    // Пока используем заглушку
    return 'https://t.me/Bouncecase_bot?start=15-8785';
  };

  // Обработчик для кнопки INVITE
  const handleInviteClick = () => {
    const link = getReferralLink();
    if (!link) return;

    const message = `Join me on Bounce! Play games, open cases, and win!\n\n${link}`;
    
    if (window.Telegram?.WebApp) {
      const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent('Join me on Bounce!')}`;
      window.Telegram.WebApp.openTelegramLink(shareUrl);
    } else {
      window.open(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent('Join me on Bounce!')}`, '_blank');
    }
  };

  // Обработчик для кнопки копирования ссылки
  const handleLinkClick = async () => {
    const link = getReferralLink();
    if (!link) return;

    try {
      await navigator.clipboard.writeText(link);
      
      setShowCopyToast(true);
      setIsToastHiding(false);
      
      setTimeout(() => {
        setIsToastHiding(true);
        setTimeout(() => {
          setShowCopyToast(false);
          setIsToastHiding(false);
        }, 300);
      }, 1300);
    } catch (error) {
      console.error('Failed to copy link:', error);
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
            className={`claim-all-button ${!hasClaimableRewards ? 'claim-all-button--disabled' : ''}`} 
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
                        onInviteClick={handleInviteClick}
                        onLinkClick={handleLinkClick}
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
                        onInviteClick={handleInviteClick}
                        onLinkClick={handleLinkClick}
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

      {/* Toast уведомление */}
      {showCopyToast && (
        <div className={`tasks-toast_notification ${isToastHiding ? 'tasks-toast_hide' : ''}`}>
          <span className="tasks-toast_icon">✓</span>
          <span className="tasks-toast_text">Link copied</span>
        </div>
      )}
    </MainLayout>
  );
}

function TaskItem({ quest, coinIcon, onClaim, isClaiming, onInviteClick, onLinkClick }) {
  const isClaimable = quest.completed && !quest.claimed;
  const isCompleted = quest.completed && quest.claimed;
  
  // Проверяем, нужно ли показывать дополнительные кнопки
  const hasActionButton = quest.id === 16 || quest.id === 17; // Subscribe и Boost
  const isInviteQuest = quest.id === 18; // Invite Friends

  const handleAction = () => {
    if (quest.id === 16) {
      // Подписка на канал
      window.Telegram.WebApp.openTelegramLink('https://t.me/bounce_case');
    } else if (quest.id === 17) {
      // Буст канала - открываем диалог буста
      window.Telegram.WebApp.openTelegramLink('https://t.me/bounce_case?boost');
    }
  };

  const handleClaim = async () => {
    if (isClaimable && onClaim && !isClaiming) {
      await onClaim(quest.id);
    }
  };

  const progress = quest.current_progress || quest.progress || 0;
  const target = quest.required_progress || quest.target || 1;
  
  // Форматируем прогресс для бесконечных заданий
  const displayTarget = quest.id === 18 ? '∞' : target;

  return (
    <div className={`task-item ${isCompleted ? 'task-item--completed' : ''}`}>
      <div className={`task-content ${isCompleted ? 'task-content--completed' : ''}`}>
        <div className="task-text">
          <div className="task-title">{quest.title || 'Quest'}</div>
        </div>
        {!isCompleted && (
          <div className="task-progress">
            {progress}/{displayTarget}
          </div>
        )}
      </div>

      {!isCompleted && isInviteQuest && (
        <>
          {/* Две кнопки как в рефералке для Invite Friends */}
          <div className="task-invite-buttons-row">
            {/* Левая кнопка с фоном и надписью INVITE */}
            <div 
              className="task-invite-button task-invite-button-left"
              onClick={onInviteClick}
            >
              <img src={inviteBg} alt="" className="task-invite-button-bg" />
              <span className="task-invite-button-text">INVITE</span>
            </div>

            {/* Правая кнопка с иконкой ссылки */}
            <div 
              className="task-invite-button task-invite-button-right"
              onClick={onLinkClick}
            >
              <img src={linkIcon} alt="Copy link" className="task-invite-link-icon" />
            </div>
          </div>

          {/* Кнопка CLAIM под кнопками приглашения */}
          <button 
            className={`task-claim-button-full ${!isClaimable ? 'task-claim-button-full--disabled' : ''}`} 
            disabled={!isClaimable || isClaiming}
            onClick={handleClaim}
          >
            <span className="task-claim-button-full-text">
              {isClaiming ? 'CLAIMING...' : 'CLAIM'}
            </span>
            <div className="task-claim-reward">
              <span className="task-claim-amount">{quest.reward_coins || 0}</span>
              <img src={coinIcon} alt="Reward Coin" className="task-claim-coin" />
            </div>
          </button>
        </>
      )}

      {!isCompleted && hasActionButton && !isInviteQuest && (
        <div className="task-action-container">
          <button 
            className="task-action-button"
            onClick={handleAction}
          >
            {quest.id === 16 ? 'OPEN CHANNEL' : 'BOOST'}
          </button>
          <button 
            className={`task-claim-button-half ${!isClaimable ? 'task-claim-button-half--disabled' : ''}`}
            disabled={!isClaimable || isClaiming}
            onClick={handleClaim}
          >
            <span className="task-claim-button-half-text">CLAIM</span>
            <div className="task-claim-reward">
              <span className="task-claim-amount">{quest.reward_coins || 0}</span>
              <img src={coinIcon} alt="Reward Coin" className="task-claim-coin" />
            </div>
          </button>
        </div>
      )}

      {!isCompleted && !hasActionButton && !isInviteQuest && (
        <button 
          className={`task-claim-button-full ${!isClaimable ? 'task-claim-button-full--disabled' : ''}`} 
          disabled={!isClaimable || isClaiming}
          onClick={handleClaim}
        >
          <span className="task-claim-button-full-text">
            {isClaiming ? 'CLAIMING...' : 'CLAIM'}
          </span>
          <div className="task-claim-reward">
            <span className="task-claim-amount">{quest.reward_coins || 0}</span>
            <img src={coinIcon} alt="Reward Coin" className="task-claim-coin" />
          </div>
        </button>
      )}

      {isCompleted && (
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
  
  // Форматируем прогресс для бесконечных заданий
  const displayTarget = quest.id === 18 ? '∞' : target;

  return (
    <div className="task-item task-item--completed">
      <div className="task-content task-content--completed">
        <div className="task-text">
          <div className="task-title">{quest.title || 'Quest'}</div>
        </div>
        <div className="task-progress task-progress--completed">
          {progress}/{displayTarget}
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