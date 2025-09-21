import React, { useState, useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import * as SQLite from 'expo-sqlite';
import { RootStackParamList } from '../types';
import DatabaseService from '../services/database/DatabaseService';
import { SecuritySettings } from '../types';

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

// 메인 스택 네비게이션
export default function AppNavigator() {
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
            backgroundColor: '#007AFF',
          },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: {
            fontWeight: 'bold',
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
          }}
        />
        <Stack.Screen
          name="Edit"
          component={EditScreen}
          options={{
            title: '일기 편집',
            headerBackTitle: '뒤로',
          }}
        />
        <Stack.Screen
          name="Search"
          component={SearchScreen}
          options={{
            title: '검색',
            headerBackTitle: '뒤로',
          }}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            title: '설정',
            headerBackTitle: '뒤로',
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
