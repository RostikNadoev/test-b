import { useState, useEffect } from 'react';
import { DemoProvider } from './contexts/DemoContext';
import { BalanceProvider } from './contexts/BalanceContext';
import LoadingScreen from './components/LoadingScreen';
import MainScreen from './components/MainScreen';
import PvpScreen from './components/PvpScreen';
import TasksScreen from './components/TasksScreen';
import Card1Screen from './components/Card1Screen';
import Card2Screen from './components/Card2Screen';
import Card3Screen from './components/Card3Screen';
import ProfileScreen from './components/ProfileScreen';
import SpinScreen from './components/SpinScreen';
import Spin2Screen from './components/Spin2Screen';
import Spin1Screen from './components/Spin1Screen';
import MainLayout from './components/MainLayout';
import LuckyBalls from './components/LuckyBalls';
import Rocket from './components/Rocket.jsx';

// Импортируем AssetLoader
import { preloadImages } from './utils/AssetLoader';
import { authApi } from './utils/api';

// === 🔥 ИМПОРТ ВСЕХ ИЗОБРАЖЕНИЙ ===
// ProfileScreen
import gift from './assets/Profile/gift.png';
import giftchange from './assets/Profile/giftchange.png';
import tonGift from './assets/Profile/ton-gift.svg';
import modalCloseIcon from './assets/Profile/close.png';

// MainScreen
import banner from './assets/MainPage/banner.png';
import middle from './assets/MainPage/middle.png';
import cardBack1 from './assets/MainPage/chest1/back.png';
import cardBack2 from './assets/MainPage/chest1/back2.png';
import cardBack3 from './assets/MainPage/chest1/back3.png';
import cardMain1 from './assets/MainPage/chest1/main.png';
import cardMain2 from './assets/MainPage/chest2/main.png';
import cardMain3 from './assets/MainPage/chest3/main.png';
import cardton1 from './assets/MainPage/chest1/ton.png';
import cardton2 from './assets/MainPage/chest2/ton.png';
import cardton3 from './assets/MainPage/chest3/ton.png';

// Common UI
import ava from './assets/MainPage/ava.jpg';
import ton from './assets/MainPage/ton.svg';
import add_balance from './assets/MainPage/add_balance.svg';
import foot from './assets/MainPage/foot.png';
import footover from './assets/MainPage/foot-on.svg';
import pvpicon from './assets/MainPage/pvp-icon.svg';
import homeicon from './assets/MainPage/home-icon.svg';
import tasksicon from './assets/MainPage/tasks-icon.svg';
import closeIcon from './assets/MainPage/close.png';
import star from './assets/MainPage/star1.png';
import tonIcon from './assets/Ton.svg';

import ballsq from './assets/Lucky/ballsq.png';
import timerImg from './assets/Rocket/timer.png';

// Spin Screens
import arrow from './assets/SpinPage/arrow.png';

// TasksScreen
import coinIcon from './assets/Tasks/coin.png';

// LoadingScreen
import logoImage from './assets/LoadPage/logo.png';
import l1 from './assets/LoadPage/b.png';
import l2 from './assets/LoadPage/o.png';
import l3 from './assets/LoadPage/u.png';
import l4 from './assets/LoadPage/n.png';
import l5 from './assets/LoadPage/c.png';
import l6 from './assets/LoadPage/e.png';
import l1a from './assets/LoadPage/1a.png';
import l2a from './assets/LoadPage/2a.png';
import l3a from './assets/LoadPage/3a.png';
import l4a from './assets/LoadPage/4a.png';
import l5a from './assets/LoadPage/5a.png';
import l6a from './assets/LoadPage/6a.png';

