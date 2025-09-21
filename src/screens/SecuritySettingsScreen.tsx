import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Switch,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DatabaseService from '../services/database/DatabaseService';

export default function SecuritySettingsScreen() {
  const [isLockEnabled, setIsLockEnabled] = useState(false);
  const [lockType, setLockType] = useState<'pin' | 'pattern' | 'biometric'>('pin');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSecuritySettings();
  }, []);

  const loadSecuritySettings = async () => {
    try {
      setLoading(true);
      const lockEnabled = await DatabaseService.getSetting('isLockEnabled');
      const lockTypeSetting = await DatabaseService.getSetting('lockType');
      
      setIsLockEnabled(lockEnabled === 'true');
      setLockType((lockTypeSetting as any) || 'pin');
    } catch (error) {
      console.error('보안 설정 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLockToggle = async (value: boolean) => {
    if (value) {
      // 암호 설정 활성화
      Alert.alert(
        '암호 설정',
        '암호 설정 방법을 선택하세요:',
        [
          { text: 'PIN', onPress: () => setLockTypeAndEnable('pin') },
          { text: '패턴', onPress: () => setLockTypeAndEnable('pattern') },
          { text: '생체인증', onPress: () => setLockTypeAndEnable('biometric') },
          { text: '취소', style: 'cancel' }
        ]
      );
    } else {
      // 암호 설정 비활성화
      Alert.alert(
        '암호 해제',
        '정말로 암호 설정을 해제하시겠습니까?',
        [
          { text: '취소', style: 'cancel' },
          { text: '해제', style: 'destructive', onPress: disableLock }
        ]
      );
    }
  };

  const setLockTypeAndEnable = async (type: 'pin' | 'pattern' | 'biometric') => {
    try {
      setLockType(type);
      setIsLockEnabled(true);
      await DatabaseService.setSetting('lockType', type);
      await DatabaseService.setSetting('isLockEnabled', 'true');
      
      // 실제 암호 설정 화면으로 이동 (구현 예정)
      Alert.alert('성공', `${type === 'pin' ? 'PIN' : type === 'pattern' ? '패턴' : '생체인증'} 설정이 활성화되었습니다.`);
    } catch (error) {
      console.error('암호 설정 실패:', error);
      Alert.alert('오류', '암호 설정에 실패했습니다.');
    }
  };

  const disableLock = async () => {
    try {
      setIsLockEnabled(false);
      await DatabaseService.setSetting('isLockEnabled', 'false');
      Alert.alert('성공', '암호 설정이 해제되었습니다.');
    } catch (error) {
      console.error('암호 해제 실패:', error);
      Alert.alert('오류', '암호 해제에 실패했습니다.');
    }
  };

  const changePassword = () => {
    Alert.alert('암호 변경', '암호 변경 기능을 구현할 예정입니다.');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>설정을 불러오는 중...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>앱 잠금</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>앱 잠금</Text>
              <Text style={styles.settingSubtitle}>
                {isLockEnabled ? '활성화됨' : '비활성화됨'}
              </Text>
            </View>
            <Switch
              value={isLockEnabled}
              onValueChange={handleLockToggle}
              trackColor={{ false: '#E5E5E5', true: '#007AFF' }}
              thumbColor={isLockEnabled ? '#FFFFFF' : '#FFFFFF'}
            />
          </View>

          {isLockEnabled && (
            <>
              <View style={styles.settingItem}>
                <View style={styles.settingContent}>
                  <Text style={styles.settingTitle}>잠금 방식</Text>
                  <Text style={styles.settingSubtitle}>
                    {lockType === 'pin' ? 'PIN' : lockType === 'pattern' ? '패턴' : '생체인증'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.changeButton}
                  onPress={() => {
                    Alert.alert(
                      '잠금 방식 변경',
                      '새로운 잠금 방식을 선택하세요:',
                      [
                        { text: 'PIN', onPress: () => setLockTypeAndEnable('pin') },
                        { text: '패턴', onPress: () => setLockTypeAndEnable('pattern') },
                        { text: '생체인증', onPress: () => setLockTypeAndEnable('biometric') },
                        { text: '취소', style: 'cancel' }
                      ]
                    );
                  }}
                >
                  <Text style={styles.changeButtonText}>변경</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.settingItem}>
                <View style={styles.settingContent}>
                  <Text style={styles.settingTitle}>암호 변경</Text>
                  <Text style={styles.settingSubtitle}>
                    {lockType === 'biometric' ? '생체인증 재등록' : '새로운 암호 설정'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.changeButton}
                  onPress={changePassword}
                >
                  <Text style={styles.changeButtonText}>변경</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>보안 정보</Text>
          
          <View style={styles.infoContainer}>
            <Text style={styles.infoText}>
              • 앱 잠금을 활성화하면 앱을 열 때마다 인증이 필요합니다.
            </Text>
            <Text style={styles.infoText}>
              • PIN: 4-6자리 숫자로 설정 가능
            </Text>
            <Text style={styles.infoText}>
              • 패턴: 3x3 그리드에서 패턴 그리기
            </Text>
            <Text style={styles.infoText}>
              • 생체인증: 지문 또는 얼굴 인식
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#8E8E93',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
    padding: 16,
    paddingBottom: 8,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    color: '#000000',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
  },
  changeButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  changeButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  infoContainer: {
    padding: 16,
    paddingTop: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 20,
    marginBottom: 8,
  },
});
