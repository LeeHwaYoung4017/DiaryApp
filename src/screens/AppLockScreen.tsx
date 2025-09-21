import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Vibration,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import DatabaseService from '../services/database/DatabaseService';
import SecurityService from '../services/SecurityService';
import { SecuritySettings } from '../types';

export default function AppLockScreen() {
  const navigation = useNavigation();
  const [pin, setPin] = useState('');
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadSecuritySettings();
  }, []);

  const loadSecuritySettings = async () => {
    try {
      setLoading(false);
      const settings = await DatabaseService.getSecuritySettings();
      if (settings) {
        setSecuritySettings(settings);
      } else {
        // 보안 설정이 없으면 메인 화면으로 이동
        (navigation as any).navigate('Feed');
      }
    } catch (error) {
      console.error('보안 설정 로드 실패:', error);
      setLoading(false);
    }
  };

  const handleNumberPress = (number: string) => {
    if (pin.length < 8) { // 최대 8자리까지
      const newPin = pin + number;
      setPin(newPin);
      setError('');
      
      // 햅틱 피드백
      Vibration.vibrate(50);
      
      // PIN이 완성되면 자동으로 검증
      if (newPin.length === 4) {
        handlePinComplete(newPin);
      }
    }
  };

  const handleBackspace = () => {
    if (pin.length > 0) {
      setPin(pin.slice(0, -1));
      setError('');
    }
  };

  const handlePinComplete = async (enteredPin: string) => {
    try {
      if (!securitySettings) {
        setError('보안 설정을 불러올 수 없습니다.');
        return;
      }

      // PIN 검증
      const isValid = await SecurityService.verifyPinCode(enteredPin, securitySettings.pinCode);
      
      if (isValid) {
        // PIN이 맞으면 메인 화면으로 이동
        (navigation as any).navigate('Feed');
      } else {
        setError('PIN이 올바르지 않습니다.');
        setPin('');
        Vibration.vibrate([100, 50, 100]); // 오류 시 진동
      }
    } catch (error) {
      console.error('PIN 검증 실패:', error);
      setError('PIN 검증에 실패했습니다.');
      setPin('');
    }
  };

  const renderPinDots = () => {
    const dots = [];
    for (let i = 0; i < 4; i++) {
      dots.push(
        <View
          key={i}
          style={[
            styles.pinDot,
            i < pin.length ? styles.pinDotFilled : styles.pinDotEmpty
          ]}
        />
      );
    }
    return dots;
  };

  const renderNumberPad = () => {
    const numbers = [
      ['1', '2', '3'],
      ['4', '5', '6'],
      ['7', '8', '9'],
      ['', '0', 'backspace']
    ];

    return numbers.map((row, rowIndex) => (
      <View key={rowIndex} style={styles.numberRow}>
        {row.map((item, colIndex) => {
          if (item === 'backspace') {
            return (
              <TouchableOpacity
                key={colIndex}
                style={styles.numberButton}
                onPress={handleBackspace}
              >
                <Text style={styles.backspaceText}>⌫</Text>
              </TouchableOpacity>
            );
          } else if (item === '') {
            return <View key={colIndex} style={styles.numberButton} />;
          } else {
            return (
              <TouchableOpacity
                key={colIndex}
                style={styles.numberButton}
                onPress={() => handleNumberPress(item)}
              >
                <Text style={styles.numberText}>{item}</Text>
              </TouchableOpacity>
            );
          }
        })}
      </View>
    ));
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

  if (!securitySettings) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>보안 설정을 불러올 수 없습니다.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* 앱 로고/제목 영역 */}
        <View style={styles.header}>
          <Text style={styles.appTitle}>일기장</Text>
          <Text style={styles.subtitle}>PIN을 입력해주세요</Text>
        </View>

        {/* PIN 입력 영역 */}
        <View style={styles.pinContainer}>
          <View style={styles.pinDotsContainer}>
            {renderPinDots()}
          </View>
          {error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : null}
        </View>

        {/* 숫자 패드 */}
        <View style={styles.numberPad}>
          {renderNumberPad()}
        </View>

        {/* 하단 안내 */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            앱을 사용하려면 PIN을 입력해주세요
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 40,
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
    marginTop: 60,
  },
  appTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  pinContainer: {
    alignItems: 'center',
    marginVertical: 40,
  },
  pinDotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  pinDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginHorizontal: 10,
    borderWidth: 2,
  },
  pinDotEmpty: {
    backgroundColor: 'transparent',
    borderColor: '#ddd',
  },
  pinDotFilled: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
    textAlign: 'center',
  },
  numberPad: {
    marginBottom: 40,
  },
  numberRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  numberButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  numberText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
  },
  backspaceText: {
    fontSize: 20,
    color: '#666',
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});
