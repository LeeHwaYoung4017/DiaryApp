import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { RootStackParamList } from '../types';

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

const Stack = createStackNavigator<RootStackParamList>();

// 메인 스택 네비게이션
export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
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
      </Stack.Navigator>
    </NavigationContainer>
  );
}
