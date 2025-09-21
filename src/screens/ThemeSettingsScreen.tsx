import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DatabaseService from '../services/database/DatabaseService';

const itemWidth = (Dimensions.get('window').width - 48) / 6; // 6개씩 배치

// 36개 커스텀 컬러 팔레트
const CUSTOM_COLORS = [
  '#FF6B6B', '#FF8E53', '#FFD93D', '#6BCF7F', '#4ECDC4', '#45B7D1',
  '#A8E6CF', '#FFD3A5', '#FD9853', '#A8A8A8', '#FFB6C1', '#DDA0DD',
  '#98FB98', '#F0E68C', '#FFA07A', '#20B2AA', '#87CEEB', '#D8BFD8',
  '#F5DEB3', '#FFE4E1', '#E0FFFF', '#F0FFF0', '#FFF8DC', '#FFEFD5',
  '#FDF5E6', '#F5F5DC', '#FFFAF0', '#F0F8FF', '#E6E6FA', '#FFF0F5',
  '#F0FFFF', '#F5FFFA', '#FFFACD', '#FFEBCD', '#F5F5F5', '#FFFFFF'
];

export default function ThemeSettingsScreen() {
  const [selectedTheme, setSelectedTheme] = useState<'light' | 'dark' | 'custom'>('light');
  const [selectedColor, setSelectedColor] = useState('#007AFF');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadThemeSettings();
  }, []);

  const loadThemeSettings = async () => {
    try {
      setLoading(true);
      const theme = await DatabaseService.getSetting('theme');
      const customColor = await DatabaseService.getSetting('customColor');
      
      setSelectedTheme((theme as any) || 'light');
      setSelectedColor(customColor || '#007AFF');
    } catch (error) {
      console.error('테마 설정 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleThemeChange = async (theme: 'light' | 'dark' | 'custom') => {
    try {
      setSelectedTheme(theme);
      await DatabaseService.setSetting('theme', theme);
      
      if (theme === 'custom') {
        await DatabaseService.setSetting('customColor', selectedColor);
      }
      
      Alert.alert('성공', '테마가 변경되었습니다.');
    } catch (error) {
      console.error('테마 변경 실패:', error);
      Alert.alert('오류', '테마 변경에 실패했습니다.');
    }
  };

  const handleColorSelect = async (color: string) => {
    try {
      setSelectedColor(color);
      if (selectedTheme === 'custom') {
        await DatabaseService.setSetting('customColor', color);
        Alert.alert('성공', '커스텀 색상이 변경되었습니다.');
      }
    } catch (error) {
      console.error('색상 변경 실패:', error);
      Alert.alert('오류', '색상 변경에 실패했습니다.');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>테마를 불러오는 중...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>기본 테마</Text>
          
          <TouchableOpacity
            style={[
              styles.themeOption,
              selectedTheme === 'light' && styles.selectedThemeOption
            ]}
            onPress={() => handleThemeChange('light')}
          >
            <View style={[styles.themePreview, { backgroundColor: '#FFFFFF' }]}>
              <View style={[styles.themePreviewBar, { backgroundColor: '#007AFF' }]} />
              <View style={[styles.themePreviewContent, { backgroundColor: '#F2F2F7' }]} />
            </View>
            <Text style={[
              styles.themeOptionText,
              selectedTheme === 'light' && styles.selectedThemeOptionText
            ]}>
              라이트
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.themeOption,
              selectedTheme === 'dark' && styles.selectedThemeOption
            ]}
            onPress={() => handleThemeChange('dark')}
          >
            <View style={[styles.themePreview, { backgroundColor: '#000000' }]}>
              <View style={[styles.themePreviewBar, { backgroundColor: '#0A84FF' }]} />
              <View style={[styles.themePreviewContent, { backgroundColor: '#1C1C1E' }]} />
            </View>
            <Text style={[
              styles.themeOptionText,
              selectedTheme === 'dark' && styles.selectedThemeOptionText
            ]}>
              다크
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.themeOption,
              selectedTheme === 'custom' && styles.selectedThemeOption
            ]}
            onPress={() => handleThemeChange('custom')}
          >
            <View style={[styles.themePreview, { backgroundColor: '#FFFFFF' }]}>
              <View style={[styles.themePreviewBar, { backgroundColor: selectedColor }]} />
              <View style={[styles.themePreviewContent, { backgroundColor: '#F2F2F7' }]} />
            </View>
            <Text style={[
              styles.themeOptionText,
              selectedTheme === 'custom' && styles.selectedThemeOptionText
            ]}>
              커스텀
            </Text>
          </TouchableOpacity>
        </View>

        {selectedTheme === 'custom' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>커스텀 색상</Text>
            <Text style={styles.sectionSubtitle}>
              원하는 색상을 선택하여 개인화된 테마를 만들어보세요.
            </Text>
            
            <View style={styles.colorGrid}>
              {CUSTOM_COLORS.map((color, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.colorItem,
                    { backgroundColor: color },
                    selectedColor === color && styles.selectedColorItem
                  ]}
                  onPress={() => handleColorSelect(color)}
                >
                  {selectedColor === color && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>테마 정보</Text>
          <View style={styles.infoContainer}>
            <Text style={styles.infoText}>
              • 라이트 테마: 밝고 깔끔한 화이트 톤
            </Text>
            <Text style={styles.infoText}>
              • 다크 테마: 눈의 피로를 줄이는 다크 톤
            </Text>
            <Text style={styles.infoText}>
              • 커스텀 테마: 36가지 색상 중 선택 가능
            </Text>
            <Text style={styles.infoText}>
              • 테마 변경 시 즉시 적용됩니다.
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
  themeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  selectedThemeOption: {
    backgroundColor: '#F0F8FF',
  },
  themePreview: {
    width: 60,
    height: 40,
    borderRadius: 8,
    marginRight: 16,
    overflow: 'hidden',
  },
  themePreviewBar: {
    height: 8,
    width: '100%',
  },
  themePreviewContent: {
    flex: 1,
    margin: 4,
    borderRadius: 4,
  },
  themeOptionText: {
    fontSize: 16,
    color: '#000000',
  },
  selectedThemeOptionText: {
    color: '#007AFF',
    fontWeight: 'bold',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    paddingTop: 8,
  },
  colorItem: {
    width: itemWidth,
    height: itemWidth,
    borderRadius: 8,
    margin: 2,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedColorItem: {
    borderColor: '#007AFF',
    borderWidth: 3,
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
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
