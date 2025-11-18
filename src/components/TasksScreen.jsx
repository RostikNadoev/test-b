import React from 'react';
import '../styles/TasksScreen.css';
import MainLayout from './MainLayout';
import coinIcon from '../assets/Tasks/coin.png';

export default function TasksScreen({ onNavigate }) {
  const activeTasks = [
    {
      id: 1,
      title: "Buy 3 cases",
      progress: 0,
      target: 3,
      reward: 50,
      completed: false,
    },
    {
      id: 2,
      title: "Invite 5 friends to the app",
      progress: 2,
      target: 5,
      reward: 100,
      completed: false, 
    },
    {
      id: 3,
      title: "Complete daily challenge",
      progress: 0,
      target: 1,
      reward: 25,
      completed: false, 
    },
  ];

  const completedTasks = [
    {
      id: 101,
      title: "First login bonus",
      progress: 1,
      target: 1,
      reward: 10,
      completed: true,
    },
    {
      id: 102,
      title: "Share app with 3 friends",
      progress: 3,
      target: 3,
      reward: 75,
      completed: true,
    },
  ];

  return (
    <MainLayout onNavigate={onNavigate} currentScreen="tasks">
      <div className="tasks-content-section">
        <div className="tasks-header">
          <div className="coin-balance-container">
            <img src={coinIcon} alt="Coin" className="coin-icon" />
            <span className="coin-balance">85</span>
          </div>
          <button className="claim-all-button claim-all-button--disabled" disabled>
            CLAIM ALL
          </button>
        </div>

        <div className="tasks-main-content">
          <div className="active-tasks-list">
            {activeTasks.map(task => (
              <TaskItem key={task.id} task={task} coinIcon={coinIcon} />
            ))}
          </div>

          <div className="completed-tasks-header-container">
            <h2 className="completed-tasks-header">Completed tasks</h2>
          </div>

          <div className="completed-tasks-list">
            {completedTasks.map(task => (
              <CompletedTaskItem key={task.id} task={task} coinIcon={coinIcon} />
            ))}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

function TaskItem({ task, coinIcon }) {
  const isClaimDisabled = !task.completed;

  return (
    <div className="task-item">
      <div className="task-content">
        <div className="task-text">
          <div className="task-title">{task.title}</div>
        </div>
        <div className="task-progress"> {task.progress}/{task.target}</div>
      </div>

      <button 
        className={`task-claim-button ${isClaimDisabled ? 'task-claim-button--disabled' : ''}`} 
        disabled={isClaimDisabled}
      >
        <span className="task-claim-button-text">CLAIM</span>
        <div className="task-claim-reward">
          <span className="task-claim-amount">{task.reward}</span>
          <img src={coinIcon} alt="Reward Coin" className="task-claim-coin" />
        </div>
      </button>
    </div>
  );
}

function CompletedTaskItem({ task, coinIcon }) {
  return (
    <div className="task-item task-item--completed">
      <div className="task-content task-content--completed">
        <div className="task-text">
          <div className="task-title">{task.title}</div>
        </div>
        <div className="task-progress task-progress--completed"> {task.progress}/{task.target}</div>
      </div>

      <div className="task-completed-reward-container">
        <div className="task-claim-reward task-claim-reward--disabled">
          <span className="task-claim-amount task-claim-amount--disabled">{task.reward}</span>
          <img src={coinIcon} alt="Reward Coin" className="task-claim-coin task-claim-coin--disabled" />
        </div>
      </div>
    </div>
  );
}