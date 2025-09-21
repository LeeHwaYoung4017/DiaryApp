import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as LocalAuthentication from 'expo-local-authentication';
import DatabaseService from '../services/database/DatabaseService';
import SecurityService from '../services/SecurityService';
import { SecuritySettings } from '../types';

export default function BiometricSetupScreen() {
  const navigation = useNavigation();
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings | null>(null);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSecuritySettings();
    checkBiometricAvailability();
  }, []);

  const loadSecuritySettings = async () => {
    try {
      const settings = await DatabaseService.getSecuritySettings();
      setSecuritySettings(settings);
    } catch (error) {
      console.error('보안 설정 로드 실패:', error);
    }
  };

  const checkBiometricAvailability = async () => {
    try {
      const isAvailable = await SecurityService.isBiometricAvailable();
      setBiometricAvailable(isAvailable);
      
      if (isAvailable) {
        const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
        if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
          setBiometricType('지문/얼굴');
        } else if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
          setBiometricType('얼굴 인식');
        } else if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
          setBiometricType('홍채 인식');
        } else {
          setBiometricType('생체 인증');
        }
      }
    } catch (error) {
      console.error('생체인증 확인 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricToggle = async (value: boolean) => {
    try {
      if (value) {
        // 생체인증 활성화
        const result = await SecurityService.authenticateWithBiometrics();
        
        if (result.success) {
          const updatedSettings: SecuritySettings = {
            ...securitySettings!,
            lockType: 'biometric',
            biometricEnabled: true,
            updatedAt: Date.now(),
          };

          console.log('BiometricSetupScreen - 저장할 설정:', updatedSettings);
          await DatabaseService.saveSecuritySettings(updatedSettings);
          setSecuritySettings(updatedSettings);
          Alert.alert('성공', `${biometricType} 인증이 활성화되었습니다.`, [
            { text: '확인', onPress: () => {
              // 암호설정 화면으로 돌아가기
              navigation.goBack();
            }}
          ]);
        } else {
          Alert.alert('실패', '생체인증에 실패했습니다.');
        }
      } else {
        // 생체인증 비활성화
        const updatedSettings: SecuritySettings = {
          ...securitySettings!,
          lockType: 'pin', // 생체인증 비활성화 시 PIN으로 변경
          biometricEnabled: false,
          updatedAt: Date.now(),
        };

        await DatabaseService.saveSecuritySettings(updatedSettings);
        setSecuritySettings(updatedSettings);
        Alert.alert('성공', '생체인증이 비활성화되었습니다.', [
          { text: '확인', onPress: () => {
            // 암호설정 화면으로 돌아가기
            navigation.goBack();
          }}
        ]);
      }
    } catch (error) {
      console.error('생체인증 설정 실패:', error);
      if (error instanceof Error && error.message.includes('database is locked')) {
        Alert.alert('오류', '데이터베이스가 잠겨있습니다. 잠시 후 다시 시도해주세요.');
      } else {
        Alert.alert('오류', '생체인증 설정에 실패했습니다.');
      }
    }
  };

  const testBiometric = async () => {
    try {
      const result = await SecurityService.authenticateWithBiometrics();
      
      if (result.success) {
        Alert.alert('성공', `${biometricType} 인증이 성공했습니다.`);
      } else {
        Alert.alert('실패', '생체인증에 실패했습니다.');
      }
    } catch (error) {
      console.error('생체인증 테스트 실패:', error);
      Alert.alert('오류', '생체인증 테스트에 실패했습니다.');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>로딩 중...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!biometricAvailable) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>생체인증 설정</Text>
            <Text style={styles.subtitle}>
              이 기기에서는 생체인증을 사용할 수 없습니다.
            </Text>
          </View>
          
          <View style={styles.infoContainer}>
            <Text style={styles.infoText}>
              • 지문/얼굴 인식이 지원되지 않습니다.{'\n'}
              • 얼굴 인식이 지원되지 않습니다.{'\n'}
              • PIN 또는 패턴 잠금을 사용해주세요.
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>생체인증 설정</Text>
          <Text style={styles.subtitle}>
            {biometricType}을 사용하여 앱을 잠금 해제할 수 있습니다.
          </Text>
        </View>

        <View style={styles.settingsContainer}>
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>{biometricType} 인증</Text>
              <Text style={styles.settingSubtitle}>
                {biometricType}으로 앱 잠금 해제
              </Text>
            </View>
            <Switch
              value={securitySettings?.biometricEnabled || false}
              onValueChange={handleBiometricToggle}
              trackColor={{ false: '#ddd', true: '#007AFF' }}
              thumbColor={securitySettings?.biometricEnabled ? '#fff' : '#f4f3f4'}
            />
          </View>
        </View>

        {securitySettings?.biometricEnabled && (
          <View style={styles.testContainer}>
            <TouchableOpacity
              style={styles.testButton}
              onPress={testBiometric}
            >
              <Text style={styles.testButtonText}>
                {biometricType} 인증 테스트
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.infoContainer}>
          <Text style={styles.infoText}>
            • {biometricType} 인증은 PIN과 함께 사용됩니다.{'\n'}
            • 생체인증이 실패하면 PIN을 입력할 수 있습니다.{'\n'}
            • 기기 설정에서 생체인증을 등록해야 합니다.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  settingsContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  testContainer: {
    marginBottom: 20,
  },
  testButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  testButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  infoContainer: {
    backgroundColor: '#f0f8ff',
    padding: 15,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});
