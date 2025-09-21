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
import { useNavigation, useRoute } from '@react-navigation/native';
import DatabaseService from '../services/database/DatabaseService';
import SecurityService from '../services/SecurityService';
import { SecuritySettings, PatternData } from '../types';

const { width } = Dimensions.get('window');
const PATTERN_SIZE = Math.min(width * 0.8, 350);
const DOT_SIZE = 25;
const LINE_WIDTH = 4;

export default function PatternSetupScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { isFirstTime } = route.params as { isFirstTime: boolean };
  
  const [pattern, setPattern] = useState<number[]>([]);
  const [confirmPattern, setConfirmPattern] = useState<number[]>([]);
  const [isConfirming, setIsConfirming] = useState(false);
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<number[]>([]);

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
        if (isConfirming) {
          setConfirmPattern(currentPath);
          handlePatternComplete(currentPath);
        } else {
          setPattern(currentPath);
          setIsConfirming(true);
          setCurrentPath([]);
        }
      } else if (isDrawing && currentPath.length > 0) {
        // 패턴이 너무 짧으면 초기화
        Alert.alert('알림', '패턴은 최소 4개의 점을 연결해야 합니다.');
        setCurrentPath([]);
      }
      setIsDrawing(false);
    },
  });


  const handlePatternComplete = async (secondPattern: number[]) => {
    try {
      if (isFirstTime) {
        // 초기 패턴 설정
        if (JSON.stringify(pattern) === JSON.stringify(secondPattern)) {
          const patternData: PatternData = {
            dots: pattern,
            createdAt: Date.now(),
          };
          
          const newSettings: SecuritySettings = {
            isEnabled: true,
            lockType: 'pattern',
            pinCode: '',
            pattern: JSON.stringify(patternData),
            biometricEnabled: false,
            backupUnlockEnabled: false,
            securityQuestions: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };

          await DatabaseService.saveSecuritySettings(newSettings);
          Alert.alert('성공', '패턴이 설정되었습니다.', [
            { text: '확인', onPress: () => {
              // 암호설정 화면으로 돌아가기
              navigation.goBack();
            }}
          ]);
        } else {
          Alert.alert('오류', '패턴이 일치하지 않습니다. 다시 시도해주세요.');
          setPattern([]);
          setConfirmPattern([]);
          setIsConfirming(false);
          setCurrentPath([]);
        }
      } else {
        // 기존 패턴 변경
        if (JSON.stringify(pattern) === JSON.stringify(secondPattern)) {
          const patternData: PatternData = {
            dots: pattern,
            createdAt: Date.now(),
          };
          
          const updatedSettings: SecuritySettings = {
            ...securitySettings!,
            lockType: 'pattern', // 잠금 방식을 패턴으로 명시적 설정
            pattern: JSON.stringify(patternData),
            biometricEnabled: false, // 생체인증 비활성화
            updatedAt: Date.now(),
          };

          console.log('PatternSetupScreen - 저장할 설정:', updatedSettings);
          await DatabaseService.saveSecuritySettings(updatedSettings);
          Alert.alert('성공', '패턴이 변경되었습니다.', [
            { text: '확인', onPress: () => {
              // 암호설정 화면으로 돌아가기
              navigation.goBack();
            }}
          ]);
        } else {
          Alert.alert('오류', '패턴이 일치하지 않습니다. 다시 시도해주세요.');
          setPattern([]);
          setConfirmPattern([]);
          setIsConfirming(false);
          setCurrentPath([]);
        }
      }
    } catch (error) {
      console.error('패턴 설정 실패:', error);
      if (error instanceof Error && error.message.includes('database is locked')) {
        Alert.alert('오류', '데이터베이스가 잠겨있습니다. 잠시 후 다시 시도해주세요.');
      } else {
        Alert.alert('오류', '패턴 설정에 실패했습니다.');
      }
      setPattern([]);
      setConfirmPattern([]);
      setIsConfirming(false);
      setCurrentPath([]);
    }
  };

  const renderPatternDots = () => {
    const dots = [];
    const currentPattern = isConfirming ? confirmPattern : pattern;
    const displayPattern = isDrawing ? currentPath : currentPattern;
    
    for (let i = 0; i < 9; i++) {
      const position = getDotPosition(i);
      const isSelected = displayPattern.includes(i);
      const isActive = isDrawing && currentPath.includes(i);
      const isLast = isDrawing && currentPath.length > 0 && currentPath[currentPath.length - 1] === i;
      
      dots.push(
        <View
          key={i}
          style={[
            styles.dot,
            {
              left: position.x - DOT_SIZE / 2,
              top: position.y - DOT_SIZE / 2,
            },
            isSelected && styles.dotSelected,
            isActive && styles.dotActive,
            isLast && styles.dotLast,
          ]}
        >
          <View style={[styles.dotInner, isSelected && styles.dotInnerSelected]} />
          {isLast && <View style={styles.dotPulse} />}
        </View>
      );
    }
    return dots;
  };

  const renderPatternLines = () => {
    const lines = [];
    const currentPattern = isConfirming ? confirmPattern : pattern;
    const displayPattern = isDrawing ? currentPath : currentPattern;
    
    for (let i = 0; i < displayPattern.length - 1; i++) {
      const startPos = getDotPosition(displayPattern[i]);
      const endPos = getDotPosition(displayPattern[i + 1]);
      
      const angle = Math.atan2(endPos.y - startPos.y, endPos.x - startPos.x);
      const distance = getDistance(startPos, endPos);
      
      lines.push(
        <View
          key={i}
          style={[
            styles.line,
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

  const getInstructionText = () => {
    if (isFirstTime) {
      if (!isConfirming) {
        return '패턴을 그려주세요 (최소 4개 점)';
      } else {
        return '패턴을 다시 그려주세요';
      }
    } else {
      if (!isConfirming) {
        return '새 패턴을 그려주세요 (최소 4개 점)';
      } else {
        return '새 패턴을 다시 그려주세요';
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>패턴 설정</Text>
          <Text style={styles.subtitle}>{getInstructionText()}</Text>
        </View>

        <View style={styles.patternContainer}>
          <View 
            style={[styles.patternGrid, { width: PATTERN_SIZE, height: PATTERN_SIZE }]}
            {...panResponder.panHandlers}
          >
            {renderPatternLines()}
            {renderPatternDots()}
          </View>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.resetButton}
            onPress={() => {
              setPattern([]);
              setConfirmPattern([]);
              setIsConfirming(false);
              setCurrentPath([]);
              setIsDrawing(false);
            }}
          >
            <Text style={styles.resetButtonText}>다시 시작</Text>
          </TouchableOpacity>
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
  header: {
    alignItems: 'center',
    marginTop: 40,
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
  patternContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  patternGrid: {
    position: 'relative',
    width: PATTERN_SIZE,
    height: PATTERN_SIZE,
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
  dot: {
    position: 'absolute',
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: '#ddd',
    borderWidth: 2,
    borderColor: '#bbb',
  },
  dotSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  dotActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  dotLast: {
    backgroundColor: '#FF6B6B',
    borderColor: '#FF6B6B',
  },
  dotInner: {
    width: DOT_SIZE - 8,
    height: DOT_SIZE - 8,
    borderRadius: (DOT_SIZE - 8) / 2,
    backgroundColor: '#fff',
    position: 'absolute',
    top: 4,
    left: 4,
  },
  dotInnerSelected: {
    backgroundColor: '#fff',
  },
  dotPulse: {
    position: 'absolute',
    width: DOT_SIZE + 10,
    height: DOT_SIZE + 10,
    borderRadius: (DOT_SIZE + 10) / 2,
    backgroundColor: 'rgba(255, 107, 107, 0.3)',
    top: -5,
    left: -5,
  },
  line: {
    position: 'absolute',
    height: LINE_WIDTH,
    backgroundColor: '#007AFF',
    transformOrigin: '0 0',
  },
  footer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  resetButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  resetButtonText: {
    fontSize: 16,
    color: '#666',
  },
});
