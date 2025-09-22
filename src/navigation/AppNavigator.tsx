import React, { useState, useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import * as SQLite from 'expo-sqlite';
import { RootStackParamList } from '../types';
import DatabaseService from '../services/database/DatabaseService';
import { SecuritySettings } from '../types';
import { useTheme } from '../contexts/ThemeContext';

// 화면 컴포넌트들
import FeedScreen from '../screens/FeedScreen';
import WriteScreen from '../screens/WriteScreen';
import EditScreen from '../screens/EditScreen';
import SearchScreen from '../screens/SearchScreen';
import SettingsScreen from '../screens/SettingsScreen';
import ChartScreen from '../screens/ChartScreen';
import DiaryBookSettingsScreen from '../screens/DiaryBookSettingsScreen';
import SecuritySettingsScreen from '../screens/SecuritySettingsScreen';
import ThemeSettingsScreen from '../screens/ThemeSettingsScreen';
import GoogleDriveSettingsScreen from '../screens/GoogleDriveSettingsScreen';
import LanguageSettingsScreen from '../screens/LanguageSettingsScreen';
import DiaryDetailScreen from '../screens/DiaryDetailScreen';
import PinSetupScreen from '../screens/PinSetupScreen';
import PatternSetupScreen from '../screens/PatternSetupScreen';
import BiometricSetupScreen from '../screens/BiometricSetupScreen';
import AppLockScreen from '../screens/AppLockScreen';

const Stack = createStackNavigator<RootStackParamList>();

// 헤더 텍스트 색상 결정 함수
const getHeaderTextColor = (customColor: string): string => {
  // 특정 색상들에 대한 명시적 텍스트 색상 매핑
  const colorTextMap: { [key: string]: string } = {
    // 매우 밝은 파스텔 색상들 - 검은 텍스트
    '#FFE4E1': '#000000', // 연분홍
    '#E0FFFF': '#000000', // 연하늘
    '#F0FFF0': '#000000', // 연민트
    '#FFF8DC': '#000000', // 연노랑
    '#FFEFD5': '#000000', // 크림
    '#FDF5E6': '#000000', // 라벤더
    '#F5F5DC': '#000000', // 아이보리
    '#FFFAF0': '#000000', // 스노우
    '#F0F8FF': '#000000', // 연파랑
    '#E6E6FA': '#000000', // 연보라
    '#FFF0F5': '#000000', // 연분홍
    '#F0FFFF': '#000000', // 연하늘
    '#F5FFFA': '#000000', // 연민트
    '#FFFACD': '#000000', // 연노랑
    '#FFEBCD': '#000000', // 아몬드
    '#F5F5F5': '#000000', // 회색
    
    // 어두운 색상들 - 흰 텍스트
    '#FF0000': '#FFFFFF', // 빨강
    '#0000FF': '#FFFFFF', // 파랑
    '#800080': '#FFFFFF', // 보라
    '#008000': '#FFFFFF', // 초록
    '#FF8C00': '#FFFFFF', // 주황
    '#808080': '#FFFFFF', // 회색
    
    // 중간 톤 색상들 - 밝기에 따라 결정
    '#FFA500': '#000000', // 주황 (밝음)
    '#FFFF00': '#000000', // 노랑 (밝음)
    '#00FF00': '#000000', // 초록 (밝음)
    '#00FFFF': '#000000', // 청록 (밝음)
    '#90EE90': '#000000', // 연초록 (밝음)
    '#FFDAB9': '#000000', // 복숭아 (밝음)
    '#98FB98': '#000000', // 연초록 (밝음)
    '#F0E68C': '#000000', // 카키 (밝음)
    '#FF7F50': '#000000', // 연어 (밝음)
    '#4ECDC4': '#000000', // 청록1 (밝음)
    '#40E0D0': '#000000', // 청록2 (밝음)
    '#87CEEB': '#000000', // 하늘 (밝음)
    '#DDA0DD': '#000000', // 연보라 (밝음)
    '#FFFFFF': '#000000', // 흰색
  };
  
  // 명시적 매핑이 있으면 사용
  if (colorTextMap[customColor.toUpperCase()]) {
    return colorTextMap[customColor.toUpperCase()];
  }
  
  // 매핑이 없으면 밝기 계산으로 결정
  const hex = customColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  
  // 밝기 기준으로 결정
  return brightness > 140 ? '#000000' : '#FFFFFF';
};

// 메인 스택 네비게이션
export default function AppNavigator() {
  const { theme } = useTheme();
  const [isLocked, setIsLocked] = useState<boolean | null>(null);
  const [initialRouteName, setInitialRouteName] = useState<string>('Feed');
  const [shouldShowLock, setShouldShowLock] = useState(false);
  const appState = useRef(AppState.currentState);
  const navigationRef = useRef<any>(null);

  useEffect(() => {
    initializeApp();
    
    // AppState 변경 감지
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // 앱이 백그라운드에서 포그라운드로 돌아올 때
        handleAppForeground();
      }
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, []);

  const initializeApp = async () => {
    try {
      // 데이터베이스 초기화 (기존 데이터 보존)
      await DatabaseService.init();
      console.log('데이터베이스 초기화 완료');
      
      // 기존 일기가 있는지 확인
      const existingDiaries = await DatabaseService.getDiaries(1, 0, 'default-diary-book');
      
      // 기존 일기가 없으면 가데이터 생성
      if (existingDiaries.length === 0) {
        await DatabaseService.generateSampleData();
        console.log('가데이터 생성 완료');
      } else {
        console.log('기존 데이터 사용');
      }
      
      console.log('앱 초기화 완료');
      
      // 앱 잠금 상태 확인
      await checkAppLock();
    } catch (error) {
      console.error('앱 초기화 실패:', error);
      // 초기화 실패 시에도 기본 화면으로 이동
      setInitialRouteName('Feed');
      setIsLocked(false);
    }
  };

  const handleAppForeground = async () => {
    try {
      const securitySettings = await DatabaseService.getSecuritySettings();
      if (securitySettings && securitySettings.isEnabled) {
        // 잠금이 활성화되어 있으면 잠금 화면으로 이동
        setShouldShowLock(true);
        if (navigationRef.current) {
          navigationRef.current.navigate('AppLock');
        }
      }
    } catch (error) {
      console.error('앱 포그라운드 잠금 확인 실패:', error);
    }
  };

  const checkAppLock = async () => {
    try {
      const securitySettings = await DatabaseService.getSecuritySettings();
      if (securitySettings && securitySettings.isEnabled) {
        setIsLocked(true);
        setInitialRouteName('AppLock');
      } else {
        setIsLocked(false);
        setInitialRouteName('Feed');
      }
    } catch (error) {
      console.error('앱 잠금 확인 실패:', error);
      // 오류 발생 시 기본적으로 잠금 해제 상태로 설정
      setIsLocked(false);
      setInitialRouteName('Feed');
    }
  };

  // 로딩 중일 때는 아무것도 렌더링하지 않음
  if (isLocked === null) {
    return null;
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        initialRouteName={initialRouteName}
        screenOptions={{
          headerStyle: {
            backgroundColor: theme.type === 'dark' ? '#1C1C1E' : theme.primary,
          },
          headerTintColor: theme.type === 'dark' ? '#FFFFFF' : (theme.type === 'custom' && theme.customColor ? getHeaderTextColor(theme.customColor) : '#FFFFFF'),
          headerTitleStyle: {
            fontWeight: 'bold',
            color: theme.type === 'dark' ? '#FFFFFF' : (theme.type === 'custom' && theme.customColor ? getHeaderTextColor(theme.customColor) : '#FFFFFF'),
          },
        }}
      >
        <Stack.Screen
          name="AppLock"
          component={AppLockScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Feed"
          component={FeedScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Write"
          component={WriteScreen}
          options={{
            title: '일기 작성',
            headerBackTitle: '뒤로',
            headerTintColor: theme.type === 'dark' ? '#FFFFFF' : (theme.type === 'custom' && theme.customColor ? getHeaderTextColor(theme.customColor) : '#FFFFFF'),
            headerTitleStyle: {
              fontWeight: 'bold',
              color: theme.type === 'dark' ? '#FFFFFF' : (theme.type === 'custom' && theme.customColor ? getHeaderTextColor(theme.customColor) : '#FFFFFF'),
            },
          }}
        />
        <Stack.Screen
          name="Edit"
          component={EditScreen}
          options={{
            title: '일기 편집',
            headerBackTitle: '뒤로',
            headerTintColor: theme.type === 'dark' ? '#FFFFFF' : (theme.type === 'custom' && theme.customColor ? getHeaderTextColor(theme.customColor) : '#FFFFFF'),
            headerTitleStyle: {
              fontWeight: 'bold',
              color: theme.type === 'dark' ? '#FFFFFF' : (theme.type === 'custom' && theme.customColor ? getHeaderTextColor(theme.customColor) : '#FFFFFF'),
            },
          }}
        />
        <Stack.Screen
          name="Search"
          component={SearchScreen}
          options={{
            title: '검색',
            headerBackTitle: '뒤로',
            headerTintColor: theme.type === 'dark' ? '#FFFFFF' : (theme.type === 'custom' && theme.customColor ? getHeaderTextColor(theme.customColor) : '#FFFFFF'),
            headerTitleStyle: {
              fontWeight: 'bold',
              color: theme.type === 'dark' ? '#FFFFFF' : (theme.type === 'custom' && theme.customColor ? getHeaderTextColor(theme.customColor) : '#FFFFFF'),
            },
          }}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            title: '설정',
            headerBackTitle: '뒤로',
            headerTintColor: theme.type === 'dark' ? '#FFFFFF' : (theme.type === 'custom' && theme.customColor ? getHeaderTextColor(theme.customColor) : '#FFFFFF'),
            headerTitleStyle: {
              fontWeight: 'bold',
              color: theme.type === 'dark' ? '#FFFFFF' : (theme.type === 'custom' && theme.customColor ? getHeaderTextColor(theme.customColor) : '#FFFFFF'),
            },
          }}
        />
        <Stack.Screen
          name="Chart"
          component={ChartScreen}
          options={{
            title: '기분 차트',
            headerBackTitle: '뒤로',
          }}
        />
        <Stack.Screen
          name="DiaryBookSettings"
          component={DiaryBookSettingsScreen}
          options={{
            title: '일기제목 변경',
            headerBackTitle: '뒤로',
          }}
        />
        <Stack.Screen
          name="SecuritySettings"
          component={SecuritySettingsScreen}
          options={{
            title: '암호설정',
            headerBackTitle: '뒤로',
          }}
        />
        <Stack.Screen
          name="ThemeSettings"
          component={ThemeSettingsScreen}
          options={{
            title: '테마선택',
            headerBackTitle: '뒤로',
            headerTintColor: theme.type === 'dark' ? '#FFFFFF' : (theme.type === 'custom' && theme.customColor ? getHeaderTextColor(theme.customColor) : '#FFFFFF'),
            headerTitleStyle: {
              fontWeight: 'bold',
              color: theme.type === 'dark' ? '#FFFFFF' : (theme.type === 'custom' && theme.customColor ? getHeaderTextColor(theme.customColor) : '#FFFFFF'),
            },
          }}
        />
        <Stack.Screen
          name="GoogleDriveSettings"
          component={GoogleDriveSettingsScreen}
          options={{
            title: '구글드라이브 연동',
            headerBackTitle: '뒤로',
          }}
        />
        <Stack.Screen
          name="LanguageSettings"
          component={LanguageSettingsScreen}
          options={{
            title: '언어선택',
            headerBackTitle: '뒤로',
          }}
        />
        <Stack.Screen
          name="DiaryDetail"
          component={DiaryDetailScreen}
          options={{
            title: '일기 상세',
            headerBackTitle: '뒤로',
          }}
        />
        <Stack.Screen
          name="PinSetup"
          component={PinSetupScreen}
          options={{
            title: 'PIN 설정',
            headerBackTitle: '뒤로',
          }}
        />
        <Stack.Screen
          name="PatternSetup"
          component={PatternSetupScreen}
          options={{
            title: '패턴 설정',
            headerBackTitle: '뒤로',
          }}
        />
        <Stack.Screen
          name="BiometricSetup"
          component={BiometricSetupScreen}
          options={{
            title: '생체인증 설정',
            headerBackTitle: '뒤로',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
