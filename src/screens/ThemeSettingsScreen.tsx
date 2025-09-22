import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Dimensions,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';

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

// 색상 이름 배열
const COLOR_NAMES = [
  '빨강', '주황', '노랑', '초록', '청록1', '파랑',
  '연초록', '복숭아', '주황', '회색', '분홍', '보라',
  '연초록', '카키', '연어', '청록2', '하늘', '연보라',
  '베이지', '연분홍', '연하늘', '연민트', '연노랑', '크림',
  '라벤더', '아이보리', '스노우', '연파랑', '연보라', '연분홍',
  '연하늘', '연민트', '연노랑', '아몬드', '회색', '흰색'
];

export default function ThemeSettingsScreen() {
  const { theme, setTheme, loading } = useTheme();
  const [selectedColor, setSelectedColor] = useState('#007AFF');
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipColor, setTooltipColor] = useState('');
  const [tooltipName, setTooltipName] = useState('');
  const [isCustomSelected, setIsCustomSelected] = useState(false);

  useEffect(() => {
    if (theme.customColor) {
      setSelectedColor(theme.customColor);
    }
    // 현재 테마가 커스텀인지 확인
    setIsCustomSelected(theme.type === 'custom');
  }, [theme.customColor, theme.type]);

  const handleThemeChange = async (themeType: 'light' | 'dark' | 'custom') => {
    try {
      // 커스텀 테마 선택 시에는 테마를 변경하지 않고 UI만 업데이트
      if (themeType === 'custom') {
        // 커스텀 선택 시에는 selectedColor만 설정하고 로컬 상태 업데이트
        setSelectedColor('#007AFF');
        setIsCustomSelected(true);
        return;
      } else {
        await setTheme(themeType);
        setIsCustomSelected(false);
        Alert.alert('성공', '테마가 변경되었습니다.');
      }
    } catch (error) {
      console.error('테마 변경 실패:', error);
      Alert.alert('오류', '테마 변경에 실패했습니다.');
    }
  };

  const handleColorSelect = async (color: string) => {
    try {
      setSelectedColor(color);
      if (isCustomSelected) {
        await setTheme('custom', color);
        Alert.alert('성공', '테마가 변경되었습니다.');
      }
    } catch (error) {
      console.error('색상 변경 실패:', error);
      Alert.alert('오류', '색상 변경에 실패했습니다.');
    }
  };

  const handleColorLongPress = (color: string, index: number) => {
    setTooltipColor(color);
    setTooltipName(COLOR_NAMES[index]);
    setShowTooltip(true);
  };

  const hideTooltip = () => {
    setShowTooltip(false);
  };

  // 배경색의 밝기에 따라 텍스트 색상 결정
  const getContrastTextColor = (backgroundColor: string) => {
    // 특정 색상들에 대한 명시적 텍스트 색상 매핑
    const colorTextMap: { [key: string]: string } = {
      // 매우 밝은 파스텔 색상들 - 검은 텍스트
      '#FFE4E1': '#000000', // 연분홍
      '#E0FFFF': '#000000', // 연하늘
      '#F0FFF0': '#000000', // 연민트
      '#FFF8DC': '#000000', // 연노랑
      '#FFEFD5': '#000000', // 크림
      '#FDF5E6': '#000000', // 라벤더
      '#F5F5DC': '#000000', // 아이보리
      '#FFFAF0': '#000000', // 스노우
      '#F0F8FF': '#000000', // 연파랑
      '#E6E6FA': '#000000', // 연보라
      '#FFF0F5': '#000000', // 연분홍
      '#F0FFFF': '#000000', // 연하늘
      '#F5FFFA': '#000000', // 연민트
      '#FFFACD': '#000000', // 연노랑
      '#FFEBCD': '#000000', // 아몬드
      '#F5F5F5': '#000000', // 회색
      
      // 어두운 색상들 - 흰 텍스트
      '#FF0000': '#FFFFFF', // 빨강
      '#0000FF': '#FFFFFF', // 파랑
      '#800080': '#FFFFFF', // 보라
      '#008000': '#FFFFFF', // 초록
      '#FF8C00': '#FFFFFF', // 주황
      '#808080': '#FFFFFF', // 회색
      
      // 중간 톤 색상들 - 밝기에 따라 결정
      '#FFA500': '#000000', // 주황 (밝음)
      '#FFFF00': '#000000', // 노랑 (밝음)
      '#00FF00': '#000000', // 초록 (밝음)
      '#00FFFF': '#000000', // 청록 (밝음)
      '#90EE90': '#000000', // 연초록 (밝음)
      '#FFDAB9': '#000000', // 복숭아 (밝음)
      '#98FB98': '#000000', // 연초록 (밝음)
      '#F0E68C': '#000000', // 카키 (밝음)
      '#FF7F50': '#000000', // 연어 (밝음)
      '#40E0D0': '#000000', // 청록 (밝음)
      '#87CEEB': '#000000', // 하늘 (밝음)
      '#DDA0DD': '#000000', // 연보라 (밝음)
      '#FFFFFF': '#000000', // 흰색
    };
    
    // 명시적 매핑이 있으면 사용
    if (colorTextMap[backgroundColor.toUpperCase()]) {
      return colorTextMap[backgroundColor.toUpperCase()];
    }
    
    // 매핑이 없으면 밝기 계산으로 결정
    const hex = backgroundColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    
    // 밝기 기준으로 결정
    return brightness > 140 ? '#000000' : '#FFFFFF';
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.surface }]}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>테마를 불러오는 중...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.surface,
    },
    section: {
      backgroundColor: theme.background,
      borderRadius: 8,
      marginBottom: 16,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.text,
      padding: 16,
      paddingBottom: 8,
    },
    sectionSubtitle: {
      fontSize: 14,
      color: theme.textSecondary,
      paddingHorizontal: 16,
      paddingBottom: 16,
    },
    themeOption: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    selectedThemeOption: {
      backgroundColor: theme.type === 'dark' ? '#2C2C2E' : '#F0F8FF',
    },
    themeOptionText: {
      fontSize: 16,
      color: theme.text,
    },
    selectedThemeOptionText: {
      color: theme.text,
      fontWeight: 'bold',
    },
    loadingText: {
      fontSize: 16,
      color: theme.textSecondary,
    },
    infoText: {
      fontSize: 14,
      color: theme.textSecondary,
      lineHeight: 20,
      marginBottom: 8,
    },
  });

  return (
    <SafeAreaView style={dynamicStyles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={dynamicStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>기본 테마</Text>
          
          <TouchableOpacity
            style={[
              dynamicStyles.themeOption,
              theme.type === 'light' && dynamicStyles.selectedThemeOption
            ]}
            onPress={() => handleThemeChange('light')}
          >
            <View style={[styles.themePreview, { backgroundColor: '#FFFFFF' }]}>
              <View style={[styles.themePreviewBar, { backgroundColor: '#007AFF' }]} />
              <View style={[styles.themePreviewContent, { backgroundColor: '#F2F2F7' }]} />
            </View>
            <Text style={[
              dynamicStyles.themeOptionText,
              theme.type === 'light' && dynamicStyles.selectedThemeOptionText
            ]}>
              라이트
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              dynamicStyles.themeOption,
              theme.type === 'dark' && dynamicStyles.selectedThemeOption
            ]}
            onPress={() => handleThemeChange('dark')}
          >
            <View style={[styles.themePreview, { backgroundColor: '#000000' }]}>
              <View style={[styles.themePreviewBar, { backgroundColor: '#0A84FF' }]} />
              <View style={[styles.themePreviewContent, { backgroundColor: '#1C1C1E' }]} />
            </View>
            <Text style={[
              dynamicStyles.themeOptionText,
              theme.type === 'dark' && dynamicStyles.selectedThemeOptionText
            ]}>
              다크
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              dynamicStyles.themeOption,
              isCustomSelected && dynamicStyles.selectedThemeOption
            ]}
            onPress={() => handleThemeChange('custom')}
          >
            <View style={[styles.themePreview, { backgroundColor: '#FFFFFF' }]}>
              <View style={[styles.themePreviewBar, { backgroundColor: selectedColor }]} />
              <View style={[styles.themePreviewContent, { backgroundColor: '#F2F2F7' }]} />
            </View>
            <Text style={[
              dynamicStyles.themeOptionText,
              isCustomSelected && dynamicStyles.selectedThemeOptionText
            ]}>
              커스텀
            </Text>
          </TouchableOpacity>
        </View>

        {isCustomSelected && (
          <View style={dynamicStyles.section}>
            <Text style={dynamicStyles.sectionTitle}>커스텀 색상</Text>
            <Text style={dynamicStyles.sectionSubtitle}>
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
                  onLongPress={() => handleColorLongPress(color, index)}
                  delayLongPress={500}
                >
                  {selectedColor === color && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <View style={dynamicStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>테마 정보</Text>
          <View style={styles.infoContainer}>
            <Text style={dynamicStyles.infoText}>
              • 라이트 테마: 밝고 깔끔한 화이트 톤
            </Text>
            <Text style={dynamicStyles.infoText}>
              • 다크 테마: 눈의 피로를 줄이는 다크 톤
            </Text>
            <Text style={dynamicStyles.infoText}>
              • 커스텀 테마: 36가지 색상 중 선택 가능
            </Text>
            <Text style={dynamicStyles.infoText}>
              • 테마 변경 시 즉시 적용됩니다.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* 색상 툴팁 모달 */}
      <Modal
        visible={showTooltip}
        transparent={true}
        animationType="fade"
        onRequestClose={hideTooltip}
      >
        <TouchableOpacity 
          style={styles.tooltipOverlay}
          activeOpacity={1}
          onPress={hideTooltip}
        >
          <View style={[styles.tooltip, { backgroundColor: tooltipColor }]}>
            <Text style={[styles.tooltipText, { color: getContrastTextColor(tooltipColor) }]}>
              {tooltipName}
            </Text>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
    padding: 16,
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
  tooltipOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  tooltip: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  tooltipText: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
