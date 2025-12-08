import React, { useState, useEffect } from 'react';
import '../styles/TasksScreen.css';
import MainLayout from './MainLayout';
import coinIcon from '../assets/Tasks/coin.png';
import api, { usersApi, authApi } from '../utils/api';

export default function TasksScreen({ onNavigate }) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [balance, setBalance] = useState(85);
  const [quests, setQuests] = useState([]);
  const [completedQuests, setCompletedQuests] = useState([]);
  const [isClaiming, setIsClaiming] = useState(false);

  // Function to load balance
  const loadBalance = async () => {
    try {
      const response = await api.get('/api/v1/users/balance');
      const data = response.data?.balances || response?.balances;
      if (data && typeof data.coins !== 'undefined') {
        setBalance(data.coins);
        console.log('💰 Balance loaded:', data.coins);
      }
    } catch (err) {
      console.error('❌ Error loading balance:', err);
      // Keep default value
    }
  };

  // Function to load quests
  const loadQuests = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await api.get('/api/v1/quests/');
      const data = response.data || response;
      
      if (data && data.quests) {
        // Filter active quests: not completed OR completed but not claimed
        const active = data.quests.filter(quest => 
          !quest.completed || (quest.completed && !quest.claimed)
        );
        
        // Filter completed and claimed quests
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

  // Function to claim reward
  const claimReward = async (questId) => {
    if (isClaiming) return false;
    
    try {
      setIsClaiming(true);
      console.log(`🎁 Claiming reward for quest ${questId}...`);
      
      const response = await api.post(`/api/v1/quests/${questId}/claim`, {});
      const data = response.data || response;
      
      console.log('✅ Claim response:', data);
      
      if (data.message === 'Quest reward claimed' || data.quest) {
        console.log('🎉 Reward claimed for quest:', questId);
        
        // Update balance from response
        if (data.balances && typeof data.balances.coins !== 'undefined') {
          setBalance(data.balances.coins);
          authApi.updateUserData({ balance: data.balances.coins });
        }
        
        // Immediately update local quest state
        setQuests(prevQuests => 
          prevQuests.map(quest => 
            quest.id === questId 
              ? { ...quest, claimed: true, completed: true }
              : quest
          )
        );
        
        // Move claimed quest to completed list
        const claimedQuest = quests.find(q => q.id === questId);
        if (claimedQuest) {
          setCompletedQuests(prev => [
            { ...claimedQuest, claimed: true, completed: true },
            ...prev
          ]);
          
          // Remove from active quests
          setQuests(prev => prev.filter(q => q.id !== questId));
        }
        
        // Reload data after a short delay to ensure sync
        setTimeout(() => {
          loadQuests();
          loadBalance();
        }, 500);
        
        return true;
      } else {
        console.warn('⚠️ Unexpected response format:', data);
        // Still reload data
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

  // Function to claim all rewards
  const claimAllRewards = async () => {
    if (isClaiming) return;
    
    const claimableQuests = quests.filter(q => q.completed && !q.claimed);
    
    if (claimableQuests.length === 0) {
      alert('No rewards available to claim!');
      return;
    }
    
    try {
      setIsClaiming(true);
      
      // Claim all quests sequentially
      for (const quest of claimableQuests) {
        const success = await claimReward(quest.id);
        if (!success) {
          console.warn(`Failed to claim quest ${quest.id}, continuing with others...`);
        }
        // Small delay between claims to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      
      console.log(`✅ All rewards claimed`);
    } catch (err) {
      console.error('❌ Error mass claiming rewards:', err);
    } finally {
      setIsClaiming(false);
    }
  };

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      await Promise.all([loadBalance(), loadQuests()]);
    };
    
    loadData();
    
    // Update data when screen becomes visible
    const handleFocus = () => {
      loadBalance();
      loadQuests();
    };
    
    document.addEventListener('visibilitychange', handleFocus);
    
    return () => {
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, []);

  // Check if there are claimable rewards
  const hasClaimableRewards = quests.some(q => q.completed && !q.claimed);

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
        <div className="tasks-header">
          <div className="coin-balance-container">
            <img src={coinIcon} alt="Coin" className="coin-icon" />
            <span className="coin-balance">{balance.toFixed(2)}</span>
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
              {quests.length > 0 ? (
                <div className="active-tasks-list">
                  {quests.map(quest => (
                    <TaskItem 
                      key={quest.id} 
                      quest={quest} 
                      coinIcon={coinIcon}
                      onClaim={claimReward}
                      isClaiming={isClaiming}
                    />
                  ))}
                </div>
              ) : (
                <div className="no-tasks-message">No active quests</div>
              )}

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

  // Display progress if available in quest data
  const progress = quest.current_progress || quest.progress || 0;
  const target = quest.required_progress || quest.target || 1;

  return (
    <div className={`task-item ${isCompleted ? 'task-item--completed' : ''}`}>
      <div className={`task-content ${isCompleted ? 'task-content--completed' : ''}`}>
        <div className="task-text">
          <div className="task-title">{quest.title || 'Quest'}</div>
          {quest.description && (
            <div className="task-description">{quest.description}</div>
          )}
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
          {quest.description && (
            <div className="task-description">{quest.description}</div>
          )}
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