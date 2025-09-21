import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Switch,
  ScrollView,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import DatabaseService from '../services/database/DatabaseService';
import SecurityService from '../services/SecurityService';
import { SecuritySettings } from '../types';

export default function SecuritySettingsScreen() {
  const navigation = useNavigation();
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLockTypeModal, setShowLockTypeModal] = useState(false);

  useEffect(() => {
    loadSecuritySettings();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadSecuritySettings();
    }, [])
  );

  const loadSecuritySettings = async () => {
    try {
      setLoading(true);
      const settings = await DatabaseService.getSecuritySettings();
      console.log('SecuritySettingsScreen - 로드된 설정:', settings);
      if (settings) {
        setSecuritySettings(settings);
      } else {
        // 기본 설정 생성
        const defaultSettings = SecurityService.getDefaultSecuritySettings();
        console.log('SecuritySettingsScreen - 기본 설정 사용:', defaultSettings);
        setSecuritySettings(defaultSettings);
      }
    } catch (error) {
      console.error('보안 설정 로드 실패:', error);
      Alert.alert('오류', '보안 설정을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleLockToggle = async (value: boolean) => {
    if (!securitySettings) return;

    if (value) {
      // 앱 잠금 활성화 - 바로 PIN 설정으로 이동
      navigateToPinSetup(true);
    } else {
      // 암호 설정 비활성화
      Alert.alert(
        '앱 잠금 해제',
        '정말로 앱 잠금을 해제하시겠습니까?',
        [
          { text: '취소', style: 'cancel' },
          { text: '해제', style: 'destructive', onPress: disableLock }
        ]
      );
    }
  };

  const navigateToPinSetup = (isFirstTime: boolean) => {
    (navigation as any).navigate('PinSetup', { isFirstTime });
  };

  const navigateToPatternSetup = (isFirstTime: boolean) => {
    (navigation as any).navigate('PatternSetup', { isFirstTime });
  };

  const navigateToBiometricSetup = () => {
    (navigation as any).navigate('BiometricSetup');
  };

  const disableLock = async () => {
    try {
      if (!securitySettings) return;

      const updatedSettings = {
        ...securitySettings,
        isEnabled: false,
        updatedAt: Date.now(),
      };

      await DatabaseService.saveSecuritySettings(updatedSettings);
      setSecuritySettings(updatedSettings);
      Alert.alert('성공', '앱 잠금이 해제되었습니다.');
    } catch (error) {
      console.error('앱 잠금 해제 실패:', error);
      Alert.alert('오류', '앱 잠금 해제에 실패했습니다.');
    }
  };

  const changePassword = () => {
    if (!securitySettings) return;

    switch (securitySettings.lockType) {
      case 'pin':
        navigateToPinSetup(false);
        break;
      case 'pattern':
        navigateToPatternSetup(false);
        break;
      case 'biometric':
        navigateToBiometricSetup();
        break;
    }
  };

  const changeLockType = () => {
    setShowLockTypeModal(true);
  };

  const handleLockTypeSelect = (lockType: 'pin' | 'pattern' | 'biometric') => {
    setShowLockTypeModal(false);
    
    switch (lockType) {
      case 'pin':
        navigateToPinSetup(false);
        break;
      case 'pattern':
        navigateToPatternSetup(false);
        break;
      case 'biometric':
        navigateToBiometricSetup();
        break;
    }
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

  if (!securitySettings) {
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
                {securitySettings.isEnabled ? '활성화됨' : '비활성화됨'}
              </Text>
            </View>
            <Switch
              value={securitySettings.isEnabled}
              onValueChange={handleLockToggle}
              trackColor={{ false: '#E5E5E5', true: '#007AFF' }}
              thumbColor={securitySettings.isEnabled ? '#FFFFFF' : '#FFFFFF'}
            />
          </View>

          {securitySettings.isEnabled && (
            <>
              <View style={styles.settingItem}>
                <View style={styles.settingContent}>
                  <Text style={styles.settingTitle}>잠금 방식</Text>
                  <Text style={styles.settingSubtitle}>
                    {securitySettings.lockType === 'pin' ? 'PIN' : 
                     securitySettings.lockType === 'pattern' ? '패턴' : '생체인증'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.changeButton}
                  onPress={changeLockType}
                >
                  <Text style={styles.changeButtonText}>변경</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.settingItem}>
                <View style={styles.settingContent}>
                  <Text style={styles.settingTitle}>암호 변경</Text>
                  <Text style={styles.settingSubtitle}>
                    {securitySettings.lockType === 'biometric' ? '생체인증 재등록' : '새로운 암호 설정'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.changeButton}
                  onPress={changePassword}
                >
                  <Text style={styles.changeButtonText}>변경</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.settingItem}>
                <View style={styles.settingContent}>
                  <Text style={styles.settingTitle}>비밀번호 분실 시 대안</Text>
                  <Text style={styles.settingSubtitle}>
                    보안 질문으로 잠금 해제
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.changeButton}
                  onPress={() => Alert.alert('보안 질문', '보안 질문 기능은 아직 구현 중입니다.')}
                >
                  <Text style={styles.changeButtonText}>설정</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>

        {/* 잠금 방식 선택 모달 */}
        <Modal
          visible={showLockTypeModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowLockTypeModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>잠금 방식 선택</Text>
              
              <TouchableOpacity
                style={styles.modalOption}
                onPress={() => handleLockTypeSelect('pin')}
              >
                <Text style={styles.modalOptionText}>PIN</Text>
                <Text style={styles.modalOptionSubtext}>4-8자리 숫자</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.modalOption}
                onPress={() => handleLockTypeSelect('pattern')}
              >
                <Text style={styles.modalOptionText}>패턴</Text>
                <Text style={styles.modalOptionSubtext}>3x3 그리드 패턴</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.modalOption}
                onPress={() => handleLockTypeSelect('biometric')}
              >
                <Text style={styles.modalOptionText}>생체인증</Text>
                <Text style={styles.modalOptionSubtext}>지문/얼굴 인식</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowLockTypeModal(false)}
              >
                <Text style={styles.modalCancelText}>취소</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>보안 정보</Text>
          
          <View style={styles.infoContainer}>
            <Text style={styles.infoText}>
              • 앱 잠금을 활성화하면 앱을 열 때마다 인증이 필요합니다.
            </Text>
            <Text style={styles.infoText}>
              • PIN: 4-8자리 숫자로 설정 가능
            </Text>
            <Text style={styles.infoText}>
              • 패턴: 3x3 그리드에서 최소 4개 점을 연결
            </Text>
            <Text style={styles.infoText}>
              • 생체인증: 지문 또는 얼굴 인식 (기기 지원 시)
            </Text>
            <Text style={styles.infoText}>
              • 비밀번호를 잊어버린 경우 보안 질문으로 잠금을 해제할 수 있습니다.
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
  // 모달 스타일
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalOption: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  modalOptionSubtext: {
    fontSize: 14,
    color: '#666',
  },
  modalCancelButton: {
    marginTop: 10,
    paddingVertical: 15,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    color: '#FF3B30',
    fontWeight: '600',
  },
});
