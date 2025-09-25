import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import GoogleAuthService, { GoogleUser } from '../services/GoogleAuthService';

export default function UserProfileScreen({ navigation }: any) {
  const { theme } = useTheme();
  const [user, setUser] = useState<GoogleUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await GoogleAuthService.getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error('사용자 정보 로드 오류:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      '로그아웃',
      '정말 로그아웃하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        { text: '로그아웃', style: 'destructive', onPress: performLogout }
      ]
    );
  };

  const performLogout = async () => {
    setIsLoggingOut(true);
    try {
      const result = await GoogleAuthService.signOut();
      
      if (result.success) {
        Alert.alert('로그아웃 완료', '성공적으로 로그아웃되었습니다.', [
          { text: '확인', onPress: () => navigation.navigate('LoginChoice') }
        ]);
      } else {
        Alert.alert('로그아웃 실패', result.error || '로그아웃 중 오류가 발생했습니다.');
      }
    } catch (error) {
      Alert.alert('오류', '로그아웃 중 오류가 발생했습니다.');
    } finally {
      setIsLoggingOut(false);
    }
  };

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      backgroundColor: theme.primary,
      paddingTop: 50,
      paddingBottom: 20,
      paddingHorizontal: 20,
      alignItems: 'center',
    },
    headerTitle: {
      color: 'white',
      fontSize: 20,
      fontWeight: 'bold',
    },
    content: {
      flex: 1,
      padding: 20,
    },
    profileSection: {
      backgroundColor: theme.surface,
      borderRadius: 15,
      padding: 20,
      marginBottom: 20,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    profileImage: {
      width: 80,
      height: 80,
      borderRadius: 40,
      marginBottom: 15,
    },
    userName: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.text,
      marginBottom: 5,
    },
    userEmail: {
      fontSize: 14,
      color: theme.textSecondary,
      marginBottom: 20,
    },
    infoSection: {
      backgroundColor: theme.surface,
      borderRadius: 15,
      padding: 20,
      marginBottom: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    infoTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: theme.text,
      marginBottom: 10,
    },
    infoText: {
      fontSize: 14,
      color: theme.textSecondary,
      lineHeight: 20,
    },
    logoutButton: {
      backgroundColor: '#FF4444',
      paddingVertical: 15,
      borderRadius: 25,
      alignItems: 'center',
      marginTop: 20,
    },
    logoutButtonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: '600',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      color: theme.text,
      marginTop: 10,
    },
  });

  if (isLoading) {
    return (
      <View style={dynamicStyles.container}>
        <View style={dynamicStyles.header}>
          <Text style={dynamicStyles.headerTitle}>프로필</Text>
        </View>
        <View style={dynamicStyles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={dynamicStyles.loadingText}>사용자 정보를 불러오는 중...</Text>
        </View>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={dynamicStyles.container}>
        <View style={dynamicStyles.header}>
          <Text style={dynamicStyles.headerTitle}>프로필</Text>
        </View>
        <View style={dynamicStyles.loadingContainer}>
          <Text style={dynamicStyles.loadingText}>사용자 정보를 찾을 수 없습니다.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={dynamicStyles.container}>
      <View style={dynamicStyles.header}>
        <Text style={dynamicStyles.headerTitle}>프로필</Text>
      </View>

      <View style={dynamicStyles.content}>
        <View style={dynamicStyles.profileSection}>
          <Image
            source={{ uri: user.picture }}
            style={dynamicStyles.profileImage}
          />
          <Text style={dynamicStyles.userName}>{user.name}</Text>
          <Text style={dynamicStyles.userEmail}>{user.email}</Text>
        </View>

        <View style={dynamicStyles.infoSection}>
          <Text style={dynamicStyles.infoTitle}>계정 정보</Text>
          <Text style={dynamicStyles.infoText}>
            • Google 계정으로 로그인됨{'\n'}
            • Google Drive 백업 기능 사용 가능{'\n'}
            • 데이터는 안전하게 암호화되어 저장됩니다
          </Text>
        </View>

        <TouchableOpacity
          style={dynamicStyles.logoutButton}
          onPress={handleLogout}
          disabled={isLoggingOut}
        >
          {isLoggingOut ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Text style={dynamicStyles.logoutButtonText}>로그아웃</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
