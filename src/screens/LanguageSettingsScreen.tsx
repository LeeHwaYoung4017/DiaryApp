import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DatabaseService from '../services/database/DatabaseService';
import { LANGUAGE_CONFIG } from '../constants';

const LANGUAGES = [
  { code: 'ko', name: '한국어', flag: '🇰🇷' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
] as const;

export default function LanguageSettingsScreen() {
  const [selectedLanguage, setSelectedLanguage] = useState<'ko' | 'en' | 'ja' | 'zh'>('ko');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLanguageSettings();
  }, []);

  const loadLanguageSettings = async () => {
    try {
      setLoading(true);
      const language = await DatabaseService.getSetting('language');
      setSelectedLanguage((language as any) || 'ko');
    } catch (error) {
      console.error('언어 설정 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLanguageChange = async (language: 'ko' | 'en' | 'ja' | 'zh') => {
    try {
      setSelectedLanguage(language);
      await DatabaseService.setSetting('language', language);
      
      Alert.alert(
        '언어 변경',
        '언어가 변경되었습니다. 앱을 재시작하면 새로운 언어로 표시됩니다.',
        [{ text: '확인' }]
      );
    } catch (error) {
      console.error('언어 변경 실패:', error);
      Alert.alert('오류', '언어 변경에 실패했습니다.');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>언어 설정을 불러오는 중...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>언어 선택</Text>
          <Text style={styles.sectionSubtitle}>
            앱에서 사용할 언어를 선택하세요.
          </Text>
          
          {LANGUAGES.map((language) => (
            <TouchableOpacity
              key={language.code}
              style={[
                styles.languageOption,
                selectedLanguage === language.code && styles.selectedLanguageOption
              ]}
              onPress={() => handleLanguageChange(language.code)}
            >
              <View style={styles.languageInfo}>
                <Text style={styles.languageFlag}>{language.flag}</Text>
                <View style={styles.languageTextContainer}>
                  <Text style={[
                    styles.languageName,
                    selectedLanguage === language.code && styles.selectedLanguageName
                  ]}>
                    {language.name}
                  </Text>
                  <Text style={styles.languageCode}>
                    {language.code.toUpperCase()}
                  </Text>
                </View>
              </View>
              {selectedLanguage === language.code && (
                <Text style={styles.checkmark}>✓</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>현재 설정</Text>
          <View style={styles.currentSettingContainer}>
            <Text style={styles.currentSettingLabel}>선택된 언어:</Text>
            <Text style={styles.currentSettingValue}>
              {LANGUAGES.find(lang => lang.code === selectedLanguage)?.flag} {LANGUAGES.find(lang => lang.code === selectedLanguage)?.name}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>언어 정보</Text>
          <View style={styles.infoContainer}>
            <Text style={styles.infoText}>
              • 언어 변경 시 앱의 모든 텍스트가 선택한 언어로 표시됩니다.
            </Text>
            <Text style={styles.infoText}>
              • 일기 내용은 변경되지 않습니다.
            </Text>
            <Text style={styles.infoText}>
              • 앱을 재시작하면 새로운 언어가 적용됩니다.
            </Text>
            <Text style={styles.infoText}>
              • 지원 언어: 한국어, 영어, 일본어, 중국어
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
  sectionSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  languageOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  selectedLanguageOption: {
    backgroundColor: '#F0F8FF',
  },
  languageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  languageFlag: {
    fontSize: 24,
    marginRight: 16,
  },
  languageTextContainer: {
    flex: 1,
  },
  languageName: {
    fontSize: 16,
    color: '#000000',
    marginBottom: 2,
  },
  selectedLanguageName: {
    color: '#007AFF',
    fontWeight: 'bold',
  },
  languageCode: {
    fontSize: 12,
    color: '#8E8E93',
  },
  checkmark: {
    fontSize: 20,
    color: '#007AFF',
    fontWeight: 'bold',
  },
  currentSettingContainer: {
    padding: 16,
    paddingTop: 8,
  },
  currentSettingLabel: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 4,
  },
  currentSettingValue: {
    fontSize: 16,
    color: '#000000',
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
