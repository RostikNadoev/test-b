import { useState, useEffect, useCallback, useRef } from 'react';
import { crashWebSocket } from '../utils/websocket';
import api from '../utils/api';

export const useCrashGame = () => {
  // --- Основное состояние игры ---
  const [currentRoundId, setCurrentRoundId] = useState(null);
  const [multiplierNow, setMultiplierNow] = useState(1.0);
  const [roundStatus, setRoundStatus] = useState('waiting');
  
  // --- Таймеры и время ---
  const [secondsToStart, setSecondsToStart] = useState(15);
  const [secondsToBetsClose, setSecondsToBetsClose] = useState(null);
  const [bettingLocked, setBettingLocked] = useState(false);
  const [stage, setStage] = useState('timer');
  const [serverTimeMs, setServerTimeMs] = useState(null);
  
  // Для синхронизации времени
  const [timeOffset, setTimeOffset] = useState(0);
  const timeOffsetRef = useRef(0);
  
  const [crashMultiplier, setCrashMultiplier] = useState(null);
  const [lastMultipliers, setLastMultipliers] = useState([]);
  
  // --- Ставки ---
  const [bets, setBets] = useState([]);
  const [myBet, setMyBet] = useState(null);
  
  // --- События движка ---
  const [engineEvents, setEngineEvents] = useState({
    crash: null,
    tick: null,
    round: null,
    status: null,
    cashout_ok: null,
    bet_result: null,
    bet_placed: null,
    bet_ok: null,
    error: null
  });

  const [wsConnected, setWsConnected] = useState(false);
  
  // Refs для быстрого доступа
  const currentRoundIdRef = useRef(null);
  const myBetRef = useRef(null);
  const stageRef = useRef('timer');
  const userIdRef = useRef(null);

  // Синхронизация ref со стейтом
  useEffect(() => {
    stageRef.current = stage;
  }, [stage]);

  useEffect(() => {
    currentRoundIdRef.current = currentRoundId;
  }, [currentRoundId]);

  useEffect(() => {
    myBetRef.current = myBet;
  }, [myBet]);

  // --- Синхронизация времени ---
  const syncTime = useCallback((serverTime) => {
    if (!serverTime) return;
    
    let serverTimeMs;
    if (typeof serverTime === 'string') {
      serverTimeMs = new Date(serverTime).getTime();
    } else {
      serverTimeMs = serverTime;
    }
    
    if (!serverTimeMs || isNaN(serverTimeMs)) return;
    
    const localNow = Date.now();
    const newOffset = serverTimeMs - localNow;
    
    if (Math.abs(newOffset - timeOffsetRef.current) > 200) {
      timeOffsetRef.current = newOffset;
      setTimeOffset(newOffset);
      setServerTimeMs(serverTimeMs);
    }
  }, []);

  const getServerTime = useCallback(() => {
    return Date.now() + timeOffsetRef.current;
  }, []);

  // --- Форматирование ставок ---
  const formatBet = useCallback((rawBet) => {
    const winMultiplier = rawBet.x || rawBet.multiplier || rawBet.cashout_multiplier || rawBet.payout_multiplier || null;
    
    let status = rawBet.status || 'placed';
    
    if (winMultiplier && parseFloat(winMultiplier) > 1 && status === 'placed') {
      status = 'win';
    }

    const amount = parseFloat(rawBet.amount);
    let currentAmount = amount;

    if (status === 'win' && winMultiplier) {
      currentAmount = amount * parseFloat(winMultiplier);
    } else if (status === 'lose' && winMultiplier) {
      currentAmount = amount * parseFloat(winMultiplier);
    } else if (status === 'placed' && multiplierNow > 1) {
      currentAmount = amount * multiplierNow;
    }

    return {
      bet_id: rawBet.bet_id || rawBet.id,
      id: rawBet.bet_id || rawBet.id,
      user_id: rawBet.user_id,
      user: rawBet.user || {},
      currency: rawBet.currency,
      amount: amount,
      original_amount: amount,
      current_amount: currentAmount,
      status: status,
      x: winMultiplier ? parseFloat(winMultiplier) : null,
      auto_cashout: rawBet.auto_cashout,
      payout: rawBet.payout
    };
  }, [multiplierNow]);

  // --- Обновление stage из статуса ---
  const updateStageFromStatus = useCallback((status) => {
    switch (status) {
      case 'betting':
      case 'countdown':
        setStage('timer');
        setCrashMultiplier(null);
        setMultiplierNow(1.0);
        break;
      case 'running':
        setStage('rocket');
        setMultiplierNow(1.0);
        break;
      case 'crashed':
        // stage обновится из crash события
        break;
      default:
        setStage('timer');
    }
  }, []);

  // --- Обработка state (источник истины) ---
  const handleState = useCallback((data) => {
    console.log('📦 State received', data);
    
    if (data.server_time_ms) {
      syncTime(data.server_time_ms);
    }

    if (data.round) {
      const round = data.round;
      setCurrentRoundId(round.id);
      currentRoundIdRef.current = round.id;
      
      if (round.status) {
        setRoundStatus(round.status);
        updateStageFromStatus(round.status);
      }
    }

    if (data.multiplier !== undefined) {
      setMultiplierNow(data.multiplier);
    }

    // ТАЙМЕР - ТОЛЬКО ОТ СЕРВЕРА
    if (data.seconds_to_start !== undefined) {
      setSecondsToStart(data.seconds_to_start);
    }
    
    if (data.seconds_to_bets_close !== undefined) {
      setSecondsToBetsClose(data.seconds_to_bets_close);
    }
    
    if (data.betting_locked !== undefined) {
      setBettingLocked(data.betting_locked);
    }

    if (data.bets && Array.isArray(data.bets)) {
      const formattedBets = data.bets.map(bet => formatBet(bet));
      setBets(formattedBets);
    }

    if (data.my_bet) {
      const formatted = formatBet(data.my_bet);
      setMyBet(formatted);
      myBetRef.current = formatted;
      userIdRef.current = data.my_bet.user_id;
    } else {
      setMyBet(null);
      myBetRef.current = null;
    }
  }, [syncTime, updateStageFromStatus, formatBet]);

  // --- ТАЙМЕР ТОЛЬКО ОТ СЕРВЕРА (УБРАНА ЛОКАЛЬНАЯ АНИМАЦИЯ) ---
  // Больше нет интервала для плавного уменьшения таймера
  // Таймер обновляется только через события timer и state от сервера

  // --- WebSocket инициализация ---
  const initializeWebSocket = useCallback(async () => {
    try {
      await crashWebSocket.connect();
      setWsConnected(true);

      crashWebSocket.on('state', (data) => {
        console.log('📦 State received', data);
        handleState(data);
      });

      crashWebSocket.on('round', (data) => {
        console.log('🔄 New round', data);
        setEngineEvents(prev => ({ ...prev, round: data }));
        
        if (data.round_id) {
          setCurrentRoundId(data.round_id);
          currentRoundIdRef.current = data.round_id;
        }
        
        setBets([]);
        setMyBet(null);
        myBetRef.current = null;
        
        if (data.status) {
          setRoundStatus(data.status);
          updateStageFromStatus(data.status);
        }
        
        if (data.seconds_to_start !== undefined) {
          setSecondsToStart(data.seconds_to_start);
        }
      });

      crashWebSocket.on('timer', (data) => {
        if (data.round_id && data.round_id !== currentRoundIdRef.current) {
          console.log('⏱️ Ignoring timer for old round', data.round_id);
          return;
        }
        
        if (data.seconds_to_start !== undefined) {
          // ТОЛЬКО СЕРВЕРНОЕ ЗНАЧЕНИЕ - никакой локальной анимации
          setSecondsToStart(data.seconds_to_start);
        }
      });

      crashWebSocket.on('status', (data) => {
        if (data.round_id && data.round_id !== currentRoundIdRef.current) {
          console.log('🔄 Ignoring status for old round', data.round_id);
          return;
        }
        
        setEngineEvents(prev => ({ ...prev, status: data }));
        
        if (data.status) {
          setRoundStatus(data.status);
          updateStageFromStatus(data.status);
        }
        
        if (data.seconds_to_start !== undefined) {
          setSecondsToStart(data.seconds_to_start);
        }
        
        if (data.betting_allowed !== undefined) {
          setBettingLocked(!data.betting_allowed);
        }
      });

      crashWebSocket.on('tick', (data) => {
        if (data.round_id && data.round_id !== currentRoundIdRef.current) {
          return;
        }
        
        if (data.multiplier) {
          setMultiplierNow(data.multiplier);
          setEngineEvents(prev => ({ ...prev, tick: data }));
          
          setBets(prev => prev.map(bet => {
            if (bet.status === 'placed') {
              return {
                ...bet,
                current_amount: bet.original_amount * data.multiplier
              };
            }
            return bet;
          }));
          
          if (myBetRef.current?.status === 'placed') {
            setMyBet(prev => prev ? {
              ...prev,
              current_amount: prev.original_amount * data.multiplier
            } : null);
          }
        }
      });

      crashWebSocket.on('bet_ok', (data) => {
        if (data.server_time_ms) syncTime(data.server_time_ms);
        
        const bet = formatBet(data.bet);
        setMyBet(bet);
        myBetRef.current = bet;
        
        setBets(prev => {
          const exists = prev.some(b => b.bet_id === bet.bet_id);
          if (exists) {
            return prev.map(b => b.bet_id === bet.bet_id ? bet : b);
          }
          return [bet, ...prev];
        });
      });

      crashWebSocket.on('bet_placed', (data) => {
        if (data.round_id && data.round_id !== currentRoundIdRef.current) {
          console.log('📊 Ignoring bet_placed for old round', data.round_id);
          return;
        }
        
        setEngineEvents(prev => ({ ...prev, bet_placed: data }));
        
        const bet = formatBet(data.bet);
        
        setBets(prev => {
          const exists = prev.some(b => b.bet_id === bet.bet_id);
          if (exists) {
            return prev.map(b => b.bet_id === bet.bet_id ? bet : b);
          }
          return [bet, ...prev];
        });
        
        if (data.bet.user_id === userIdRef.current) {
          setMyBet(bet);
          myBetRef.current = bet;
        }
      });

      crashWebSocket.on('cashout_ok', (data) => {
        console.log('💰 Cashout OK:', data);
        setEngineEvents(prev => ({ ...prev, cashout_ok: data }));
        
        if (data.bet) {
          const updated = formatBet(data.bet);
          setMyBet(updated);
          myBetRef.current = updated;
          
          setBets(prev => prev.map(b => 
            b.bet_id === updated.bet_id ? updated : b
          ));
        }
      });

      crashWebSocket.on('bet_result', (data) => {
        if (data.round_id && data.round_id !== currentRoundIdRef.current) {
          console.log('🎲 Ignoring bet_result for old round', data.round_id);
          return;
        }
        
        setEngineEvents(prev => ({ ...prev, bet_result: data }));
        
        setBets(prev => prev.map(bet => {
          if (bet.bet_id === data.bet_id) {
            const updated = {
              ...bet,
              status: data.status,
              x: data.x,
              payout: data.payout,
              current_amount: data.payout || (bet.original_amount * data.x)
            };
            return updated;
          }
          return bet;
        }));
        
        if (myBetRef.current?.bet_id === data.bet_id) {
          setMyBet(prev => prev ? {
            ...prev,
            status: data.status,
            x: data.x,
            payout: data.payout,
            current_amount: data.payout || (prev.original_amount * data.x)
          } : null);
        }
      });

      crashWebSocket.on('crash', (data) => {
        if (data.round_id && data.round_id !== currentRoundIdRef.current) {
          console.log('💥 Ignoring crash for old round', data.round_id);
          return;
        }
        
        console.log('💥 Crash event:', data);
        setEngineEvents(prev => ({ ...prev, crash: data }));
        
        setRoundStatus('crashed');
        setStage('explosion');
        
        const mult = data.crash_mult || 1.0;
        setCrashMultiplier(mult);
        
        setLastMultipliers(prev => [mult, ...prev].slice(0, 10));
        
        setBets(prev => prev.map(bet => {
          if (bet.status === 'placed') {
            return {
              ...bet,
              status: 'lose',
              x: mult,
              current_amount: bet.original_amount * mult
            };
          }
          return bet;
        }));
        
        if (myBetRef.current?.status === 'placed') {
          setMyBet(prev => prev ? {
            ...prev,
            status: 'lose',
            x: mult,
            current_amount: prev.original_amount * mult
          } : null);
        }
      });

      crashWebSocket.on('error', (data) => {
        console.error('❌ WebSocket error:', data.error);
        setEngineEvents(prev => ({ ...prev, error: data }));
      });

      setTimeout(() => {
        crashWebSocket.requestState();
      }, 100);

    } catch (e) {
      console.error('WebSocket Init Error', e);
      setWsConnected(false);
    }
  }, [handleState, syncTime, formatBet, updateStageFromStatus]);

  useEffect(() => {
    initializeWebSocket();
    
    return () => {
      crashWebSocket.disconnect();
    };
  }, [initializeWebSocket]);

  useEffect(() => {
    const stateInterval = setInterval(() => {
      if (wsConnected && crashWebSocket.isReady()) {
        crashWebSocket.requestState();
      }
    }, 30000);
    
    return () => clearInterval(stateInterval);
  }, [wsConnected]);

  // --- Действия ---

  const canPlaceBet = useCallback(() => {
    if (!wsConnected) return false;
    if (myBetRef.current) return false;
    if (roundStatus !== 'betting') return false;
    if (bettingLocked) return false;
    if (secondsToBetsClose !== null && secondsToBetsClose <= 0) return false;
    
    return true;
  }, [wsConnected, roundStatus, bettingLocked, secondsToBetsClose]);

  const canPlaceCashout = useCallback(() => {
    if (!wsConnected) {
      console.log('Cashout: not connected');
      return false;
    }
    if (!myBetRef.current) {
      console.log('Cashout: no active bet');
      return false;
    }
    if (myBetRef.current.status !== 'placed') {
      console.log('Cashout: bet not in placed status', myBetRef.current.status);
      return false;
    }
    if (roundStatus !== 'running') {
      console.log('Cashout: round not running', roundStatus);
      return false;
    }
    
    console.log('Cashout: allowed');
    return true;
  }, [wsConnected, roundStatus]);

  const placeBet = useCallback((currency, amount, autoCashout) => {
    if (!canPlaceBet()) return false;
    
    const success = crashWebSocket.placeBet(currency, amount, autoCashout);
    
    if (success) {
      console.log('Bet placed successfully');
    } else {
      console.log('Failed to place bet');
    }
    
    return success;
  }, [canPlaceBet]);

  const cashoutBet = useCallback(() => {
    if (!canPlaceCashout()) {
      console.log('Cashout validation failed');
      return false;
    }
    
    if (!myBetRef.current) {
      console.log('No bet to cashout');
      return false;
    }
    
    console.log('Cashing out bet ID:', myBetRef.current.bet_id);
    return crashWebSocket.cashout(myBetRef.current.bet_id);
  }, [canPlaceCashout]);

  const requestState = useCallback(() => {
    if (wsConnected && crashWebSocket.isReady()) {
      crashWebSocket.requestState();
    }
  }, [wsConnected]);

  const clearBetsOnCrash = useCallback(() => {
    console.log('🧹 Clearing table after explosion');
  }, []);

  const getHistoryFromBackend = useCallback(async () => {
    try {
      const res = await api.get('/api/v1/crash/history');
      return res.data.items || [];
    } catch (e) { 
      console.error('Failed to load history:', e);
      return []; 
    }
  }, []);

  return {
    currentRoundId,
    multiplierNow,
    roundStatus,
    secondsToStart,
    secondsToBetsClose,
    bettingLocked,
    stage,
    setStage,
    wsConnected,
    crashMultiplier,
    lastMultipliers,
    bets,
    myBet,
    engineEvents,
    placeBet,
    cashoutBet,
    canBet: canPlaceBet(),
    canCashout: canPlaceCashout(),
    isCrashGameActive: wsConnected,
    requestState,
    getHistoryFromBackend,
    clearBetsOnCrash
  };
};