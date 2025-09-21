import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Switch,
} from 'react-native';
import { Settings } from '../types';
import DatabaseService from '../services/database/DatabaseService';
import { LANGUAGE_CONFIG, THEME_CONFIG } from '../constants';

export default function SettingsScreen({ navigation }: any) {
  const [settings, setSettings] = useState<Settings>({
    appTitle: '일기제목',
    theme: 'light',
    language: 'ko',
    isLockEnabled: false,
    lockType: 'pin',
    isGoogleDriveEnabled: false,
    autoBackup: false,
    maxImageSize: 200,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const appTitle = await DatabaseService.getSetting('appTitle');
      const theme = await DatabaseService.getSetting('theme');
      const language = await DatabaseService.getSetting('language');
      const isLockEnabled = await DatabaseService.getSetting('isLockEnabled');
      const lockType = await DatabaseService.getSetting('lockType');
      const isGoogleDriveEnabled = await DatabaseService.getSetting('isGoogleDriveEnabled');
      const autoBackup = await DatabaseService.getSetting('autoBackup');
      const maxImageSize = await DatabaseService.getSetting('maxImageSize');

      setSettings({
        appTitle: appTitle || '일기제목',
        theme: (theme as any) || 'light',
        language: (language as any) || 'ko',
        isLockEnabled: isLockEnabled === 'true',
        lockType: (lockType as any) || 'pin',
        isGoogleDriveEnabled: isGoogleDriveEnabled === 'true',
        autoBackup: autoBackup === 'true',
        maxImageSize: parseInt(maxImageSize || '200'),
      });
    } catch (error) {
      console.error('설정 로드 실패:', error);
    }
  };

  const updateSetting = async (key: string, value: string) => {
    try {
      await DatabaseService.setSetting(key, value);
      setSettings(prev => ({ ...prev, [key]: value }));
    } catch (error) {
      console.error('설정 업데이트 실패:', error);
      Alert.alert('오류', '설정 저장에 실패했습니다.');
    }
  };

  const handleAppTitleChange = () => {
    Alert.prompt(
      '일기제목 변경',
      '새로운 제목을 입력하세요:',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '확인',
          onPress: (newTitle) => {
            if (newTitle && newTitle.trim()) {
              updateSetting('appTitle', newTitle.trim());
            }
          }
        }
      ],
      'plain-text',
      settings.appTitle
    );
  };

  const handleThemeChange = (theme: 'light' | 'dark' | 'custom') => {
    updateSetting('theme', theme);
  };

  const handleLanguageChange = (language: 'ko' | 'en' | 'ja' | 'zh') => {
    updateSetting('language', language);
  };

  const handleLockToggle = (value: boolean) => {
    updateSetting('isLockEnabled', value.toString());
  };

  const handleGoogleDriveToggle = (value: boolean) => {
    updateSetting('isGoogleDriveEnabled', value.toString());
  };

  const handleAutoBackupToggle = (value: boolean) => {
    updateSetting('autoBackup', value.toString());
  };

  const handleDiarySelection = () => {
    Alert.alert('일기선택', '다중 선택/삭제/내보내기 기능을 구현할 예정입니다.');
  };

  const handlePasswordSettings = () => {
    Alert.alert('암호설정', 'PIN/패턴/생체인증 설정을 구현할 예정입니다.');
  };

  const handleGoogleDriveSync = () => {
    Alert.alert('구글드라이브 연동', '백업·복원 기능을 구현할 예정입니다.');
  };

  const handleMoodChart = () => {
    navigation.navigate('Chart');
  };

  const renderSettingItem = (
    title: string,
    subtitle?: string,
    onPress?: () => void,
    rightElement?: React.ReactNode
  ) => (
    <TouchableOpacity
      style={styles.settingItem}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>{title}</Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      {rightElement}
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* 기본 설정 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>기본 설정</Text>
        
        {renderSettingItem(
          '일기제목 변경',
          settings.appTitle,
          handleAppTitleChange,
          <Text style={styles.chevron}>›</Text>
        )}
        
        {renderSettingItem(
          '일기추가',
          '작성 바로가기',
          () => navigation.navigate('Write'),
          <Text style={styles.chevron}>›</Text>
        )}
        
        {renderSettingItem(
          '일기선택',
          '다중 선택/삭제/내보내기',
          handleDiarySelection,
          <Text style={styles.chevron}>›</Text>
        )}
      </View>

      {/* 보안 설정 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>보안 설정</Text>
        
        {renderSettingItem(
          '앱 잠금',
          'PIN/패턴/생체인증',
          handlePasswordSettings,
          <Switch
            value={settings.isLockEnabled}
            onValueChange={handleLockToggle}
            trackColor={{ false: '#E5E5E5', true: '#007AFF' }}
            thumbColor={settings.isLockEnabled ? '#FFFFFF' : '#FFFFFF'}
          />
        )}
        
        {renderSettingItem(
          '테마선택',
          THEME_CONFIG[settings.theme] ? '라이트/다크/커스텀' : '라이트/다크/커스텀',
          () => {
            Alert.alert(
              '테마 선택',
              '테마를 선택하세요:',
              [
                { text: '라이트', onPress: () => handleThemeChange('light') },
                { text: '다크', onPress: () => handleThemeChange('dark') },
                { text: '커스텀', onPress: () => handleThemeChange('custom') },
                { text: '취소', style: 'cancel' }
              ]
            );
          },
          <Text style={styles.chevron}>›</Text>
        )}
      </View>

      {/* 클라우드 설정 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>클라우드 설정</Text>
        
        {renderSettingItem(
          '구글드라이브 연동',
          '백업·복원',
          handleGoogleDriveSync,
          <Switch
            value={settings.isGoogleDriveEnabled}
            onValueChange={handleGoogleDriveToggle}
            trackColor={{ false: '#E5E5E5', true: '#007AFF' }}
            thumbColor={settings.isGoogleDriveEnabled ? '#FFFFFF' : '#FFFFFF'}
          />
        )}
        
        {renderSettingItem(
          '자동 백업',
          '주기적 백업',
          undefined,
          <Switch
            value={settings.autoBackup}
            onValueChange={handleAutoBackupToggle}
            trackColor={{ false: '#E5E5E5', true: '#007AFF' }}
            thumbColor={settings.autoBackup ? '#FFFFFF' : '#FFFFFF'}
          />
        )}
      </View>

      {/* 분석 및 기타 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>분석 및 기타</Text>
        
        {renderSettingItem(
          '기분차트',
          '기간별 분석',
          handleMoodChart,
          <Text style={styles.chevron}>›</Text>
        )}
        
        {renderSettingItem(
          '언어선택',
          LANGUAGE_CONFIG[settings.language],
          () => {
            Alert.alert(
              '언어 선택',
              '언어를 선택하세요:',
              [
                { text: '한국어', onPress: () => handleLanguageChange('ko') },
                { text: 'English', onPress: () => handleLanguageChange('en') },
                { text: '日本語', onPress: () => handleLanguageChange('ja') },
                { text: '中文', onPress: () => handleLanguageChange('zh') },
                { text: '취소', style: 'cancel' }
              ]
            );
          },
          <Text style={styles.chevron}>›</Text>
        )}
      </View>

      {/* 앱 정보 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>앱 정보</Text>
        
        {renderSettingItem(
          '버전',
          '1.0.0',
          undefined,
          undefined
        )}
        
        {renderSettingItem(
          '개발자',
          'DiaryApp Team',
          undefined,
          undefined
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginTop: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E5E5E5',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#8E8E93',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F2F2F7',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
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
  chevron: {
    fontSize: 18,
    color: '#C6C6C8',
    marginLeft: 8,
  },
});
