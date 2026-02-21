import { useState, useEffect, useCallback } from 'react';
import { DemoProvider } from './contexts/DemoContext';
import { BalanceProvider } from './contexts/BalanceContext';
import LoadingScreen from './components/LoadingScreen';
import MainScreen from './components/MainScreen';
import PvpScreen from './components/PvpScreen';
import TasksScreen from './components/TasksScreen';
import ProfileScreen from './components/ProfileScreen';
import MainLayout from './components/MainLayout';
import LuckyBalls from './components/LuckyBalls';
import Rocket from './components/Rocket.jsx';
import CasesScreen from './components/CasesScreen';
import PlinkoScreen from './components/PlinkoScreen';
import SpinScreen from './components/SpinScreen'; // Единый SpinScreen

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

// PVP
import emptypat from './assets/PVP/empty-pat.png';
import mainpvp from './assets/PVP/main.png';

// MainScreen кнопки
import gameCard1 from './assets/MainPage/game-card-1.png';
import gameCard2 from './assets/MainPage/ttmb.png';
import gameCard3 from './assets/MainPage/cases.png';

// Cases
import firstCase from './assets/MainPage/cases/firstcasee.png';
import secondCase from './assets/MainPage/cases/secondcasee.png';
import thirdCase from './assets/MainPage/cases/thirdcasee.png';
import fourthCase from './assets/MainPage/cases/fourthcasee.png';
import fifthCase from './assets/MainPage/cases/fifthcasee.png';
import sixthCase from './assets/MainPage/cases/esixthcase.png';

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(true);
  const [currentScreen, setCurrentScreen] = useState('main');
  const [screenParams, setScreenParams] = useState({});
  const [userData, setUserData] = useState(null);
  const [tg, setTg] = useState(null);

  // Функция для обновления высоты viewport
  const applyViewport = (telegramApp) => {
    if (!telegramApp) return;
    
    const h = telegramApp.viewportStableHeight || window.innerHeight || document.documentElement.clientHeight;
    
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

  // Инициализация Telegram WebApp
  useEffect(() => {
    const initTelegram = () => {
      const telegramApp = window.Telegram?.WebApp;

      if (!telegramApp) {
        console.warn('⚠️ Telegram WebApp не обнаружен');
        setIsAuthenticating(false);
        return;
      }

      setTg(telegramApp);
      
      console.log('🚀 Telegram WebApp init...');
      
      telegramApp.ready();
      
      // ВСЁ СРАЗУ без таймаутов
      const executeImmediately = () => {
        // 1. ЗАПРЕЩАЕМ свайпы вниз ПЕРВЫМ делом - ГЛАВНОЕ ИЗМЕНЕНИЕ
        if (telegramApp.disableVerticalSwipes) {
          telegramApp.disableVerticalSwipes();
          console.log('🚫 Vertical swipes disabled via Telegram API');
        } else {
          console.warn('⚠️ disableVerticalSwipes not available in this Telegram client');
        }
        
        // 2. Блокируем масштабирование (pinch-to-zoom)
        if (telegramApp.disableVerticalSwipes) {
          // Этот же метод часто блокирует и масштабирование
          telegramApp.disableVerticalSwipes();
          console.log('🔒 Pinch-to-zoom disabled via Telegram API');
        }
        
        // 3. Fullscreen
        if (telegramApp.requestFullscreen) {
          try {
            telegramApp.requestFullscreen();
            console.log('📱 Fullscreen immediate');
          } catch (e) {}
        }
        
        // 4. Expand
        telegramApp.expand();
        
        // 5. Установка высоты
        const h = Math.max(
          telegramApp.viewportStableHeight || 0,
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
        
        // 6. Дополнительные CSS настройки для надежности
        document.body.style.overscrollBehavior = 'none';
        document.body.style.touchAction = 'none';
        document.body.style.position = 'fixed';
        document.body.style.width = '100%';
        document.body.style.overflow = 'hidden';
        
        // Применяем те же стили к корневому элементу
        if (root) {
          root.style.overscrollBehavior = 'none';
          root.style.touchAction = 'none';
          root.style.position = 'fixed';
          root.style.width = '100%';
          root.style.overflow = 'hidden';
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
      
      // Обработчик для изменений viewport
      const handleViewportChange = () => {
        // При каждом изменении viewport обновляем запрет свайпов и масштабирования
        if (telegramApp.disableVerticalSwipes) {
          telegramApp.disableVerticalSwipes();
        }
        
        if (telegramApp.requestFullscreen) telegramApp.requestFullscreen();
        telegramApp.expand();
        
        const h = telegramApp.viewportStableHeight || window.innerHeight;
        document.documentElement.style.setProperty('--tg-viewport-height', `${h}px`);
        document.documentElement.style.setProperty('--app-height', `${h}px`);
      };
      
      telegramApp.onEvent('viewportChanged', handleViewportChange);
      
      // Обработчик закрытия приложения
      telegramApp.onEvent('close', () => {
        console.log('🚪 App closed by user');
      });
      
      // Запускаем авторизацию
      authenticateUser();

      return () => {
        telegramApp.offEvent('viewportChanged', handleViewportChange);
        telegramApp.offEvent('close', () => {});
      };
    };

    initTelegram();
  }, []);

  // Дополнительный эффект для блокировки свайпов и зумирования через JS
  useEffect(() => {
    if (!tg) return;

    // Функция для агрессивной блокировки свайпов и масштабирования
    const blockGesturesAggressively = () => {
      // 1. Telegram API методы (основные)
      if (tg.disableVerticalSwipes) {
        tg.disableVerticalSwipes(); // Блокирует и свайпы, и масштабирование
      }
      
      // 2. Блокировка масштабирования (pinch-to-zoom) через мета-тег
      const metaViewport = document.querySelector('meta[name="viewport"]');
      if (metaViewport) {
        metaViewport.setAttribute('content', 
          'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover'
        );
      }
      
      // 3. Блокировка через preventDefault для touch событий
      const blockTouchEvents = (e) => {
        // Блокируем мультитач (масштабирование)
        if (e.touches && e.touches.length > 1) {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }
        
        // Блокируем свайпы в верхней части экрана
        if (e.touches && e.touches.length === 1) {
          const touchY = e.touches[0].clientY;
          // Если касание в верхних 50px экрана - блокируем
          if (touchY < 50) {
            e.preventDefault();
            e.stopPropagation();
            return false;
          }
        }
      };

      // 4. Блокировка pull-to-refresh и масштабирования
      let startY = 0;
      let startDistance = 0;
      
      const handleTouchStart = (e) => {
        if (e.touches.length === 1) {
          startY = e.touches[0].clientY;
        }
        if (e.touches.length === 2) {
          // Вычисляем начальное расстояние между пальцами
          const dx = e.touches[0].clientX - e.touches[1].clientX;
          const dy = e.touches[0].clientY - e.touches[1].clientY;
          startDistance = Math.sqrt(dx * dx + dy * dy);
        }
      };
      
      const handleTouchMove = (e) => {
        // Блокируем все мультитач жесты (масштабирование)
        if (e.touches.length > 1) {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }
        
        if (e.touches.length === 1) {
          const currentY = e.touches[0].clientY;
          const diffY = currentY - startY;
          
          // Если пытаемся свайпнуть вниз из верхней части экрана - блокируем
          if (diffY > 0 && startY < 100 && window.scrollY === 0) {
            e.preventDefault();
            e.stopPropagation();
            return false;
          }
        }
      };
      
      // 5. Блокировка двойного тапа для зумирования
      let lastTouchEnd = 0;
      const handleTouchEnd = (e) => {
        const now = Date.now();
        if (now - lastTouchEnd <= 300) {
          e.preventDefault();
          e.stopPropagation();
        }
        lastTouchEnd = now;
      };

      // Добавляем обработчики
      document.addEventListener('touchstart', handleTouchStart, { passive: true });
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchstart', blockTouchEvents, { passive: false });
      document.addEventListener('touchmove', blockTouchEvents, { passive: false });
      document.addEventListener('touchend', blockTouchEvents, { passive: false });
      document.addEventListener('touchend', handleTouchEnd, { passive: false });
      document.addEventListener('touchcancel', handleTouchEnd, { passive: false });
      
      // 6. Блокировка контекстного меню
      const blockContextMenu = (e) => {
        e.preventDefault();
        return false;
      };
      document.addEventListener('contextmenu', blockContextMenu);
      
      // 7. Блокировка жеста double-tap для зумирования
      document.addEventListener('dblclick', (e) => {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }, { passive: false });
      
      // 8. Устанавливаем глобальные стили для блокировки масштабирования
      const style = document.createElement('style');
      style.textContent = `
        html, body, #root {
          overscroll-behavior: none !important;
          -webkit-overflow-scrolling: none !important;
          touch-action: manipulation !important;
          position: fixed !important;
          width: 100% !important;
          height: 100% !important;
          overflow: hidden !important;
        }
        
        * {
          -webkit-touch-callout: none !important;
          -webkit-user-select: none !important;
          -moz-user-select: none !important;
          -ms-user-select: none !important;
          user-select: none !important;
          -webkit-user-drag: none !important;
          -webkit-tap-highlight-color: transparent !important;
        }
        
        /* Блокировка масштабирования изображений */
        img {
          -webkit-user-drag: none;
          -khtml-user-drag: none;
          -moz-user-drag: none;
          -o-user-drag: none;
          user-drag: none;
        }
        
        /* Отключаем выделение текста */
        input, textarea {
          -webkit-user-select: auto !important;
          user-select: auto !important;
        }
      `;
      document.head.appendChild(style);
      
      // 9. Устанавливаем глобальные атрибуты
      document.documentElement.style.touchAction = 'manipulation';
      document.documentElement.style.msTouchAction = 'none';
      
      return () => {
        document.removeEventListener('touchstart', handleTouchStart);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchstart', blockTouchEvents);
        document.removeEventListener('touchmove', blockTouchEvents);
        document.removeEventListener('touchend', blockTouchEvents);
        document.removeEventListener('touchend', handleTouchEnd);
        document.removeEventListener('touchcancel', handleTouchEnd);
        document.removeEventListener('contextmenu', blockContextMenu);
        document.removeEventListener('dblclick', blockContextMenu);
        document.head.removeChild(style);
      };
    };

    const cleanup = blockGesturesAggressively();
    
    return () => {
      if (cleanup) cleanup();
    };
  }, [tg]);

  // Функция навигации с поддержкой параметров
  const navigateTo = useCallback((screen, params = {}) => {
    console.log(`🔄 Navigating to: ${screen}`, params);
    
    // Сохраняем параметры для экрана
    setScreenParams(params);
    setCurrentScreen(screen);
  }, []);

  // Функция для управления BackButton
  const setupBackButtonLogic = useCallback((screen) => {
    if (!tg || !tg.BackButton) {
      console.warn('⚠️ BackButton not available');
      return;
    }

    // Страницы, где нужна кнопка "Назад"
    const backButtonScreens = ['profile', 'luckyballs', 'rocket', 'cases', 'plinko', 'spin'];
    
    if (backButtonScreens.includes(screen)) {
      try {
        // Показываем BackButton
        tg.BackButton.show();
        
        // Создаем обработчик для нажатия на BackButton
        const handleBackClick = () => {
          console.log(`🔙 Back button clicked from ${screen}`);
          navigateTo('main');
        };
        
        // Удаляем старые обработчики если есть
        if (tg.BackButton.onClick) {
          // Создаем новую функцию чтобы избежать дублирования
          tg.BackButton.offClick(handleBackClick);
        }
        
        // Устанавливаем обработчик
        tg.BackButton.onClick(handleBackClick);
        
        console.log(`✅ BackButton установлен для экрана: ${screen}`);
      } catch (error) {
        console.error('❌ Error setting up BackButton:', error);
      }
    } else {
      // Скрываем BackButton на других страницах
      try {
        if (tg.BackButton.isVisible) {
          tg.BackButton.hide();
        }
      } catch (error) {
        console.warn('⚠️ Error hiding BackButton:', error);
      }
    }
  }, [tg, navigateTo]);

  // Эффект для обновления BackButton при смене экрана
  useEffect(() => {
    if (tg) {
      setupBackButtonLogic(currentScreen);
    }
  }, [currentScreen, setupBackButtonLogic, tg]);

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
    coinIcon,
    logoImage,
    l1, l2, l3, l4, l5, l6,
    l1a, l2a, l3a, l4a, l5a, l6a,
    ballsq,
    timerImg,
    gameCard1,
    gameCard2,
    gameCard3,
    firstCase,
    secondCase,
    thirdCase,
    fourthCase,
    fifthCase,
    sixthCase
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
  }, [isAuthenticating, isLoading, tg]);

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
    <SpinScreen 
      onNavigate={navigateTo} 
      caseId={screenParams.caseId}
      winData={screenParams.winData}
      isDemo={screenParams.isDemo}
    />
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