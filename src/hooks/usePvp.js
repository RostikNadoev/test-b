import { useState, useEffect, useCallback, useRef } from 'react';
import pvpSocket from '../utils/pvpSocket';
import { authApi } from '../utils/api';

export function usePvp() {
  const [gameState, setGameState] = useState({
    lobby: {
      id: 0,
      status: 'waiting',
      total_value: 0,
      countdown_end: null,
      lock_time: null,
      winner_id: 0
    },
    players_count: 0,
    players: []
  });
  const [preSpinWinner, setPreSpinWinner] = useState(null);
  const [animationMs, setAnimationMs] = useState(7000);
  const [isSpinning, setIsSpinning] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [currentUserInGame, setCurrentUserInGame] = useState(false);
  const [winModal, setWinModal] = useState(null);
  const [joinError, setJoinError] = useState(null);
  const myUserId = useRef(null);

  useEffect(() => {
    const user = authApi.getCurrentUser();
    if (user) {
      myUserId.current = user.id || user.user_id;
    }
  }, []);

  useEffect(() => {
    pvpSocket.connect();
    pvpSocket.on('state', handleState);
    pvpSocket.on('pre_spin', handlePreSpin);
    pvpSocket.on('finished', handleFinished);
    pvpSocket.on('error', handleError);
    pvpSocket.on('connected', handleConnected);
    pvpSocket.on('disconnected', handleDisconnect);

    const timer = setTimeout(() => {
      if (pvpSocket.isConnected()) {
        pvpSocket.requestState();
      }
    }, 1000);

    return () => {
      clearTimeout(timer);
      pvpSocket.off('state', handleState);
      pvpSocket.off('pre_spin', handlePreSpin);
      pvpSocket.off('finished', handleFinished);
      pvpSocket.off('error', handleError);
      pvpSocket.off('connected', handleConnected);
      pvpSocket.off('disconnected', handleDisconnect);
    };
  }, []);

  const handleConnected = useCallback(() => {
    pvpSocket.requestState();
  }, []);

  const handleState = useCallback((data) => {
    setGameState(data);
    if (myUserId.current && data.players) {
      const userInGame = data.players.some(player => player.user_id === myUserId.current);
      setCurrentUserInGame(userInGame);
    } else {
      setCurrentUserInGame(false);
    }
    updateLockStatus(data.lobby, data.players_count);
    
    // Если мы получили состояние, где игра уже в статусе spinning с сервера, подхватываем это
    if (data.lobby?.status === 'spinning') {
        setIsSpinning(true);
    }
  }, []);

  const handlePreSpin = useCallback((data) => {
    console.log('🎯 Получен pre_spin (победитель известен):', data.winner?.username);
    setPreSpinWinner(data.winner);
    setAnimationMs(data.game.animation_ms || 7000);
    // ВАЖНО: Мы НЕ ставим isSpinning = true здесь.
    // Это сделает компонент PvpScreen, когда таймер дойдет до 0.
  }, []);

  const handleFinished = useCallback((data) => {
    console.log('🏆 Игра завершена:', data);
    setIsSpinning(false);
    setPreSpinWinner(null); // Сбрасываем победителя
    setWinModal(data);
    
    // Скрываем модалку через 5 секунд или по клику (логика в UI)
    setTimeout(() => {
      setWinModal(null);
    }, 5000);
  }, []);

  const handleError = useCallback((data) => {
    console.error('❌ Ошибка PvP:', data);
    if (data.type === 'error') {
      setJoinError(data.error || 'Unknown error');
    }
  }, []);

  const handleDisconnect = useCallback(() => {
    console.log('⚠️ WebSocket disconnected');
  }, []);

  const updateLockStatus = useCallback((lobby, playersCount) => {
    if (lobby?.status !== 'starting' || playersCount < 2) {
      setIsLocked(false);
      return;
    }
    if (!lobby.lock_time) {
      setIsLocked(false);
      return;
    }
    try {
      const lockTime = new Date(lobby.lock_time).getTime();
      const now = Date.now();
      setIsLocked(now >= lockTime);
    } catch (error) {
      console.error('Error calculating lock time:', error);
      setIsLocked(false);
    }
  }, []);

  const getRemainingTime = useCallback(() => {
    if (!gameState.lobby || !gameState.lobby.countdown_end) return null;
    try {
      const endTime = new Date(gameState.lobby.countdown_end).getTime();
      const now = Date.now();
      return Math.max(0, endTime - now);
    } catch (error) {
      return null;
    }
  }, [gameState.lobby?.countdown_end]);

  const getGameStatus = useCallback(() => {
    const status = gameState.lobby?.status;
    const playersCount = gameState.players_count || 0;
    
    // Принудительный статус spinning, если локальный флаг включен (запущен таймером)
    if (isSpinning) {
        return { type: 'spinning', text: '' };
    }

    if (status === 'waiting' || playersCount < 2) {
      return { type: 'waiting', text: 'Waiting for players...' };
    }
    
    // Если сервер говорит spinning, тоже ок
    if (status === 'spinning') {
      return { type: 'spinning', text: '' };
    }

    if (status === 'starting') {
      const remaining = getRemainingTime();
      if (remaining !== null && remaining > 0) {
        return { type: 'countdown', text: Math.ceil(remaining/1000).toString(), remainingMs: remaining };
      } else {
        // Если таймер 0, но спин еще не начался (ждем pre_spin)
        return { type: 'countdown', text: '00', remainingMs: 0 };
      }
    }
    
    return { type: 'waiting', text: 'Waiting for players...' };
  }, [gameState, getRemainingTime, isSpinning]);

  // Функция ручного запуска спина из компонента (когда таймер = 0)
  const startSpin = useCallback(() => {
    if (!preSpinWinner) return;
    console.log('🎡 PvpScreen запустил анимацию!');
    setIsSpinning(true);
  }, [preSpinWinner]);

  const calculateFramePositions = useCallback(() => {
    const totalValue = gameState.lobby?.total_value || 1;
    const positions = [];
    const totalSlots = 100;

    if (gameState.players && gameState.players.length > 0) {
      const playerSlots = {};
      let allocated = 0;

      gameState.players.forEach(player => {
        const share = (player.sum_value / totalValue) * totalSlots;
        const slots = Math.max(1, Math.round(share));
        playerSlots[player.user_id] = { slots, player };
        allocated += slots;
      });

      if (allocated > totalSlots) {
        const scale = totalSlots / allocated;
        Object.keys(playerSlots).forEach(id => {
          playerSlots[id].slots = Math.max(1, Math.floor(playerSlots[id].slots * scale));
        });
        allocated = Object.values(playerSlots).reduce((sum, data) => sum + data.slots, 0);
      }

      if (allocated < totalSlots) {
        const extraSlots = totalSlots - allocated;
        const playerIds = Object.keys(playerSlots);
        for (let i = 0; i < extraSlots; i++) {
          const randomPlayerId = playerIds[Math.floor(Math.random() * playerIds.length)];
          playerSlots[randomPlayerId].slots += 1;
        }
      }

      const allSlots = [];
      Object.keys(playerSlots).forEach(playerId => {
        const { slots, player } = playerSlots[playerId];
        for (let i = 0; i < slots; i++) {
          allSlots.push({
            playerId: player.user_id,
            username: player.username,
            photoUrl: player.photo_url,
            sumValue: player.sum_value
          });
        }
      });

      for (let i = allSlots.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allSlots[i], allSlots[j]] = [allSlots[j], allSlots[i]];
      }

      positions.push(...allSlots);
    }

    while (positions.length < totalSlots) {
      positions.push(null);
    }

    return positions.slice(0, totalSlots);
  }, [gameState]);

  const joinGame = useCallback((inventoryIds) => {
    if (isLocked || !myUserId.current) return false;
    setJoinError(null);
    return pvpSocket.join(inventoryIds);
  }, [isLocked]);

  const leaveGame = useCallback(() => {
    if (isLocked) return false;
    return pvpSocket.leave();
  }, [isLocked]);

  const requestState = useCallback(() => pvpSocket.requestState(), []);

  const getUserGifts = useCallback((userId) => {
    const player = gameState.players?.find(p => p.user_id === userId);
    return player ? (player.gifts || []) : [];
  }, [gameState.players]);

  return {
    gameState,
    preSpinWinner,
    animationMs,
    isSpinning,
    isLocked,
    currentUserInGame,
    winModal,
    joinError,
    joinGame,
    leaveGame,
    requestState,
    getGameStatus,
    calculateFramePositions,
    getUserGifts,
    getRemainingTime,
    startSpin,
    isConnected: pvpSocket.isConnected(),
    totalValue: gameState.lobby?.total_value || 0,
    gameId: gameState.lobby?.id || 0,
    players: gameState.players || [],
    playersCount: gameState.players_count || 0
  };
}