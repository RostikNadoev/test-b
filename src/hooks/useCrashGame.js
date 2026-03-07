import { useState, useEffect, useCallback, useRef } from 'react';
import { crashWebSocket } from '../utils/websocket';

export function useCrashGame() {
  const [multiplierNow, setMultiplierNow] = useState(1.0);
  const [roundStatus, setRoundStatus] = useState('betting'); // betting, running, crashed
  const [timeLeft, setTimeLeft] = useState(15);
  const [wsConnected, setWsConnected] = useState(false);
  const [bets, setBets] = useState([]);
  const [canBet, setCanBet] = useState(true);
  const [canCashout, setCanCashout] = useState(false);
  const [isCrashGameActive, setIsCrashGameActive] = useState(true);
  const [engineEvents, setEngineEvents] = useState({});
  const [stage, setStage] = useState('timer'); // timer, rocket, explosion
  const [myActiveBet, setMyActiveBet] = useState(null);
  const [lastMultipliers, setLastMultipliers] = useState([]);
  const [crashMultiplier, setCrashMultiplier] = useState(null);
  const [currentRoundId, setCurrentRoundId] = useState(null);
  
  const connectionAttemptRef = useRef(false);
  const eventHandlersRef = useRef({});
  const lastTickTimeRef = useRef(Date.now());

  // Подключение к WebSocket
  useEffect(() => {
    let mounted = true;

    const connectWebSocket = async () => {
      if (connectionAttemptRef.current) return;
      
      connectionAttemptRef.current = true;
      
      try {
        await crashWebSocket.connect();
        
        if (!mounted) return;
        
        setWsConnected(true);

        // Обработчики событий
        const handleState = (data) => {
          if (!mounted) return;
          setCurrentRoundId(data.round_id);
          setRoundStatus(data.status);
          setTimeLeft(data.time_left || 15);
          setMultiplierNow(data.current_multiplier || 1.0);
          setBets(data.bets || []);
          setCanBet(data.can_bet || false);
          setCanCashout(data.can_cashout || false);
          setStage(data.stage || 'timer');
          setCrashMultiplier(data.crash_multiplier || null);
          
          // Обновляем статус моей ставки
          if (data.my_bet) {
            setMyActiveBet(data.my_bet);
          } else {
            setMyActiveBet(null);
          }
        };

        const handleTick = (data) => {
          if (!mounted) return;
          lastTickTimeRef.current = Date.now();
          setMultiplierNow(data.multiplier);
          setTimeLeft(data.time_left);
          setEngineEvents(prev => ({ ...prev, tick: data }));
        };

        const handleBetUpdate = (data) => {
          if (!mounted) return;
          setBets(data.bets || []);
          if (data.my_bet) {
            setMyActiveBet(data.my_bet);
          }
          setEngineEvents(prev => ({ ...prev, bet_update: data }));
        };

        const handleBetResult = (data) => {
          if (!mounted) return;
          setEngineEvents(prev => ({ ...prev, bet_result: data }));
          if (data.bet) {
            setMyActiveBet(prev => prev?.bet_id === data.bet.bet_id ? null : prev);
          }
        };

        const handleCashoutOk = (data) => {
          if (!mounted) return;
          setEngineEvents(prev => ({ ...prev, cashout_ok: data }));
          setMyActiveBet(null);
          setCanCashout(false);
        };

        const handleRoundStart = (data) => {
          if (!mounted) return;
          console.log('🚀 Round started:', data);
          setCurrentRoundId(data.round_id);
          setRoundStatus('running');
          setStage('rocket');
          setMultiplierNow(1.0);
          setCrashMultiplier(null);
          setBets([]);
          setMyActiveBet(null);
          setCanBet(false);
          setCanCashout(false);
        };

        const handleRoundEnd = (data) => {
          if (!mounted) return;
          console.log('💥 Round ended:', data);
          setRoundStatus('crashed');
          setStage('explosion');
          setCrashMultiplier(data.crash_multiplier);
          setCanBet(false);
          setCanCashout(false);
          setEngineEvents(prev => ({ ...prev, crash: data }));
        };

        const handleBettingStart = (data) => {
          if (!mounted) return;
          console.log('⏱️ Betting started:', data);
          setRoundStatus('betting');
          setStage('timer');
          setTimeLeft(data.time_left || 15);
          setCanBet(true);
          setBets([]);
          setMyActiveBet(null);
        };

        const handleError = (data) => {
          if (!mounted) return;
          console.error('❌ WebSocket error event:', data);
          setEngineEvents(prev => ({ ...prev, error: data }));
        };

        // Регистрируем обработчики
        crashWebSocket.on('state', handleState);
        crashWebSocket.on('tick', handleTick);
        crashWebSocket.on('bet_update', handleBetUpdate);
        crashWebSocket.on('bet_result', handleBetResult);
        crashWebSocket.on('cashout_ok', handleCashoutOk);
        crashWebSocket.on('round_start', handleRoundStart);
        crashWebSocket.on('round_end', handleRoundEnd);
        crashWebSocket.on('betting_start', handleBettingStart);
        crashWebSocket.on('error', handleError);

        // Запрашиваем начальное состояние
        crashWebSocket.requestState();

      } catch (error) {
        console.error('Failed to connect WebSocket:', error);
        if (mounted) {
          setWsConnected(false);
        }
      } finally {
        connectionAttemptRef.current = false;
      }
    };

    connectWebSocket();

    // Проверка соединения каждые 5 секунд
    const connectionCheckInterval = setInterval(() => {
      if (mounted && !crashWebSocket.isReady()) {
        console.log('WebSocket not ready, attempting to reconnect...');
        setWsConnected(false);
        connectionAttemptRef.current = false;
        connectWebSocket();
      }
    }, 5000);

    return () => {
      mounted = false;
      clearInterval(connectionCheckInterval);
      crashWebSocket.disconnect();
    };
  }, []);

  // Функция для размещения ставки
  const placeBet = useCallback((currency, amount, autoCashout = null) => {
    if (!canBet) {
      console.log('Cannot bet at this time');
      return false;
    }

    const success = crashWebSocket.placeBet(currency, amount, autoCashout);
    
    if (success) {
      setCanBet(false); // Временно блокируем повторные ставки
    }
    
    return success;
  }, [canBet]);

  // Функция для кэшаута
  const cashoutBet = useCallback(() => {
    if (!myActiveBet) {
      console.log('No active bet to cashout');
      return false;
    }

    if (!canCashout) {
      console.log('Cannot cashout at this time');
      return false;
    }

    return crashWebSocket.cashout(myActiveBet.bet_id);
  }, [myActiveBet, canCashout]);

  // Функция для получения истории с бэкенда
  const getHistoryFromBackend = useCallback(async () => {
    try {
      const response = await fetch('https://shamefully-gifted-catbird.cloudpub.ru/api/crash/history');
      if (!response.ok) throw new Error('Failed to fetch history');
      const data = await response.json();
      setLastMultipliers(data.history || []);
      return data.history || [];
    } catch (error) {
      console.error('Error fetching crash history:', error);
      return [];
    }
  }, []);

  // Функция для очистки ставок при краше
  const clearBetsOnCrash = useCallback(() => {
    setBets([]);
    setMyActiveBet(null);
    setCanBet(true);
  }, []);

  return {
    multiplierNow,
    roundStatus,
    timeLeft,
    wsConnected,
    bets,
    placeBet,
    cashoutBet,
    canBet,
    canCashout,
    isCrashGameActive,
    engineEvents,
    stage,
    setStage,
    myActiveBet,
    lastMultipliers,
    crashMultiplier,
    getHistoryFromBackend,
    clearBetsOnCrash,
    currentRoundId
  };
}