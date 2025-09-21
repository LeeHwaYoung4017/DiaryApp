import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Vibration,
  Dimensions,
  PanResponder,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import DatabaseService from '../services/database/DatabaseService';
import SecurityService from '../services/SecurityService';
import { SecuritySettings, PatternData } from '../types';

const { width } = Dimensions.get('window');
const PATTERN_SIZE = Math.min(width * 0.8, 350);
const DOT_SIZE = 25;
const LINE_WIDTH = 4;

export default function AppLockScreen() {
  const navigation = useNavigation();
  const [pin, setPin] = useState('');
  const [pattern, setPattern] = useState<number[]>([]);
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<number[]>([]);

  useEffect(() => {
    loadSecuritySettings();
  }, []);

  useEffect(() => {
    // 잠금 방식이 생체인증이면 자동으로 시도
    if (securitySettings?.lockType === 'biometric') {
      handleBiometricAuth();
    }
  }, [securitySettings]);

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

  const handleBiometricAuth = async () => {
    try {
      const result = await SecurityService.authenticateWithBiometrics();
      if (result.success) {
        (navigation as any).navigate('Feed');
      }
    } catch (error) {
      console.error('생체인증 실패:', error);
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

  const getDotPosition = (index: number) => {
    const row = Math.floor(index / 3);
    const col = index % 3;
    const spacing = PATTERN_SIZE / 3; // 3x3 그리드에 맞게 수정
    return {
      x: col * spacing + spacing / 2, // 각 셀의 중앙
      y: row * spacing + spacing / 2, // 각 셀의 중앙
    };
  };

  const getDistance = (pos1: { x: number; y: number }, pos2: { x: number; y: number }) => {
    return Math.sqrt(Math.pow(pos2.x - pos1.x, 2) + Math.pow(pos2.y - pos1.y, 2));
  };

  const getNearestDot = (x: number, y: number): number | null => {
    const threshold = DOT_SIZE * 4; // 인식 범위를 4배로 확장
    for (let i = 0; i < 9; i++) {
      const dotPos = getDotPosition(i);
      const distance = getDistance({ x, y }, dotPos);
      if (distance <= threshold) {
        return i;
      }
    }
    return null;
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (evt) => {
      const { locationX, locationY } = evt.nativeEvent;
      const nearestDot = getNearestDot(locationX, locationY);
      
      if (nearestDot !== null) {
        setIsDrawing(true);
        const newPath = [nearestDot];
        setCurrentPath(newPath);
        setError('');
        Vibration.vibrate(50);
      }
    },
    onPanResponderMove: (evt) => {
      if (!isDrawing) return;
      
      const { locationX, locationY } = evt.nativeEvent;
      const nearestDot = getNearestDot(locationX, locationY);
      
      if (nearestDot !== null && !currentPath.includes(nearestDot)) {
        const newPath = [...currentPath, nearestDot];
        setCurrentPath(newPath);
        Vibration.vibrate(30);
      }
    },
    onPanResponderRelease: () => {
      if (isDrawing && currentPath.length >= 4) {
        handlePatternComplete(currentPath);
      } else if (isDrawing && currentPath.length > 0) {
        setCurrentPath([]);
        setError('패턴을 다시 입력해주세요.');
      }
      setIsDrawing(false);
    },
  });


  const handlePatternComplete = async (enteredPattern: number[]) => {
    try {
      if (!securitySettings || !securitySettings.pattern) {
        setError('패턴 설정을 불러올 수 없습니다.');
        return;
      }

      const savedPatternData: PatternData = JSON.parse(securitySettings.pattern);
      const isValid = JSON.stringify(enteredPattern) === JSON.stringify(savedPatternData.dots);
      
      if (isValid) {
        (navigation as any).navigate('Feed');
      } else {
        setError('패턴이 올바르지 않습니다.');
        setCurrentPath([]);
        Vibration.vibrate([100, 50, 100]);
      }
    } catch (error) {
      console.error('패턴 검증 실패:', error);
      setError('패턴 검증에 실패했습니다.');
      setCurrentPath([]);
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

  const renderPatternDots = () => {
    const dots = [];
    const displayPattern = isDrawing ? currentPath : pattern;
    
    for (let i = 0; i < 9; i++) {
      const position = getDotPosition(i);
      const isSelected = displayPattern.includes(i);
      const isActive = isDrawing && currentPath.includes(i);
      const isLast = isDrawing && currentPath.length > 0 && currentPath[currentPath.length - 1] === i;
      
      dots.push(
        <View
          key={i}
          style={[
            styles.patternDot,
            {
              left: position.x - DOT_SIZE / 2,
              top: position.y - DOT_SIZE / 2,
            },
            isSelected && styles.patternDotSelected,
            isActive && styles.patternDotActive,
            isLast && styles.patternDotLast,
          ]}
        >
          <View style={[styles.patternDotInner, isSelected && styles.patternDotInnerSelected]} />
          {isLast && <View style={styles.patternDotPulse} />}
        </View>
      );
    }
    return dots;
  };

  const renderPatternLines = () => {
    const lines = [];
    const displayPattern = isDrawing ? currentPath : pattern;
    
    for (let i = 0; i < displayPattern.length - 1; i++) {
      const startPos = getDotPosition(displayPattern[i]);
      const endPos = getDotPosition(displayPattern[i + 1]);
      
      const angle = Math.atan2(endPos.y - startPos.y, endPos.x - startPos.x);
      const distance = getDistance(startPos, endPos);
      
      lines.push(
        <View
          key={i}
          style={[
            styles.patternLine,
            {
              left: startPos.x,
              top: startPos.y,
              width: distance,
              transform: [{ rotate: `${angle}rad` }],
            },
          ]}
        />
      );
    }
    return lines;
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

  const getLockTypeText = () => {
    if (!securitySettings) return '';
    
    switch (securitySettings.lockType) {
      case 'pin':
        return 'PIN을 입력해주세요';
      case 'pattern':
        return '패턴을 그려주세요';
      case 'biometric':
        return '생체인증을 사용해주세요';
      default:
        return '인증이 필요합니다';
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
          <Text style={styles.subtitle}>{getLockTypeText()}</Text>
        </View>

        {/* 인증 영역 */}
        <View style={styles.authContainer}>
          {securitySettings.lockType === 'pin' && (
            <>
              <View style={styles.pinDotsContainer}>
                {renderPinDots()}
              </View>
              {error ? (
                <Text style={styles.errorText}>{error}</Text>
              ) : null}
            </>
          )}

          {securitySettings.lockType === 'pattern' && (
            <>
              <View 
                style={[styles.patternGrid, { width: PATTERN_SIZE, height: PATTERN_SIZE }]}
                {...panResponder.panHandlers}
              >
                {renderPatternLines()}
                {renderPatternDots()}
              </View>
              {error ? (
                <Text style={styles.errorText}>{error}</Text>
              ) : null}
            </>
          )}

          {securitySettings.lockType === 'biometric' && (
            <View style={styles.biometricContainer}>
              <TouchableOpacity
                style={styles.biometricButton}
                onPress={handleBiometricAuth}
              >
                <Text style={styles.biometricButtonText}>생체인증</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* 숫자 패드 (PIN일 때만) */}
        {securitySettings.lockType === 'pin' && (
          <View style={styles.numberPad}>
            {renderNumberPad()}
          </View>
        )}

        {/* 하단 안내 */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            앱을 사용하려면 인증이 필요합니다
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
  authContainer: {
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
  patternGrid: {
    position: 'relative',
    backgroundColor: '#fff',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  patternDot: {
    position: 'absolute',
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: '#ddd',
    borderWidth: 2,
    borderColor: '#bbb',
  },
  patternDotSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  patternDotActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  patternDotLast: {
    backgroundColor: '#FF6B6B',
    borderColor: '#FF6B6B',
  },
  patternDotInner: {
    width: DOT_SIZE - 8,
    height: DOT_SIZE - 8,
    borderRadius: (DOT_SIZE - 8) / 2,
    backgroundColor: '#fff',
    position: 'absolute',
    top: 4,
    left: 4,
  },
  patternDotInnerSelected: {
    backgroundColor: '#fff',
  },
  patternDotPulse: {
    position: 'absolute',
    width: DOT_SIZE + 10,
    height: DOT_SIZE + 10,
    borderRadius: (DOT_SIZE + 10) / 2,
    backgroundColor: 'rgba(255, 107, 107, 0.3)',
    top: -5,
    left: -5,
  },
  patternLine: {
    position: 'absolute',
    height: LINE_WIDTH,
    backgroundColor: '#007AFF',
    transformOrigin: '0 0',
  },
  biometricContainer: {
    alignItems: 'center',
  },
  biometricButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  biometricButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 10,
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