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
import { useNavigation, useRoute } from '@react-navigation/native';
import DatabaseService from '../services/database/DatabaseService';
import SecurityService from '../services/SecurityService';
import { SecuritySettings } from '../types';

export default function PinSetupScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { isFirstTime } = route.params as { isFirstTime: boolean };
  
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings | null>(null);

  useEffect(() => {
    loadSecuritySettings();
  }, []);

  const loadSecuritySettings = async () => {
    try {
      const settings = await DatabaseService.getSecuritySettings();
      setSecuritySettings(settings);
    } catch (error) {
      console.error('보안 설정 로드 실패:', error);
    }
  };

  const handleNumberPress = (number: string) => {
    if (pin.length < 8) {
      const newPin = pin + number;
      setPin(newPin);
      
      // 진동 피드백
      Vibration.vibrate(50);
      
      // PIN이 완성되면 자동으로 다음 단계로
      if (newPin.length === 4 && !isConfirming) {
        setTimeout(() => {
          setIsConfirming(true);
          setConfirmPin(newPin); // 첫 번째 PIN을 confirmPin에 저장
          setPin(''); // 두 번째 PIN 입력을 위해 pin 초기화
        }, 300);
      } else if (newPin.length === 4 && isConfirming) {
        setTimeout(() => {
          handlePinComplete(newPin);
        }, 300);
      }
    }
  };

  const handleBackspace = () => {
    if (pin.length > 0) {
      setPin(pin.slice(0, -1));
    }
  };

  const handlePinComplete = async (secondPin: string) => {
    try {
      if (isFirstTime || !securitySettings) {
        // 첫 번째 PIN 설정
        if (secondPin !== confirmPin) {
          Alert.alert('오류', 'PIN이 일치하지 않습니다. 다시 시도해주세요.');
          setPin('');
          setConfirmPin('');
          setIsConfirming(false);
          return;
        }

        const validation = SecurityService.validatePinCode(secondPin);
        if (!validation.isValid) {
          Alert.alert('오류', validation.message || '잘못된 PIN입니다.');
          setPin('');
          setConfirmPin('');
          setIsConfirming(false);
          return;
        }

        const hashedPin = await SecurityService.hashPinCode(secondPin);
        const newSettings: SecuritySettings = {
          isEnabled: true,
          lockType: 'pin',
          pinCode: hashedPin,
          biometricEnabled: false, // 초기 설정 시 생체인증 비활성화
          backupUnlockEnabled: false,
          securityQuestions: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        await DatabaseService.saveSecuritySettings(newSettings);
        Alert.alert('성공', 'PIN이 설정되었습니다.', [
          { text: '확인', onPress: () => {
            // 암호설정 화면으로 돌아가기
            navigation.goBack();
          }}
        ]);
      } else {
        // 기존 PIN 변경
        if (secondPin !== confirmPin) {
          Alert.alert('오류', 'PIN이 일치하지 않습니다. 다시 시도해주세요.');
          setPin('');
          setConfirmPin('');
          setIsConfirming(false);
          return;
        }

        const validation = SecurityService.validatePinCode(secondPin);
        if (!validation.isValid) {
          Alert.alert('오류', validation.message || '잘못된 PIN입니다.');
          setPin('');
          setConfirmPin('');
          setIsConfirming(false);
          return;
        }

        const hashedPin = await SecurityService.hashPinCode(secondPin);
        const updatedSettings = {
          ...securitySettings,
          lockType: 'pin', // 잠금 방식을 PIN으로 명시적 설정
          pinCode: hashedPin,
          biometricEnabled: false, // 생체인증 비활성화
          updatedAt: Date.now(),
        };

        console.log('PinSetupScreen - 저장할 설정:', updatedSettings);
        await DatabaseService.saveSecuritySettings(updatedSettings);
        Alert.alert('성공', 'PIN이 변경되었습니다.', [
          { text: '확인', onPress: () => {
            // 암호설정 화면으로 돌아가기
            navigation.goBack();
          }}
        ]);
      }
    } catch (error) {
      console.error('PIN 설정 실패:', error);
      Alert.alert('오류', 'PIN 설정에 실패했습니다.');
    }
  };

  const renderPinDots = () => {
    const dots = [];
    const currentPin = isConfirming ? pin : pin;
    
    for (let i = 0; i < 4; i++) {
      dots.push(
        <View
          key={i}
          style={[
            styles.pinDot,
            i < currentPin.length && styles.pinDotFilled
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
        {row.map((item, colIndex) => (
          <TouchableOpacity
            key={colIndex}
            style={[
              styles.numberButton,
              item === '' && styles.numberButtonEmpty
            ]}
            onPress={() => {
              if (item === 'backspace') {
                handleBackspace();
              } else if (item !== '') {
                handleNumberPress(item);
              }
            }}
            disabled={item === ''}
          >
            {item === 'backspace' ? (
              <Text style={styles.backspaceText}>⌫</Text>
            ) : (
              <Text style={styles.numberText}>{item}</Text>
            )}
          </TouchableOpacity>
        ))}
      </View>
    ));
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>
          {isFirstTime ? 'PIN 설정' : 'PIN 변경'}
        </Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        <View style={styles.instructionContainer}>
          <Text style={styles.instructionText}>
            {isConfirming 
              ? 'PIN을 다시 입력해주세요' 
              : isFirstTime 
                ? '4자리 PIN을 입력해주세요' 
                : '새로운 4자리 PIN을 입력해주세요'
            }
          </Text>
        </View>

        <View style={styles.pinContainer}>
          {renderPinDots()}
        </View>

        <View style={styles.numberPad}>
          {renderNumberPad()}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 24,
    color: '#007AFF',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  instructionContainer: {
    marginBottom: 48,
  },
  instructionText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
  },
  pinContainer: {
    flexDirection: 'row',
    marginBottom: 64,
    gap: 16,
  },
  pinDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#E5E5E5',
    backgroundColor: 'transparent',
  },
  pinDotFilled: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  numberPad: {
    width: '100%',
    maxWidth: 300,
  },
  numberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  numberButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFFFFF',
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
  numberButtonEmpty: {
    backgroundColor: 'transparent',
    shadowOpacity: 0,
    elevation: 0,
  },
  numberText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000000',
  },
  backspaceText: {
    fontSize: 24,
    color: '#007AFF',
  },
});
