import { useState, useEffect, useCallback } from 'react';
import { DemoProvider } from './contexts/DemoContext';
import { BalanceProvider } from './contexts/BalanceContext';
import LoadingScreen from './components/LoadingScreen';
import MainScreen from './components/MainScreen';
import PvpScreen from './components/PvpScreen';
import TasksScreen from './components/TasksScreen';
import ProfileScreen from './components/ProfileScreen';
import LuckyBalls from './components/LuckyBalls';
import Rocket from './components/Rocket.jsx';
import CasesScreen from './components/CasesScreen';
import PlinkoScreen from './components/PlinkoScreen';
import SpinScreen from './components/SpinScreen'; // Единый SpinScreen
import MainLayout from './components/MainLayout';

// AssetLoader
import { preloadImages } from './utils/AssetLoader';
import { authApi } from './utils/api';

// === ИМПОРТ ИЗОБРАЖЕНИЙ ===
import gift from './assets/Profile/gift.png';
import giftchange from './assets/Profile/giftchange.png';
import tonGift from './assets/Profile/ton-gift.svg';
import modalCloseIcon from './assets/Profile/close.png';
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
import arrow from './assets/SpinPage/arrow.png';
import coinIcon from './assets/Tasks/coin.png';
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
import emptypat from './assets/PVP/empty-pat.png';
import mainpvp from './assets/PVP/main.png';
import gameCard1 from './assets/MainPage/game-card-1.png';
import gameCard2 from './assets/MainPage/ttmb.png';
import gameCard3 from './assets/MainPage/cases.png';

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(true);
  const [currentScreen, setCurrentScreen] = useState('main');
  const [currentCardIndex, setCurrentCardIndex] = useState(2);
  const [screenParams, setScreenParams] = useState({});
  const [userData, setUserData] = useState(null);
  const [tg, setTg] = useState(null);

  // Применение viewport
  const applyViewport = (telegramApp) => {
    if (!telegramApp) return;
    
    const h = telegramApp.viewportStableHeight || window.innerHeight || document.documentElement.clientHeight;
    
    document.documentElement.style.setProperty('--tg-viewport-height', `${h}px`);
    document.documentElement.style.setProperty('--app-height', `${h}px`);
    
    document.body.style.height = `${h}px`;
    document.body.style.minHeight = `${h}px`;
    const root = document.getElementById('root');
    if (root) {
      root.style.height = `${h}px`;
      root.style.minHeight = `${h}px`;
    }
  };

  // Авторизация
  const authenticateUser = async () => {
    try {
      console.log('🔐 Начинаем авторизацию...');
      
      if (authApi.isAuthenticated()) {
        try {
          const data = await authApi.getMe();
          setUserData(data.user);
          console.log('✅ Данные пользователя загружены');
        } catch (error) {
          console.warn('❌ Токен невалиден');
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

  const authenticateWithTelegram = async () => {
    if (window.Telegram?.WebApp?.initData) {
      try {
        const authData = await authApi.login(window.Telegram.WebApp.initData);
        setUserData(authData.user);
        console.log('✅ Авторизация через Telegram успешна');
      } catch (error) {
        console.error('❌ Ошибка авторизации через Telegram:', error);
      }
    }
  };

  // Инициализация Telegram
  useEffect(() => {
    const initTelegram = () => {
      const telegramApp = window.Telegram?.WebApp;

      if (!telegramApp) {
        console.warn('⚠️ Telegram WebApp не обнаружен');
        setIsAuthenticating(false);
        return;
      }

      setTg(telegramApp);
      
      telegramApp.ready();
      
      // Блокировка свайпов
      if (telegramApp.disableVerticalSwipes) {
        telegramApp.disableVerticalSwipes();
      }
      
      if (telegramApp.requestFullscreen) {
        telegramApp.requestFullscreen();
      }
      
      telegramApp.expand();
      
      applyViewport(telegramApp);
      
      // Обработчик изменения viewport
      const handleViewportChange = () => {
        applyViewport(telegramApp);
        if (telegramApp.disableVerticalSwipes) {
          telegramApp.disableVerticalSwipes();
        }
      };
      
      telegramApp.onEvent('viewportChanged', handleViewportChange);
      
      authenticateUser();

      return () => {
        telegramApp.offEvent('viewportChanged', handleViewportChange);
      };
    };

    initTelegram();
  }, []);

  // Навигация
  const navigateTo = useCallback((screen, params = {}) => {
    console.log(`🔄 Navigating to: ${screen}`, params);
    setScreenParams(params);
    
    if (params.cardIndex !== undefined) {
      setCurrentCardIndex(params.cardIndex);
    }
    
    setCurrentScreen(screen);
  }, []);

  // BackButton
  const setupBackButtonLogic = useCallback((screen) => {
    if (!tg || !tg.BackButton) return;

    const backButtonScreens = ['profile', 'luckyballs', 'rocket', 'cases', 'plinko', 'spin'];
    
    if (backButtonScreens.includes(screen)) {
      tg.BackButton.show();
      
      const handleBackClick = () => {
        console.log(`🔙 Back from ${screen} to main`);
        navigateTo('main');
      };
      
      tg.BackButton.onClick(handleBackClick);
      
      return () => {
        tg.BackButton.offClick(handleBackClick);
      };
    } else {
      if (tg.BackButton.isVisible) {
        tg.BackButton.hide();
      }
    }
  }, [tg, navigateTo]);

  useEffect(() => {
    if (tg) {
      const cleanup = setupBackButtonLogic(currentScreen);
      return cleanup;
    }
  }, [currentScreen, setupBackButtonLogic, tg]);

  // Предзагрузка изображений
  const allImageUrls = [
    gift, giftchange, tonGift, modalCloseIcon,
    banner, middle, cardBack1, cardBack2, cardBack3,
    cardMain1, cardMain2, cardMain3, cardton1, cardton2, cardton3,
    ava, ton, add_balance, foot, footover, pvpicon, homeicon, tasksicon,
    closeIcon, star, emptypat, mainpvp, tonIcon, arrow, coinIcon,
    logoImage, l1, l2, l3, l4, l5, l6, l1a, l2a, l3a, l4a, l5a, l6a,
    ballsq, timerImg, gameCard1, gameCard2, gameCard3
  ];

  useEffect(() => {
    const loadAssets = async () => {
      console.log('🔄 Предзагрузка изображений...');
      await preloadImages(allImageUrls);
      console.log('✅ Изображения загружены');
    };
    loadAssets();
  }, []);

  useEffect(() => {
    if (!isAuthenticating && !isLoading) {
      console.log('🚀 Приложение готово');
    }
  }, [isAuthenticating, isLoading]);

  const handleLoadingComplete = () => {
    setIsLoading(false);
  };

  const renderScreen = () => {
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
      case 'plinko':
        return <PlinkoScreen onNavigate={navigateTo} />;
      case 'luckyballs': 
        return <LuckyBalls onNavigate={navigateTo} />;
      case 'rocket':
        return <Rocket onNavigate={navigateTo} />;
      case 'cases':
        return <CasesScreen onNavigate={navigateTo} />;
      case 'spin':
        return (
          <MainLayout
            onNavigate={navigateTo}
            currentScreen={currentScreen}
            hideFooter={true}
            customBackground={'../assets/SpinPage/back.png'}
          >
            <SpinScreen 
              onNavigate={navigateTo} 
              winData={screenParams.winData}
            />
          </MainLayout>
        );
      case 'main':
      default:
        return <MainScreen onNavigate={navigateTo} />;
    }
  };

  return (
    <DemoProvider>
      <BalanceProvider>
        <div className="app-container">
          {renderScreen()}
        </div>
      </BalanceProvider>
    </DemoProvider>
  );
}