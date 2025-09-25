import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import GoogleAuthService from '../services/GoogleAuthService';

interface LoginChoiceScreenProps {
  onLoginSuccess: (user: any) => void;
  onSkipLogin: () => void;
}

export default function LoginChoiceScreen({ onLoginSuccess, onSkipLogin }: LoginChoiceScreenProps) {
  const { theme } = useTheme();
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      const result = await GoogleAuthService.signIn();
      
      if (result.success && result.user) {
        onLoginSuccess(result.user);
      } else {
        Alert.alert('로그인 실패', result.error || '로그인 중 오류가 발생했습니다.');
      }
    } catch (error) {
      Alert.alert('오류', '로그인 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkipLogin = () => {
    Alert.alert(
      '로그인 없이 시작',
      '로그인 없이 시작합니다.\n일부 기능이 제한될 수 있습니다.',
      [
        { text: '취소', style: 'cancel' },
        { text: '확인', onPress: onSkipLogin }
      ]
    );
  };

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.background,
      padding: 20,
    },
    title: {
      fontSize: 28,
      fontWeight: 'bold',
      color: theme.text,
      marginBottom: 10,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: 16,
      color: theme.textSecondary,
      marginBottom: 50,
      textAlign: 'center',
      lineHeight: 24,
    },
    googleButton: {
      backgroundColor: '#4285F4',
      paddingHorizontal: 30,
      paddingVertical: 15,
      borderRadius: 25,
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 20,
      minWidth: 250,
      justifyContent: 'center',
    },
    googleButtonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: '600',
      marginLeft: 10,
    },
    googleLogoContainer: {
      width: 20,
      height: 20,
      backgroundColor: 'white',
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 8,
    },
    googleLogo: {
      fontSize: 14,
      fontWeight: 'bold',
      color: '#4285F4',
    },
    skipButton: {
      backgroundColor: 'transparent',
      paddingHorizontal: 30,
      paddingVertical: 15,
      borderRadius: 25,
      borderWidth: 2,
      borderColor: theme.border,
      minWidth: 250,
      alignItems: 'center',
    },
    skipButtonText: {
      color: theme.text,
      fontSize: 16,
      fontWeight: '500',
    },
    loadingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
  });

  return (
    <View style={dynamicStyles.container}>
      <Text style={dynamicStyles.title}>DiaryApp</Text>
      <Text style={dynamicStyles.subtitle}>
        일기를 안전하게 백업하고{'\n'}
        어디서나 접근하세요
      </Text>

      <TouchableOpacity
        style={dynamicStyles.googleButton}
        onPress={handleGoogleLogin}
        disabled={isLoading}
      >
        {isLoading ? (
          <View style={dynamicStyles.loadingContainer}>
            <ActivityIndicator color="white" size="small" />
            <Text style={dynamicStyles.googleButtonText}>로그인 중...</Text>
          </View>
        ) : (
          <>
            <View style={dynamicStyles.googleLogoContainer}>
              <Text style={dynamicStyles.googleLogo}>G</Text>
            </View>
            <Text style={dynamicStyles.googleButtonText}>구글 로그인</Text>
          </>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={dynamicStyles.skipButton}
        onPress={handleSkipLogin}
        disabled={isLoading}
      >
        <Text style={dynamicStyles.skipButtonText}>로그인 없이 시작하기</Text>
      </TouchableOpacity>
    </View>
  );
}
