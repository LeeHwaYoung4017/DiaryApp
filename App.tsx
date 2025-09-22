/**
 * DiaryApp - 개인 일기 앱
 * React Native + Expo
 */

import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import DatabaseService from './src/services/database/DatabaseService';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';

function AppContent() {
  const { theme } = useTheme();

  useEffect(() => {
    // 앱 시작 시 데이터베이스 초기화
    const initDatabase = async () => {
      try {
        await DatabaseService.init();
        console.log('데이터베이스 초기화 완료');
      } catch (error) {
        console.error('데이터베이스 초기화 실패:', error);
      }
    };

    initDatabase();
  }, []);

  const isDarkMode = theme.type === 'dark';

  return (
    <SafeAreaProvider>
      <StatusBar 
        barStyle={isDarkMode ? 'light-content' : 'dark-content'} 
        backgroundColor={isDarkMode ? '#000000' : '#FFFFFF'}
        translucent={false}
      />
      <AppNavigator />
    </SafeAreaProvider>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;
