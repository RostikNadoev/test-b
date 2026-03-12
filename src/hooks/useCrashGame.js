import { useState, useEffect, useCallback, useRef } from 'react';
import { crashWebSocket } from '../utils/websocket';
import api from '../utils/api';

export const useCrashGame = () => {
  // --- Основное состояние игры ---
  const [currentRoundId, setCurrentRoundId] = useState(null);
  const [multiplierNow, setMultiplierNow] = useState(1.0);
  const [roundStatus, setRoundStatus] = useState('waiting');
  // --- Таймеры и время (СЕРВЕРНЫЙ ТАЙМЕР) ---
  const [timeLeft, setTimeLeft] = useState(15);
  const [stage, setStage] = useState('timer');
  const [timeOffset, setTimeOffset] = useState(0);
  const [roundStartsAt, setRoundStartsAt] = useState(null);
  const [roundBetsCloseAt, setRoundBetsCloseAt] = useState(null);
  const [crashMultiplier, setCrashMultiplier] = useState(null);
  const [lastMultipliers, setLastMultipliers] = useState([]);
  // --- Ставки ---
  const [betsById, setBetsById] = useState(new Map());
  const [myActiveBet, setMyActiveBet] = useState(null);
  const [myBetsHistory, setMyBetsHistory] = useState([]);
  // --- События движка ---
  const [engineEvents, setEngineEvents] = useState({
    crash: null, tick: null, countdown: null, round: null,
    status: null, cashout_ok: null, bet_result: null
  });
  const [wsConnected, setWsConnected] = useState(false);
  
  // Refs
  const timerIntervalRef = useRef(null);
  const clearTableTimeoutRef = useRef(null);
  const betsRef = useRef(new Map());
  const myActiveBetRef = useRef(null);
  const userIdRef = useRef(null);
  const hasBetThisRoundRef = useRef(false);
  const timeOffsetRef = useRef(0);
  const stageRef = useRef('timer');
  // 🔧 НОВЫЕ: рефы для таймера, чтобы не пересоздавать интервал
  const roundStartsAtRef = useRef(null);
  const roundStatusRef = useRef('waiting');
  
  // Refs для автокешаута
  const autoCashoutTargetRef = useRef(null);
  const autoCashoutTriggeredRef = useRef(false);
  const AUTO_CASHOUT_BUFFER = 0.02;

  // Синхронизация ref со стейтом
  useEffect(() => { stageRef.current = stage; }, [stage]);
  // 🔧 Синхронизация новых рефов
  useEffect(() => { roundStartsAtRef.current = roundStartsAt; }, [roundStartsAt]);
  useEffect(() => { roundStatusRef.current = roundStatus; }, [roundStatus]);

  // --- 1. ЛОГИКА СИНХРОНИЗАЦИИ ВРЕМЕНИ ---
  const syncTime = useCallback((serverTimeMs) => {
    if (!serverTimeMs) return;
    const localNow = Date.now();
    const newOffset = serverTimeMs - localNow;
    if (Math.abs(newOffset - timeOffsetRef.current) > 500 || timeOffsetRef.current === 0) {
      timeOffsetRef.current = newOffset;
      setTimeOffset(newOffset);
    }
  }, []);

  const getServerTime = useCallback(() => {
    return Date.now() + timeOffsetRef.current;
  }, []);

  // --- 2. ТАЙМЕР — ИСПРАВЛЕННЫЙ (не пересоздается при ставках) ---
  useEffect(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    
    const updateTimer = () => {
      const now = getServerTime();
      // 🔧 Используем рефы вместо стейта — эффект не пересоздается
      const currentRoundStartsAt = roundStartsAtRef.current;
      const currentRoundStatus = roundStatusRef.current;
      
      if (currentRoundStartsAt) {
        const diff = currentRoundStartsAt - now;
        const sec = Math.max(0, Math.ceil(diff / 1000));
        setTimeLeft(sec);
        
        if (sec <= 5 && sec > 0) {
          console.log(`⏱️ Server timer: ${sec}s remaining`);
        }
        
        if (diff > 0 && (currentRoundStatus === 'betting' || currentRoundStatus === 'countdown')) {
          if (stageRef.current !== 'timer') {
            setStage('timer');
          }
        }
      } else {
        setTimeLeft(15);
      }
    };
    
    timerIntervalRef.current = setInterval(updateTimer, 100);
    updateTimer();
    
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [getServerTime]); // 🔧 Только getServerTime в зависимостях — интервал стабилен!

  // --- 3. Очистка таблицы через ~1.9с после краша ---
  useEffect(() => {
    if (engineEvents.crash) {
      if (clearTableTimeoutRef.current) {
        clearTimeout(clearTableTimeoutRef.current);
      }
      clearTableTimeoutRef.current = setTimeout(() => {
        console.log('🧹 Clearing bets table after crash');
        setBetsById(new Map());
        betsRef.current = new Map();
        setMyActiveBet(null);
        myActiveBetRef.current = null;
        clearTableTimeoutRef.current = null;
      }, 1900);
    }
    return () => {
      if (clearTableTimeoutRef.current) {
        clearTimeout(clearTableTimeoutRef.current);
      }
    };
  }, [engineEvents.crash]);

  // --- 4. ЛОГИКА АВТОКЕШАУТА ---
  useEffect(() => {
    if (stage === 'rocket' &&
        myActiveBetRef.current?.status === 'placed' &&
        autoCashoutTargetRef.current !== null &&
        !autoCashoutTriggeredRef.current) {
      const triggerMultiplier = autoCashoutTargetRef.current - AUTO_CASHOUT_BUFFER;
      if (multiplierNow >= triggerMultiplier) {
        autoCashoutTriggeredRef.current = true;
        crashWebSocket.cashout(myActiveBetRef.current.bet_id);
      }
    }
  }, [multiplierNow, stage]);

  useEffect(() => {
    if (currentRoundId) {
      autoCashoutTargetRef.current = null;
      autoCashoutTriggeredRef.current = false;
    }
  }, [currentRoundId]);

  useEffect(() => {
    if (engineEvents.cashout_ok || engineEvents.crash) {
      autoCashoutTargetRef.current = null;
      autoCashoutTriggeredRef.current = false;
    }
  }, [engineEvents.cashout_ok, engineEvents.crash]);

  // --- 5. HELPERS ---
  const formatBet = useCallback((rawBet) => {
    const winMultiplier = rawBet.x || rawBet.multiplier || rawBet.cashout_multiplier || rawBet.payout_multiplier || null;
    let status = rawBet.status || 'placed';
    if (winMultiplier && parseFloat(winMultiplier) > 1 && status === 'placed') status = 'win';
    const amount = parseFloat(rawBet.amount);
    let currentAmount = amount;
    if ((status === 'win' || status === 'lose') && winMultiplier) {
      currentAmount = amount * parseFloat(winMultiplier);
    }
    return {
      bet_id: rawBet.bet_id || rawBet.id,
      id: rawBet.bet_id || rawBet.id,
      user_id: rawBet.user_id,
      user: rawBet.user || {},
      currency: rawBet.currency,
      amount,
      original_amount: amount,
      current_amount: currentAmount,
      status,
      x: winMultiplier ? parseFloat(winMultiplier) : null,
    };
  }, []);

  // --- 6. УПРАВЛЕНИЕ ДАННЫМИ ---
  const updateStageFromStatus = useCallback((status) => {
    switch (status) {
      case 'betting':
      case 'countdown':
        setStage('timer');
        setCrashMultiplier(null);
        setMultiplierNow(1.0);
        if (hasBetThisRoundRef.current && !myActiveBetRef.current) {
          hasBetThisRoundRef.current = false;
        }
        break;
      case 'running':
        setStage('rocket');
        setMultiplierNow(1.0);
        break;
      case 'crashed':
        break;
      default:
        setStage('timer');
    }
  }, []);

  const handleRoundInfo = useCallback((roundData, serverTimeMs) => {
    if (serverTimeMs) syncTime(serverTimeMs);
    if (roundData.id && roundData.id !== currentRoundId) {
      console.log('🔄 New round:', roundData.id);
      setCurrentRoundId(roundData.id);
      hasBetThisRoundRef.current = false;
    }
    if (roundData.starts_at) {
      setRoundStartsAt(new Date(roundData.starts_at).getTime());
    }
    if (roundData.bets_close_at) {
      setRoundBetsCloseAt(new Date(roundData.bets_close_at).getTime());
    }
    if (roundData.status) {
      setRoundStatus(roundData.status);
      updateStageFromStatus(roundData.status);
    }
  }, [currentRoundId, syncTime, updateStageFromStatus]);

  // --- 7. WS INIT ---
  const initializeWebSocket = useCallback(async () => {
    try {
      await crashWebSocket.connect();
      setWsConnected(true);
      
      crashWebSocket.on('state', (data) => {
        if (data.server_time_ms) syncTime(data.server_time_ms);
        if (data.round) handleRoundInfo(data.round, data.server_time_ms);
        if (data.multiplier) setMultiplierNow(data.multiplier);
        if (data.bets?.length) {
          const newMap = new Map();
          data.bets.forEach(bet => {
            const formatted = formatBet(bet);
            newMap.set(formatted.bet_id, formatted);
          });
          setBetsById(newMap);
          betsRef.current = newMap;
        }
        if (data.my_bet) {
          const formatted = formatBet(data.my_bet);
          setMyActiveBet(formatted);
          myActiveBetRef.current = formatted;
          userIdRef.current = data.my_bet.user_id;
          if (formatted.status === 'win' || formatted.status === 'placed') {
            hasBetThisRoundRef.current = true;
          }
        }
      });
      
      crashWebSocket.on('round', (data) => {
        setEngineEvents(prev => ({ ...prev, round: data }));
        handleRoundInfo(data.round || data, data.server_time_ms);
      });
      
      crashWebSocket.on('status', (data) => {
        if (data.server_time_ms) syncTime(data.server_time_ms);
        setEngineEvents(prev => ({ ...prev, status: data }));
        if (data.status) {
          setRoundStatus(data.status);
          updateStageFromStatus(data.status);
        }
      });
      
      crashWebSocket.on('tick', (data) => {
        if (data.server_time_ms) syncTime(data.server_time_ms);
        if (data.multiplier) {
          setMultiplierNow(data.multiplier);
          setEngineEvents(prev => ({ ...prev, tick: data }));
          setBetsById(prev => {
            const newMap = new Map(prev);
            newMap.forEach((bet, id) => {
              if (bet.status === 'placed') {
                newMap.set(id, { ...bet, current_amount: bet.original_amount * data.multiplier });
              }
            });
            return newMap;
          });
          if (myActiveBetRef.current?.status === 'placed') {
            const updated = {
              ...myActiveBetRef.current,
              current_amount: myActiveBetRef.current.original_amount * data.multiplier
            };
            setMyActiveBet(updated);
            myActiveBetRef.current = updated;
          }
        }
      });
      
      crashWebSocket.on('crash', (data) => {
        console.log('💥 Crash:', data);
        if (data.server_time_ms) syncTime(data.server_time_ms);
        setEngineEvents(prev => ({ ...prev, crash: data }));
        setRoundStatus('crashed');
        setStage('explosion');
        const mult = data.multiplier || data.crash_mult || 1.0;
        setCrashMultiplier(mult);
        setLastMultipliers(prev => [mult, ...prev].slice(0, 10));
        
        setBetsById(prev => {
          const newMap = new Map(prev);
          newMap.forEach((bet, id) => {
            if (bet.status === 'placed') {
              newMap.set(id, { ...bet, status: 'lose', x: mult, current_amount: bet.original_amount * mult });
            }
          });
          betsRef.current = newMap;
          return newMap;
        });
        if (myActiveBetRef.current?.status === 'placed') {
          setMyActiveBet(null);
          myActiveBetRef.current = null;
        }
      });
      
      crashWebSocket.on('bet_placed', (data) => {
        if (data.server_time_ms) syncTime(data.server_time_ms);
        if (data.round_id !== currentRoundId) {
          setCurrentRoundId(data.round_id);
          hasBetThisRoundRef.current = false;
        }
        const bet = formatBet(data.bet);
        setBetsById(prev => new Map(prev).set(bet.bet_id, bet));
      });
      
      crashWebSocket.on('bet_ok', (data) => {
        if (data.server_time_ms) syncTime(data.server_time_ms);
        const bet = formatBet(data.bet);
        setMyActiveBet(bet);
        myActiveBetRef.current = bet;
        userIdRef.current = data.bet.user_id;
        hasBetThisRoundRef.current = true;
      });
      
      crashWebSocket.on('cashout_ok', (data) => {
        if (data.server_time_ms) syncTime(data.server_time_ms);
        setEngineEvents(prev => ({ ...prev, cashout_ok: data }));
        const mult = data.bet.CashoutMultiplier || data.bet.cashout_multiplier || multiplierNow;
        const updated = {
          ...myActiveBetRef.current,
          status: 'win',
          x: mult,
          current_amount: myActiveBetRef.current.original_amount * mult
        };
        setMyActiveBet(updated);
        myActiveBetRef.current = updated;
        setBetsById(prev => {
          const map = new Map(prev);
          if (map.has(updated.bet_id)) map.set(updated.bet_id, updated);
          return map;
        });
        setMyBetsHistory(prev => [updated, ...prev]);
        hasBetThisRoundRef.current = true;
      });
      
      crashWebSocket.on('bet_result', (data) => {
        if (data.server_time_ms) syncTime(data.server_time_ms);
        setEngineEvents(prev => ({ ...prev, bet_result: data }));
        setBetsById(prev => {
          const map = new Map(prev);
          const b = map.get(data.bet_id);
          if (b) {
            map.set(data.bet_id, formatBet({ ...b, status: data.status, x: data.x }));
          }
          return map;
        });
        if (myActiveBetRef.current?.bet_id === data.bet_id) {
          const updated = formatBet({ ...myActiveBetRef.current, status: data.status, x: data.x });
          setMyActiveBet(updated);
          myActiveBetRef.current = updated;
        }
      });
      
      setTimeout(() => crashWebSocket.requestState(), 100);
    } catch (e) {
      console.error('WS Init Error', e);
      setWsConnected(false);
    }
  }, [currentRoundId, handleRoundInfo, syncTime, formatBet, updateStageFromStatus]);

  useEffect(() => {
    initializeWebSocket();
    return () => {
      crashWebSocket.disconnect();
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (clearTableTimeoutRef.current) clearTimeout(clearTableTimeoutRef.current);
    };
  }, [initializeWebSocket]);

  // --- ACTIONS ---
  const clearActiveBet = () => { setMyActiveBet(null); myActiveBetRef.current = null; };
  const clearAllBets = () => { setBetsById(new Map()); betsRef.current = new Map(); };
  const clearBetsOnCrash = useCallback(() => {}, []);
  
  const getHistoryFromBackend = useCallback(async () => {
    try {
      const res = await api.get('/api/v1/crash/history');
      return res.data.items || [];
    } catch { return []; }
  }, []);
  
  const canPlaceBet = useCallback(() => {
    if (!wsConnected || myActiveBetRef.current) return false;
    if (hasBetThisRoundRef.current) return false;
    const now = getServerTime();
    if (roundBetsCloseAt && now >= roundBetsCloseAt) return false;
    if (roundStartsAt && now >= roundStartsAt - 3000) return false;
    if (roundStatus !== 'betting' && roundStatus !== 'countdown') return false;
    return true;
  }, [wsConnected, roundBetsCloseAt, roundStartsAt, getServerTime, roundStatus]);
  
  const canPlaceCashout = useCallback(() => {
    if (myActiveBetRef.current?.status === 'win') return false;
    return roundStatus === 'running' && wsConnected && !!myActiveBetRef.current;
  }, [roundStatus, wsConnected]);
  
  const placeBet = useCallback((currency, amount, autoCashoutTarget) => {
    if (!canPlaceBet()) return false;
    hasBetThisRoundRef.current = true;
    if (autoCashoutTarget && autoCashoutTarget > 1.0) {
      autoCashoutTargetRef.current = autoCashoutTarget;
      autoCashoutTriggeredRef.current = false;
    } else {
      autoCashoutTargetRef.current = null;
      autoCashoutTriggeredRef.current = false;
    }
    return crashWebSocket.placeBet(currency, amount, null);
  }, [canPlaceBet]);
  
  const cashoutBet = useCallback(() => {
    if (!myActiveBetRef.current) return false;
    autoCashoutTargetRef.current = null;
    autoCashoutTriggeredRef.current = false;
    return crashWebSocket.cashout(myActiveBetRef.current.bet_id);
  }, []);
  
  const getCurrentBets = useCallback(() => {
    return Array.from(betsById.values()).sort((a,b) => (b.bet_id || 0) - (a.bet_id || 0));
  }, [betsById]);

  return {
    currentRoundId, multiplierNow, roundStatus, timeLeft, stage, setStage,
    wsConnected, crashMultiplier, lastMultipliers: lastMultipliers || [],
    bets: getCurrentBets(), myActiveBet, engineEvents,
    placeBet, cashoutBet, canBet: canPlaceBet(), canCashout: canPlaceCashout(),
    isCrashGameActive: wsConnected,
    isBettingPhase: roundStatus === 'betting',
    isFlyingPhase: roundStatus === 'running',
    getHistoryFromBackend, clearBetsOnCrash
  };
};