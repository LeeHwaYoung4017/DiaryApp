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

export default function GoogleDriveSettingsScreen() {
  const [isGoogleDriveEnabled, setIsGoogleDriveEnabled] = useState(false);
  const [autoBackup, setAutoBackup] = useState(false);
  const [lastBackupDate, setLastBackupDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGoogleDriveSettings();
  }, []);

  const loadGoogleDriveSettings = async () => {
    try {
      setLoading(true);
      const googleDriveEnabled = await DatabaseService.getSetting('isGoogleDriveEnabled');
      const autoBackupSetting = await DatabaseService.getSetting('autoBackup');
      const lastBackup = await DatabaseService.getSetting('lastBackupDate');
      
      setIsGoogleDriveEnabled(googleDriveEnabled === 'true');
      setAutoBackup(autoBackupSetting === 'true');
      setLastBackupDate(lastBackup);
    } catch (error) {
      console.error('구글드라이브 설정 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleDriveToggle = async (value: boolean) => {
    if (value) {
      // 구글드라이브 연동 활성화
      Alert.alert(
        '구글드라이브 연동',
        '구글드라이브 연동을 활성화하시겠습니까?\n\n구글 계정으로 로그인하여 백업 및 복원 기능을 사용할 수 있습니다.',
        [
          { text: '취소', style: 'cancel' },
          { text: '연동', onPress: enableGoogleDrive }
        ]
      );
    } else {
      // 구글드라이브 연동 비활성화
      Alert.alert(
        '구글드라이브 연동 해제',
        '정말로 구글드라이브 연동을 해제하시겠습니까?\n\n기존 백업 데이터는 유지되지만 자동 백업이 중단됩니다.',
        [
          { text: '취소', style: 'cancel' },
          { text: '해제', style: 'destructive', onPress: disableGoogleDrive }
        ]
      );
    }
  };

  const enableGoogleDrive = async () => {
    try {
      // 실제 구현에서는 Google OAuth 인증 과정 필요
      Alert.alert('구글드라이브 연동', '구글드라이브 연동 기능을 구현할 예정입니다.');
      
      setIsGoogleDriveEnabled(true);
      await DatabaseService.setSetting('isGoogleDriveEnabled', 'true');
    } catch (error) {
      console.error('구글드라이브 연동 실패:', error);
      Alert.alert('오류', '구글드라이브 연동에 실패했습니다.');
    }
  };

  const disableGoogleDrive = async () => {
    try {
      setIsGoogleDriveEnabled(false);
      setAutoBackup(false);
      await DatabaseService.setSetting('isGoogleDriveEnabled', 'false');
      await DatabaseService.setSetting('autoBackup', 'false');
      Alert.alert('성공', '구글드라이브 연동이 해제되었습니다.');
    } catch (error) {
      console.error('구글드라이브 해제 실패:', error);
      Alert.alert('오류', '구글드라이브 해제에 실패했습니다.');
    }
  };

  const handleAutoBackupToggle = async (value: boolean) => {
    if (value && !isGoogleDriveEnabled) {
      Alert.alert('알림', '구글드라이브 연동을 먼저 활성화해주세요.');
      return;
    }

    try {
      setAutoBackup(value);
      await DatabaseService.setSetting('autoBackup', value.toString());
      Alert.alert('성공', `자동 백업이 ${value ? '활성화' : '비활성화'}되었습니다.`);
    } catch (error) {
      console.error('자동 백업 설정 실패:', error);
      Alert.alert('오류', '자동 백업 설정에 실패했습니다.');
    }
  };

  const performBackup = () => {
    if (!isGoogleDriveEnabled) {
      Alert.alert('알림', '구글드라이브 연동을 먼저 활성화해주세요.');
      return;
    }

    Alert.alert('백업', '백업 기능을 구현할 예정입니다.');
  };

  const performRestore = () => {
    if (!isGoogleDriveEnabled) {
      Alert.alert('알림', '구글드라이브 연동을 먼저 활성화해주세요.');
      return;
    }

    Alert.alert('복원', '복원 기능을 구현할 예정입니다.');
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
          <Text style={styles.sectionTitle}>구글드라이브 연동</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>구글드라이브 연동</Text>
              <Text style={styles.settingSubtitle}>
                {isGoogleDriveEnabled ? '연동됨' : '연동 안됨'}
              </Text>
            </View>
            <Switch
              value={isGoogleDriveEnabled}
              onValueChange={handleGoogleDriveToggle}
              trackColor={{ false: '#E5E5E5', true: '#007AFF' }}
              thumbColor={isGoogleDriveEnabled ? '#FFFFFF' : '#FFFFFF'}
            />
          </View>

          {isGoogleDriveEnabled && (
            <>
              <View style={styles.settingItem}>
                <View style={styles.settingContent}>
                  <Text style={styles.settingTitle}>자동 백업</Text>
                  <Text style={styles.settingSubtitle}>
                    주기적으로 자동 백업
                  </Text>
                </View>
                <Switch
                  value={autoBackup}
                  onValueChange={handleAutoBackupToggle}
                  trackColor={{ false: '#E5E5E5', true: '#007AFF' }}
                  thumbColor={autoBackup ? '#FFFFFF' : '#FFFFFF'}
                />
              </View>

              {lastBackupDate && (
                <View style={styles.settingItem}>
                  <View style={styles.settingContent}>
                    <Text style={styles.settingTitle}>마지막 백업</Text>
                    <Text style={styles.settingSubtitle}>
                      {new Date(lastBackupDate).toLocaleString('ko-KR')}
                    </Text>
                  </View>
                </View>
              )}
            </>
          )}
        </View>

        {isGoogleDriveEnabled && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>백업 및 복원</Text>
            
            <TouchableOpacity
              style={styles.actionButton}
              onPress={performBackup}
            >
              <Text style={styles.actionButtonText}>📤 지금 백업하기</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.secondaryButton]}
              onPress={performRestore}
            >
              <Text style={[styles.actionButtonText, styles.secondaryButtonText]}>
                📥 백업에서 복원하기
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>백업 정보</Text>
          <View style={styles.infoContainer}>
            <Text style={styles.infoText}>
              • 구글드라이브 연동 시 일기 데이터가 안전하게 백업됩니다.
            </Text>
            <Text style={styles.infoText}>
              • 자동 백업은 7일마다 실행됩니다.
            </Text>
            <Text style={styles.infoText}>
              • 백업 데이터는 암호화되어 저장됩니다.
            </Text>
            <Text style={styles.infoText}>
              • 복원 시 기존 데이터는 덮어쓰여집니다.
            </Text>
            <Text style={styles.infoText}>
              • 네트워크 연결이 필요합니다.
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
  actionButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    margin: 16,
    marginTop: 8,
    alignItems: 'center',
  },
  secondaryButton: {
    backgroundColor: '#F2F2F7',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButtonText: {
    color: '#007AFF',
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