//PVP
import emptypat from './assets/PVP/empty-pat.png';
import mainpvp from './assets/PVP/main.png';

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(true);
  const [currentScreen, setCurrentScreen] = useState('main');
  const [currentCardIndex, setCurrentCardIndex] = useState(2);
  const [userData, setUserData] = useState(null);

  // Функция для обновления высоты viewport
  const applyViewport = (tg) => {
    if (!tg) return;
    
    // Используем стабильную высоту viewport или высоту окна
    const h = tg.viewportStableHeight || window.innerHeight || document.documentElement.clientHeight;
    
    // Устанавливаем CSS переменную
    document.documentElement.style.setProperty('--tg-viewport-height', `${h}px`);
    document.documentElement.style.setProperty('--app-height', `${h}px`);
    
    console.log('📏 Viewport height updated:', h);
  };

  // Функция авторизации пользователя
  const authenticateUser = async () => {
    try {
      console.log('🔐 Начинаем авторизацию пользователя...');
      
      if (authApi.isAuthenticated()) {
        console.log('✅ Найден сохраненный токен, получаем данные пользователя...');
        try {
          const data = await authApi.getMe();
          setUserData(data.user);
          console.log('✅ Данные пользователя загружены:', data.user.username);
        } catch (error) {
          console.warn('❌ Токен невалиден, пробуем авторизоваться через Telegram');
          await authenticateWithTelegram();
        }
      } else {
        await authenticateWithTelegram();
      }
    } catch (error) {
      console.error('❌ Ошибка авторизации:', error);
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Авторизация через Telegram
  const authenticateWithTelegram = async () => {
    if (window.Telegram?.WebApp?.initData) {
      console.log('📱 Получаем initData от Telegram WebApp...');
      const initData = window.Telegram.WebApp.initData;
      
      try {
        const authData = await authApi.login(initData);
        setUserData(authData.user);
        console.log('✅ Авторизация через Telegram успешна:', authData.user.username);
      } catch (error) {
        console.error('❌ Ошибка авторизации через Telegram:', error);
      }
    } else {
      console.warn('⚠️ Telegram WebApp initData недоступен');
    }
  };

// Инициализация Telegram WebApp - ОПТИМИЗИРОВАННЫЙ
useEffect(() => {
  const initTelegram = () => {
    const tg = window.Telegram?.WebApp;

    if (!tg) {
      console.warn('⚠️ Telegram WebApp не обнаружен');
      setIsAuthenticating(false);
      return;
    }

    console.log('🚀 Telegram WebApp init...');
    
    // ОДНОВРЕМЕННО делаем всё:
    // 1. ready + expand + requestFullscreen одновременно
    tg.ready();
    
    // ВСЁ СРАЗУ без таймаутов
    const executeImmediately = () => {
      // Fullscreen ПЕРВЫМ делом
      if (tg.requestFullscreen) {
        try {
          tg.requestFullscreen();
          console.log('📱 Fullscreen immediate');
        } catch (e) {}
      }
      
      // Expand ВТОРЫМ
      tg.expand();
      
      // Установка высоты
      const h = Math.max(
        tg.viewportStableHeight || 0,
        window.innerHeight || 0,
        document.documentElement.clientHeight || 0
      );
      
      document.documentElement.style.setProperty('--tg-viewport-height', `${h}px`);
      document.documentElement.style.setProperty('--app-height', `${h}px`);
      
      // Принудительно для body и root
      document.body.style.height = `${h}px`;
      document.body.style.minHeight = `${h}px`;
      const root = document.getElementById('root');
      if (root) {
        root.style.height = `${h}px`;
        root.style.minHeight = `${h}px`;
      }
    };
    
    // ВЫПОЛНЯЕМ ПРЯМО СЕЙЧАС
    executeImmediately();
    
    // И ещё раз на следующем кадре анимации
    requestAnimationFrame(() => {
      executeImmediately();
    });
    
    // И ещё через 1 кадр
    requestAnimationFrame(() => {
      requestAnimationFrame(executeImmediately);
    });
    
    // Обработчик для изменений
    const handleViewportChange = () => {
      if (tg.requestFullscreen) tg.requestFullscreen();
      tg.expand();
      
      const h = tg.viewportStableHeight || window.innerHeight;
      document.documentElement.style.setProperty('--tg-viewport-height', `${h}px`);
      document.documentElement.style.setProperty('--app-height', `${h}px`);
    };
    
    tg.onEvent('viewportChanged', handleViewportChange);
    
    // Запускаем авторизацию
    authenticateUser();

    return () => {
      tg.offEvent('viewportChanged', handleViewportChange);
    };
  };

  initTelegram();
}, []);

  // === 🔥 Список всех URL-адресов изображений для предзагрузки ===
  const allImageUrls = [
    gift,
    giftchange,
    tonGift,
    modalCloseIcon,
    banner,
    middle,
    cardBack1,
    cardBack2,
    cardBack3,
    cardMain1,
    cardMain2,
    cardMain3,
    cardton1,
    cardton2,
    cardton3,
    ava,
    ton,
    add_balance,
    foot,
    footover,
    pvpicon,
    homeicon,
    tasksicon,
    closeIcon,
    star,
    emptypat,
    mainpvp,
    tonIcon,
    arrow,
    coinIcon,
    logoImage,
    l1, l2, l3, l4, l5, l6,
    l1a, l2a, l3a, l4a, l5a, l6a,
    ballsq,
    timerImg
  ];

  // Функция загрузки и анимации
  const loadAssetsAndAnimate = async () => {
    console.log('🔄 Начинаем предзагрузку изображений...');
    await preloadImages(allImageUrls);
    console.log('✅ Все изображения загружены');
  };

  // Загрузка ассетов
  useEffect(() => {
    loadAssetsAndAnimate();
  }, []);

  // Завершение загрузки когда все готово
  useEffect(() => {
    if (!isAuthenticating && !isLoading) {
      console.log('🚀 Приложение полностью загружено и готово к работе');
    }
  }, [isAuthenticating, isLoading]);

  const navigateTo = (screen, cardIndex = 2) => {
    setCurrentScreen(screen);
    if (['card1', 'card2', 'card3'].includes(screen)) {
      setCurrentCardIndex(cardIndex);
    }
  };

  const handleLoadingComplete = () => {
    setIsLoading(false);
  };

  const renderScreen = () => {
    // Показываем LoadingScreen пока идет загрузка или авторизация
    if (isLoading || isAuthenticating) {
      return <LoadingScreen onLoaded={handleLoadingComplete} />;
    }

    switch (currentScreen) {
      case 'profile':
        return <ProfileScreen onNavigate={navigateTo} />;
      case 'pvp':
        return <PvpScreen onNavigate={navigateTo} />;
      case 'tasks':
        return <TasksScreen onNavigate={navigateTo} />;
      case 'card1':
        return <Card1Screen onNavigate={navigateTo} currentCardIndex={currentCardIndex} />;
      case 'card2':
        return <Card2Screen onNavigate={navigateTo} currentCardIndex={currentCardIndex} />;
      case 'card3':
        return <Card3Screen onNavigate={navigateTo} currentCardIndex={currentCardIndex} />;
      case 'luckyballs': 
        return <LuckyBalls onNavigate={navigateTo} currentCardIndex={currentCardIndex} />;
      case 'rocket':
        return <Rocket onNavigate={navigateTo} currentCardIndex={currentCardIndex}/>;
      case 'spin':
        return (
          <MainLayout
            onNavigate={navigateTo}
            currentScreen={currentScreen}
            hideFooter={true}
            customBackground={'../assets/SpinPage/back.png'}
          >
            <SpinScreen onNavigate={navigateTo} />
          </MainLayout>
        );
      case 'spin2':
        return (
          <MainLayout
            onNavigate={navigateTo}
            currentScreen={currentScreen}
            hideFooter={true}
            customBackground={'../assets/SpinPage/back.png'}
          >
            <Spin2Screen onNavigate={navigateTo} />
          </MainLayout>
        );
      case 'spin1':
        return (
          <MainLayout
            onNavigate={navigateTo}
            currentScreen={currentScreen}
            hideFooter={true}
            customBackground={'../assets/SpinPage/back.png'}
          >
            <Spin1Screen onNavigate={navigateTo} />
          </MainLayout>
        );
      case 'main':
      default:
        return <MainScreen onNavigate={navigateTo} initialCardIndex={currentCardIndex} />;
    }
  };

  return (
    <DemoProvider>
      <BalanceProvider>
        <div>
          {renderScreen()}
        </div>
      </BalanceProvider>
    </DemoProvider>
  );
}