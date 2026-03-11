import { useState, useEffect, useCallback, useRef } from 'react';
import { crashWebSocket } from '../utils/websocket';
import api from '../utils/api';

export const useCrashGame = () => {
  // --- Основное состояние игры ---
  const [currentRoundId, setCurrentRoundId] = useState(null);
  const [multiplierNow, setMultiplierNow] = useState(1.0);
  const [roundStatus, setRoundStatus] = useState('waiting');
  
  // --- Таймеры и время (Синхронизация) ---
  const [timeLeft, setTimeLeft] = useState(15);
  const [stage, setStage] = useState('timer');
  
  // Для точной синхронизации: храним разницу (ServerTime - LocalTime)
  const [timeOffset, setTimeOffset] = useState(0);
  const [roundStartsAt, setRoundStartsAt] = useState(null);     // timestamp ms
  const [roundBetsCloseAt, setRoundBetsCloseAt] = useState(null); // timestamp ms
  
  const [crashMultiplier, setCrashMultiplier] = useState(null);
  const [lastMultipliers, setLastMultipliers] = useState([]);
  
  // --- Ставки ---
  const [betsById, setBetsById] = useState(new Map());
  const [myActiveBet, setMyActiveBet] = useState(null);
  const [myBetsHistory, setMyBetsHistory] = useState([]);
  
  // --- События движка ---
  const [engineEvents, setEngineEvents] = useState({
    crash: null,
    tick: null,
    countdown: null,
    round: null,
    status: null,
    cashout_ok: null,
    bet_result: null
  });

  const [wsConnected, setWsConnected] = useState(false);
  
  // Refs
  const timerIntervalRef = useRef(null);
  const betsRef = useRef(new Map());
  const myActiveBetRef = useRef(null);
  const userIdRef = useRef(null);
  const hasBetThisRoundRef = useRef(false);
  const timeOffsetRef = useRef(0);
  const stageRef = useRef('timer');
  const roundIdRef = useRef(null);
  const forceTimerUpdateRef = useRef(false); // Новый ref для принудительного обновления таймера

  // Синхронизация ref со стейтом
  useEffect(() => {
    stageRef.current = stage;
  }, [stage]);

  useEffect(() => {
    roundIdRef.current = currentRoundId;
  }, [currentRoundId]);

  // --- 1. ЛОГИКА СИНХРОНИЗАЦИИ ВРЕМЕНИ ---

  const syncTime = useCallback((serverTimeMs) => {
    if (!serverTimeMs) return;
    const localNow = Date.now();
    const newOffset = serverTimeMs - localNow;
    
    // Сглаживание: обновляем только если рассинхрон больше 500мс или это первая синхронизация
    if (Math.abs(newOffset - timeOffsetRef.current) > 500 || timeOffsetRef.current === 0) {
      timeOffsetRef.current = newOffset;
      setTimeOffset(newOffset);
    }
  }, []);

  const getServerTime = useCallback(() => {
    return Date.now() + timeOffsetRef.current;
  }, []);

  // Таймер обратного отсчета - ИСПРАВЛЕННАЯ ВЕРСИЯ
  useEffect(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }

    const updateTimer = () => {
      const now = getServerTime();

      if ((roundStatus === 'betting' || roundStatus === 'countdown') && roundStartsAt) {
        const diff = roundStartsAt - now;
        const sec = Math.max(0, Math.ceil(diff / 1000));
        setTimeLeft(sec);

        if (stageRef.current !== 'timer') {
          setStage('timer');
        }
        return;
      }

      if (roundStatus === 'running') {
        setTimeLeft(0);
        if (stageRef.current !== 'rocket') {
          setStage('rocket');
        }
        return;
      }

      if (roundStatus === 'crashed') {
        setTimeLeft(0);
        return;
      }

      setTimeLeft(15);
    };

    updateTimer();
    timerIntervalRef.current = setInterval(updateTimer, 100);

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [roundStartsAt, roundStatus, getServerTime]);

  // --- 2. HELPERS ДЛЯ ФОРМАТИРОВАНИЯ ---

  const formatBet = useCallback((rawBet) => {
    const winMultiplier =
      rawBet.x ??
      rawBet.multiplier ??
      rawBet.cashout_multiplier ??
      rawBet.CashoutMultiplier ??
      rawBet.payout_multiplier ??
      null;

    let status = rawBet.status || 'placed';

    if (status === 'lost') status = 'lose';
    if ((status === 'won' || status === 'cashed_out') && winMultiplier) {
      status = 'win';
    }

    const amount = parseFloat(rawBet.amount || 0);
    let currentAmount = amount;

    if (status === 'win' && winMultiplier) {
      currentAmount = amount * parseFloat(winMultiplier);
    } else if (status === 'lose' && winMultiplier) {
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
      auto_cashout: rawBet.auto_cashout
    };
  }, []);

  // --- 3. УПРАВЛЕНИЕ ДАННЫМИ РАУНДА ---

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
        break;

      case 'crashed':
        break;

      default:
        setStage('timer');
    }
  }, []);

  const clearAllBets = () => {
    setBetsById(new Map());
    betsRef.current = new Map();
  };

  const clearActiveBet = () => {
    setMyActiveBet(null);
    myActiveBetRef.current = null;
  };

  const handleRoundInfo = useCallback((roundData, serverTimeMs) => {
    if (serverTimeMs) syncTime(serverTimeMs);

    if (roundData.id && roundData.id !== roundIdRef.current) {
      setCurrentRoundId(roundData.id);

      hasBetThisRoundRef.current = false;
      setCrashMultiplier(null);
      setMultiplierNow(1.0);

      clearAllBets();
      clearActiveBet();
    }

    if (roundData.starts_at) {
      setRoundStartsAt(new Date(roundData.starts_at).getTime());
    } else {
      setRoundStartsAt(null);
    }

    if (roundData.bets_close_at) {
      setRoundBetsCloseAt(new Date(roundData.bets_close_at).getTime());
    } else {
      setRoundBetsCloseAt(null);
    }

    if (roundData.status) {
      setRoundStatus(roundData.status);
      updateStageFromStatus(roundData.status);
    }
  }, [syncTime, updateStageFromStatus]);

  // --- 4. WS INIT (ИСПРАВЛЕННАЯ ВЕРСИЯ) ---

  const initializeWebSocket = useCallback(async () => {
    try {
      await crashWebSocket.connect();
      setWsConnected(true);

      crashWebSocket.clearAllHandlers?.();

      const onState = (data) => {
        if (data.server_time_ms) syncTime(data.server_time_ms);

        if (data.round) {
          handleRoundInfo(data.round, data.server_time_ms);
        }

        if (typeof data.multiplier === 'number') {
          setMultiplierNow(data.multiplier);
        }

        if (Array.isArray(data.bets)) {
          const newBetsMap = new Map();
          data.bets.forEach((bet) => {
            const formatted = formatBet(bet);
            newBetsMap.set(formatted.bet_id, formatted);
          });
          setBetsById(newBetsMap);
          betsRef.current = newBetsMap;
        } else {
          setBetsById(new Map());
          betsRef.current = new Map();
        }

        if (data.my_bet) {
          const formatted = formatBet(data.my_bet);
          setMyActiveBet(formatted);
          myActiveBetRef.current = formatted;
          userIdRef.current = data.my_bet.user_id;
          hasBetThisRoundRef.current = true;
        } else {
          setMyActiveBet(null);
          myActiveBetRef.current = null;

          if (data.round && (data.round.status === 'betting' || data.round.status === 'countdown')) {
            hasBetThisRoundRef.current = false;
          }
        }
      };

      const onRound = (data) => {
        setEngineEvents((prev) => ({ ...prev, round: data }));
        const roundInfo = data.round || data;
        handleRoundInfo(roundInfo, data.server_time_ms);
      };

      const onStatus = (data) => {
        if (data.server_time_ms) syncTime(data.server_time_ms);
        setEngineEvents((prev) => ({ ...prev, status: data }));

        if (data.status) {
          setRoundStatus(data.status);
          updateStageFromStatus(data.status);
        }
      };

      const onTick = (data) => {
        if (data.server_time_ms) syncTime(data.server_time_ms);
        if (typeof data.multiplier !== 'number') return;

        setMultiplierNow(data.multiplier);
        setEngineEvents((prev) => ({ ...prev, tick: data }));

        setBetsById((prev) => {
          const newMap = new Map(prev);
          newMap.forEach((bet, id) => {
            if (bet.status === 'placed') {
              newMap.set(id, {
                ...bet,
                current_amount: bet.original_amount * data.multiplier
              });
            }
          });
          betsRef.current = newMap;
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
      };

      const onCrash = (data) => {
        if (data.server_time_ms) syncTime(data.server_time_ms);

        setEngineEvents((prev) => ({ ...prev, crash: data }));
        setRoundStatus('crashed');
        setStage('explosion');

        const mult = data.multiplier || data.crash_mult || 1.0;
        setCrashMultiplier(mult);
        setLastMultipliers((prev) => [mult, ...prev].slice(0, 10));

        setBetsById((prev) => {
          const newMap = new Map(prev);
          newMap.forEach((bet, id) => {
            if (bet.status === 'placed') {
              newMap.set(id, {
                ...bet,
                status: 'lose',
                x: mult,
                current_amount: bet.original_amount * mult
              });
            }
          });
          betsRef.current = newMap;
          return newMap;
        });

        // свою ставку здесь НЕ очищаем
      };

      const onBetPlaced = (data) => {
        if (data.server_time_ms) syncTime(data.server_time_ms);

        if (data.round_id !== roundIdRef.current) {
          setCurrentRoundId(data.round_id);
          hasBetThisRoundRef.current = false;
          clearAllBets();
        }

        const bet = formatBet(data.bet);
        setBetsById((prev) => {
          const map = new Map(prev);
          map.set(bet.bet_id, bet);
          betsRef.current = map;
          return map;
        });
      };

      const onBetOk = (data) => {
        if (data.server_time_ms) syncTime(data.server_time_ms);

        const bet = formatBet(data.bet);
        setMyActiveBet(bet);
        myActiveBetRef.current = bet;
        userIdRef.current = data.bet.user_id;
        hasBetThisRoundRef.current = true;
      };

      const onCashoutOk = (data) => {
        if (data.server_time_ms) syncTime(data.server_time_ms);
        setEngineEvents((prev) => ({ ...prev, cashout_ok: data }));

        if (!myActiveBetRef.current) return;

        const mult = data.bet.CashoutMultiplier || data.bet.cashout_multiplier || multiplierNow;

        const updated = {
          ...myActiveBetRef.current,
          status: 'win',
          x: mult,
          current_amount: myActiveBetRef.current.original_amount * mult
        };

        setMyActiveBet(updated);
        myActiveBetRef.current = updated;

        setBetsById((prev) => {
          const map = new Map(prev);
          map.set(updated.bet_id, updated);
          betsRef.current = map;
          return map;
        });

        setMyBetsHistory((prev) => [updated, ...prev]);
        hasBetThisRoundRef.current = true;
      };

      const onBetResult = (data) => {
        if (data.server_time_ms) syncTime(data.server_time_ms);
        setEngineEvents((prev) => ({ ...prev, bet_result: data }));

        setBetsById((prev) => {
          const map = new Map(prev);
          const existing = map.get(data.bet_id);

          const base = existing || {
            bet_id: data.bet_id,
            id: data.bet_id,
            user_id: data.user_id,
            currency: data.currency,
            amount: data.amount,
            original_amount: data.amount,
            status: data.status,
            x: data.x
          };

          const formatted = formatBet({
            ...base,
            status: data.status,
            x: data.x,
            payout: data.payout
          });

          map.set(data.bet_id, formatted);
          betsRef.current = map;
          return map;
        });

        if (myActiveBetRef.current && myActiveBetRef.current.bet_id === data.bet_id) {
          const updated = formatBet({
            ...myActiveBetRef.current,
            status: data.status,
            x: data.x,
            payout: data.payout
          });

          setMyActiveBet(updated);
          myActiveBetRef.current = updated;
        }
      };

      crashWebSocket.on('state', onState);
      crashWebSocket.on('round', onRound);
      crashWebSocket.on('status', onStatus);
      crashWebSocket.on('tick', onTick);
      crashWebSocket.on('crash', onCrash);
      crashWebSocket.on('bet_placed', onBetPlaced);
      crashWebSocket.on('bet_ok', onBetOk);
      crashWebSocket.on('cashout_ok', onCashoutOk);
      crashWebSocket.on('bet_result', onBetResult);

      setTimeout(() => crashWebSocket.requestState(), 100);
    } catch (e) {
      console.error('WebSocket Init Error', e);
      setWsConnected(false);
    }
  }, [handleRoundInfo, syncTime, formatBet, updateStageFromStatus, multiplierNow]);

  useEffect(() => {
    initializeWebSocket();

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      crashWebSocket.clearAllHandlers?.();
      crashWebSocket.disconnect();
    };
  }, [initializeWebSocket]);

  // --- ACTIONS ---

  const clearBetsOnCrash = useCallback(() => {
    setBetsById(new Map());
    betsRef.current = new Map();
  }, []);

  const getHistoryFromBackend = useCallback(async () => {
     try {
       const res = await api.get('/api/v1/crash/history');
       return res.data.items || [];
     } catch (e) { return []; }
  }, []);

  const canPlaceBet = useCallback(() => {
    if (!wsConnected || myActiveBetRef.current) return false;
    
    // Если флаг стоит, значит в этом раунде уже участвовали
    if (hasBetThisRoundRef.current) return false;
    
    const now = getServerTime();
    
    // Проверка времени
    if (roundBetsCloseAt) {
      if (now >= roundBetsCloseAt) return false;
    } else if (roundStartsAt) {
      if (now >= roundStartsAt - 3000) return false;
    }

    // Проверка статуса
    if (roundStatus !== 'betting' && roundStatus !== 'countdown') return false;
    
    return true;
  }, [wsConnected, roundBetsCloseAt, roundStartsAt, getServerTime, roundStatus]);

  const canPlaceCashout = useCallback(() => {
    if (myActiveBetRef.current?.status === 'win') return false;
    return roundStatus === 'running' && wsConnected && !!myActiveBetRef.current;
  }, [roundStatus, wsConnected]);

  const placeBet = useCallback((currency, amount, autoCashout) => {
    if (!canPlaceBet()) return false;
    hasBetThisRoundRef.current = true;
    return crashWebSocket.placeBet(currency, amount, autoCashout);
  }, [canPlaceBet]);

  const cashoutBet = useCallback(() => {
    if (!myActiveBetRef.current) return false;
    return crashWebSocket.cashout(myActiveBetRef.current.bet_id);
  }, []);

  const getCurrentBets = useCallback(() => {
    return Array.from(betsById.values()).sort((a,b) => (b.bet_id || 0) - (a.bet_id || 0));
  }, [betsById]);

  return {
    currentRoundId,
    multiplierNow,
    roundStatus,
    timeLeft,
    stage,
    setStage,
    wsConnected,
    crashMultiplier,
    lastMultipliers: lastMultipliers || [],
    bets: getCurrentBets(),
    myActiveBet,
    engineEvents,
    placeBet,
    cashoutBet,
    canBet: canPlaceBet(),
    canCashout: canPlaceCashout(),
    isCrashGameActive: wsConnected,
    isBettingPhase: roundStatus === 'betting',
    isFlyingPhase: roundStatus === 'running',
    getHistoryFromBackend,
    clearBetsOnCrash
  };
};