import { useState, useEffect, useCallback, useRef } from 'react';
import { crashWebSocket } from '../utils/websocket';
import api from '../utils/api';

export const useCrashGame = () => {
  const [currentRoundId, setCurrentRoundId] = useState(null);
  const [multiplierNow, setMultiplierNow] = useState(1.0);
  const [roundStatus, setRoundStatus] = useState('waiting');
  const [timeLeft, setTimeLeft] = useState(15);
  const [stage, setStage] = useState('timer');
  const [crashMultiplier, setCrashMultiplier] = useState(null);
  const [betsById, setBetsById] = useState(new Map());
  const [myActiveBet, setMyActiveBet] = useState(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [engineEvents, setEngineEvents] = useState({});

  const roundStartsAtRef = useRef(null);
  const myActiveBetRef = useRef(null);
  const hasBetThisRoundRef = useRef(false);

  // --- ТАЙМЕР (Исправлено: теперь он независим от ререндеров модалки) ---
  useEffect(() => {
    const timerInterval = setInterval(() => {
      if (roundStartsAtRef.current) {
        const diff = roundStartsAtRef.current - Date.now();
        const sec = Math.max(0, Math.ceil(diff / 1000));
        setTimeLeft(sec);
      }
    }, 100);
    return () => clearInterval(timerInterval);
  }, []);

  const clearAllBets = useCallback(() => {
    setBetsById(new Map());
    setMyActiveBet(null);
    myActiveBetRef.current = null;
  }, []);

  // --- ИНИЦИАЛИЗАЦИЯ WS (Исправлено: зависимости убраны для стабильности) ---
  const initializeWebSocket = useCallback(async () => {
    try {
      await crashWebSocket.connect();
      setWsConnected(true);

      crashWebSocket.on('state', (data) => {
        if (data.round) {
          roundStartsAtRef.current = new Date(data.round.starts_at).getTime();
          setRoundStatus(data.round.status);
          setCurrentRoundId(data.round.id);
        }
        if (data.multiplier) setMultiplierNow(data.multiplier);
      });

      crashWebSocket.on('round', (data) => {
        // Жесткая очистка таблицы при получении данных о новом раунде
        setCurrentRoundId(data.round_id || data.id);
        roundStartsAtRef.current = new Date(data.starts_at || data.round.starts_at).getTime();
        setRoundStatus('betting');
        setStage('timer');
        setMultiplierNow(1.0);
        clearAllBets(); 
        hasBetThisRoundRef.current = false;
      });

      crashWebSocket.on('tick', (data) => {
        setMultiplierNow(data.multiplier);
        setStage('rocket');
      });

      crashWebSocket.on('crash', (data) => {
        setRoundStatus('crashed');
        setStage('explosion');
        setCrashMultiplier(data.multiplier);
        setEngineEvents({ crash: data });
      });

      crashWebSocket.on('bet_placed', (data) => {
        setBetsById(prev => new Map(prev).set(data.bet.bet_id || data.bet.id, data.bet));
      });

      crashWebSocket.on('bet_ok', (data) => {
        setMyActiveBet(data.bet);
        myActiveBetRef.current = data.bet;
        hasBetThisRoundRef.current = true;
      });

      crashWebSocket.on('cashout_ok', (data) => {
        setEngineEvents({ cashout_ok: data });
        setMyActiveBet(prev => ({ ...prev, status: 'win', x: data.multiplier }));
      });

    } catch (e) {
      console.error('WS Error', e);
    }
  }, [clearAllBets]); // Только одна зависимость

  useEffect(() => {
    initializeWebSocket();
    return () => crashWebSocket.disconnect();
  }, [initializeWebSocket]);

  return {
    multiplierNow,
    roundStatus,
    timeLeft,
    stage,
    setStage,
    wsConnected,
    bets: Array.from(betsById.values()),
    myActiveBet,
    placeBet: (c, a, x) => crashWebSocket.placeBet(c, a, x),
    cashoutBet: () => crashWebSocket.cashout(myActiveBetRef.current?.bet_id),
    canBet: roundStatus === 'betting' && !hasBetThisRoundRef.current,
    canCashout: roundStatus === 'running' && !!myActiveBet && myActiveBet.status !== 'win',
    engineEvents,
    crashMultiplier,
    clearBetsOnCrash: clearAllBets,
    currentRoundId,
    getHistoryFromBackend: () => api.get('/api/v1/crash/history').then(r => r.data.items)
  };
};