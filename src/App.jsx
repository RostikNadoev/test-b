// App.jsx

import { useState, useEffect } from 'react';
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

// Импортируем AssetLoader
import { preloadImages } from './utils/AssetLoader';

// === 🔥 ИМПОРТ ВСЕХ ИЗОБРАЖЕНИЙ ===
// ProfileScreen
import gift from './assets/Profile/gift.png';
import giftchange from './assets/Profile/giftchange.png';
import tonGift from './assets/Profile/ton-gift.svg';
import modalCloseIcon from './assets/Profile/close.svg';

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

// Spin Items (Card 1)
import item1_1 from './assets/MainPage/chest1/in/1-1.png';
import item1_2 from './assets/MainPage/chest1/in/1-2.png';
import item1_3 from './assets/MainPage/chest1/in/1-3.png';
import item1_4 from './assets/MainPage/chest1/in/1-4.png';
import item1_5 from './assets/MainPage/chest1/in/1-5.png';
import item1_6 from './assets/MainPage/chest1/in/1-6.png';
import item1_7 from './assets/MainPage/chest1/in/1-7.png';
import item1_8 from './assets/MainPage/chest1/in/1-8.png';
import item1_9 from './assets/MainPage/chest1/in/1-9.png';
import item1_10 from './assets/MainPage/chest1/in/1-10.png';
import item1_11 from './assets/MainPage/chest1/in/1-11.png';
import item1_12 from './assets/MainPage/chest1/in/1-12.png';

// Spin Items (Card 2)
import item2_1 from './assets/MainPage/chest2/in/2-1.png';
import item2_2 from './assets/MainPage/chest2/in/2-2.png';
import item2_3 from './assets/MainPage/chest2/in/2-3.png';
import item2_4 from './assets/MainPage/chest2/in/2-4.png';
import item2_5 from './assets/MainPage/chest2/in/2-5.png';
import item2_6 from './assets/MainPage/chest2/in/2-6.png';
import item2_7 from './assets/MainPage/chest2/in/2-7.png';
import item2_8 from './assets/MainPage/chest2/in/2-8.png';
import item2_9 from './assets/MainPage/chest2/in/2-9.png';
import item2_10 from './assets/MainPage/chest2/in/2-10.png';

// Spin Items (Card 3)
import item3_1 from './assets/MainPage/chest3/in/3-1.png';
import item3_2 from './assets/MainPage/chest3/in/3-2.png';
import item3_3 from './assets/MainPage/chest3/in/3-3.png';
import item3_4 from './assets/MainPage/chest3/in/3-4.png';
import item3_5 from './assets/MainPage/chest3/in/3-5.png';
import item3_6 from './assets/MainPage/chest3/in/3-6.png';
import item3_7 from './assets/MainPage/chest3/in/3-7.png';
import item3_8 from './assets/MainPage/chest3/in/3-8.png';
import item3_9 from './assets/MainPage/chest3/in/3-9.png';
import item3_10 from './assets/MainPage/chest3/in/3-10.png';
import item3_11 from './assets/MainPage/chest3/in/3-11.png';

// Common UI
import ava from './assets/MainPage/ava.jpg';
import ton from './assets/MainPage/ton.svg';
import add_balance from './assets/MainPage/add_balance.svg';
import foot from './assets/MainPage/foot.png';
import footover from './assets/MainPage/foot-on.svg';
import pvpicon from './assets/MainPage/pvp-icon.svg';
import homeicon from './assets/MainPage/home-icon.svg';
import tasksicon from './assets/MainPage/tasks-icon.svg';
import closeIcon from './assets/MainPage/close.svg';
import star from './assets/MainPage/star.svg';
import tonIcon from './assets/Ton.svg';

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
  const [isLoading, setIsLoading] = useState(true); // Состояние остаётся
  const [currentScreen, setCurrentScreen] = useState('main');
  const [currentCardIndex, setCurrentCardIndex] = useState(2);

  useEffect(() => {
    if (window.Telegram?.WebApp) {
      const webApp = window.Telegram.WebApp;
      webApp.ready();
      webApp.expand();
      console.log('✅ Telegram WebApp запущен в полноэкранном режиме');
    }
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
    item1_1, item1_2, item1_3, item1_4, item1_5, item1_6,
    item1_7, item1_8, item1_9, item1_10, item1_11, item1_12,
    item2_1, item2_2, item2_3, item2_4, item2_5, item2_6,
    item2_7, item2_8, item2_9, item2_10,
    item3_1, item3_2, item3_3, item3_4, item3_5, item3_6,
    item3_7, item3_8, item3_9, item3_10, item3_11,
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
    l1a, l2a, l3a, l4a, l5a, l6a
  ];

  // Функция загрузки и анимации
  const loadAssetsAndAnimate = async () => {
    console.log('🔄 Начинаем предзагрузку изображений...');
    await preloadImages(allImageUrls);
    console.log('✅ Все изображения загружены');
    // setIsLoading(false); // ❌ УБРАНО ОТСЮДА
  };

  useEffect(() => {
    loadAssetsAndAnimate();
  }, []);

  const navigateTo = (screen, cardIndex = 2) => {
    setCurrentScreen(screen);
    if (['card1', 'card2', 'card3'].includes(screen)) {
      setCurrentCardIndex(cardIndex);
    }
  };

  const handleLoadingComplete = () => {
    setIsLoading(false); // ✅ Вызывается из LoadingScreen
  };

  const renderScreen = () => {
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
    <div>
      {isLoading ? (
        <LoadingScreen onLoaded={handleLoadingComplete} />
      ) : (
        renderScreen()
      )}
    </div>
  );
}