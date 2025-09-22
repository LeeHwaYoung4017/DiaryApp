import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  Dimensions,
  Modal,
  PanResponder,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Diary } from '../types';
import DatabaseService from '../services/database/DatabaseService';
import { MOOD_CONFIG } from '../constants';
import { MOOD_EMOJIS } from '../types';
import { useTheme } from '../contexts/ThemeContext';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function DiaryDetailScreen({ navigation, route }: any) {
  const { theme } = useTheme();
  const { diaryId } = route.params;

  // 버튼 텍스트 색상을 동적으로 결정하는 함수
  const getButtonTextColor = (backgroundColor: string): string => {
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
      '#4ECDC4': '#000000', // 청록1 (밝음)
      '#40E0D0': '#000000', // 청록2 (밝음)
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
  const [diary, setDiary] = useState<Diary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showImageModal, setShowImageModal] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageScale, setImageScale] = useState(1);
  const [isZoomed, setIsZoomed] = useState(false);
  const [lastTap, setLastTap] = useState(0);

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.surface,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      fontSize: 16,
      color: theme.text,
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    errorText: {
      fontSize: 16,
      color: theme.text,
    },
    scrollView: {
      flex: 1,
    },
    contentContainer: {
      padding: 16,
    },
    section: {
      backgroundColor: theme.background,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: theme.border,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: theme.text,
      marginBottom: 8,
    },
    title: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.text,
      lineHeight: 28,
    },
    content: {
      fontSize: 16,
      color: theme.text,
      lineHeight: 24,
    },
    moodContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    moodEmoji: {
      fontSize: 24,
      marginRight: 8,
    },
    moodText: {
      fontSize: 16,
      color: theme.text,
    },
    tagsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    tag: {
      backgroundColor: theme.primary,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      marginRight: 8,
      marginBottom: 8,
    },
    tagText: {
      color: theme.text,
      fontSize: 14,
    },
    imagesContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    imageContainer: {
      width: 100,
      height: 100,
      marginRight: 8,
      marginBottom: 8,
      borderRadius: 8,
      overflow: 'hidden',
    },
    image: {
      width: '100%',
      height: '100%',
    },
    dateContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    dateText: {
      fontSize: 14,
      color: theme.textSecondary,
    },
    buttonContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      padding: 16,
      backgroundColor: theme.background,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    editButton: {
      flex: 1,
      backgroundColor: theme.primary,
      paddingVertical: 12,
      borderRadius: 8,
      alignItems: 'center',
      marginRight: 8,
    },
    editButtonText: {
      color: getButtonTextColor(theme.primary),
      fontSize: 16,
      fontWeight: 'bold',
    },
    deleteButton: {
      flex: 1,
      backgroundColor: '#FF3B30',
      paddingVertical: 12,
      borderRadius: 8,
      alignItems: 'center',
    },
    deleteButtonText: {
      color: getButtonTextColor('#FF3B30'),
      fontSize: 16,
      fontWeight: 'bold',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalImage: {
      width: screenWidth,
      height: screenHeight,
    },
    modalCloseButton: {
      position: 'absolute',
      top: 50,
      right: 20,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      borderRadius: 20,
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalCloseText: {
      color: '#FFFFFF',
      fontSize: 20,
      fontWeight: 'bold',
    },
  });
  
  // useRef로 최신 상태 값 참조
  const currentImageIndexRef = useRef(currentImageIndex);
  const diaryRef = useRef(diary);
  const isZoomedRef = useRef(isZoomed);
  
  // ref 값들을 최신 상태로 업데이트
  useEffect(() => {
    currentImageIndexRef.current = currentImageIndex;
  }, [currentImageIndex]);
  
  useEffect(() => {
    diaryRef.current = diary;
  }, [diary]);
  
  useEffect(() => {
    isZoomedRef.current = isZoomed;
  }, [isZoomed]);

  // PanResponder for swipe gestures and double tap
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: (evt, gestureState) => {
      return true;
    },
    onMoveShouldSetPanResponder: (evt, gestureState) => {
      // 확대된 상태에서는 스와이프를 무시
      if (isZoomedRef.current) return false;
      return Math.abs(gestureState.dx) > 5;
    },
    onPanResponderGrant: (evt, gestureState) => {
      // 더블탭 감지
      const now = Date.now();
      if (now - lastTap < 300) {
        // 더블탭 감지됨
        handleImageDoublePress();
      }
      setLastTap(now);
    },
    onPanResponderMove: (evt, gestureState) => {
      // Do nothing during move
    },
    onPanResponderRelease: (evt, gestureState) => {
      // 확대된 상태에서는 스와이프를 무시
      if (isZoomedRef.current) return;
      
      if (Math.abs(gestureState.dx) > 20) {
        if (gestureState.dx > 0) {
          // Swipe right - previous image
          handlePrevImage();
        } else {
          // Swipe left - next image
          handleNextImage();
        }
      }
    },
  });

  useEffect(() => {
    loadDiary();
  }, [diaryId]);

  const loadDiary = async () => {
    try {
      const diaryData = await DatabaseService.getDiary(diaryId);
      setDiary(diaryData);
    } catch (error) {
      console.error('일기 로드 실패:', error);
      Alert.alert('오류', '일기를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    navigation.navigate('Edit', { diaryId: diary.id });
  };

  const handleDelete = () => {
    Alert.alert(
      '일기 삭제',
      '정말로 이 일기를 삭제하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              await DatabaseService.deleteDiary(diaryId);
              Alert.alert('성공', '일기가 삭제되었습니다.', [
                { text: '확인', onPress: () => navigation.navigate('Feed') }
              ]);
            } catch (error) {
              console.error('일기 삭제 실패:', error);
              Alert.alert('오류', '일기 삭제에 실패했습니다.');
            }
          }
        }
      ]
    );
  };

  const handleImagePress = (index: number) => {
    setCurrentImageIndex(index);
    setImageScale(1);
    setIsZoomed(false);
    setShowImageModal(true);
  };

  const handleImageDoublePress = useCallback(() => {
    // 더블탭으로 확대/축소 토글
    if (isZoomed) {
      setImageScale(1);
      setIsZoomed(false);
    } else {
      setImageScale(2);
      setIsZoomed(true);
    }
  }, [isZoomed]);

  const handleNextImage = () => {
    const currentIndex = currentImageIndexRef.current;
    const currentDiary = diaryRef.current;
    if (currentDiary && currentDiary.images.length > 1) {
      const nextIndex = currentIndex < currentDiary.images.length - 1 ? currentIndex + 1 : 0;
      setCurrentImageIndex(nextIndex);
    }
  };

  const handlePrevImage = () => {
    const currentIndex = currentImageIndexRef.current;
    const currentDiary = diaryRef.current;
    if (currentDiary && currentDiary.images.length > 1) {
      const prevIndex = currentIndex > 0 ? currentIndex - 1 : currentDiary.images.length - 1;
      setCurrentImageIndex(prevIndex);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={dynamicStyles.container}>
        <View style={dynamicStyles.loadingContainer}>
          <Text style={dynamicStyles.loadingText}>로딩 중...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!diary) {
    return (
      <SafeAreaView style={dynamicStyles.container}>
        <View style={dynamicStyles.errorContainer}>
          <Text style={dynamicStyles.errorText}>일기를 찾을 수 없습니다.</Text>
        </View>
      </SafeAreaView>
    );
  }


  return (
    <SafeAreaView style={dynamicStyles.container}>
      <ScrollView style={dynamicStyles.scrollView} contentContainerStyle={dynamicStyles.contentContainer}>
        {/* 제목 */}
        <View style={dynamicStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>제목</Text>
          <Text style={dynamicStyles.title}>{diary.title || '제목 없음'}</Text>
        </View>

        {/* 내용 */}
        <View style={dynamicStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>내용</Text>
          <Text style={dynamicStyles.content}>{diary.content || '내용 없음'}</Text>
        </View>

        {/* 기분 */}
        {diary.mood !== null && diary.mood !== undefined && (
          <View style={dynamicStyles.section}>
            <Text style={dynamicStyles.sectionTitle}>기분</Text>
            <View style={dynamicStyles.moodContainer}>
              <Text style={dynamicStyles.moodEmoji}>{MOOD_EMOJIS[diary.mood] || '😐'}</Text>
              <Text style={dynamicStyles.moodText}>{MOOD_CONFIG.labels[diary.mood] || MOOD_CONFIG.labels[2]}</Text>
            </View>
          </View>
        )}

        {/* 태그 */}
        {diary.tags && Array.isArray(diary.tags) && diary.tags.length > 0 && (
          <View style={dynamicStyles.section}>
            <Text style={dynamicStyles.sectionTitle}>태그</Text>
            <View style={dynamicStyles.tagsContainer}>
              {diary.tags.map((tag, index) => (
                <View key={index} style={dynamicStyles.tag}>
                  <Text style={dynamicStyles.tagText}>#{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* 이미지 */}
        {diary.images && Array.isArray(diary.images) && diary.images.length > 0 && (
          <View style={dynamicStyles.section}>
            <Text style={dynamicStyles.sectionTitle}>사진</Text>
            <View style={dynamicStyles.imagesContainer}>
              {diary.images.map((image, index) => (
                <TouchableOpacity
                  key={index}
                  style={dynamicStyles.imageContainer}
                  onPress={() => handleImagePress(index)}
                >
                  <Image
                    source={{ uri: image || '' }}
                    style={dynamicStyles.image}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* 메타데이터 */}
        <View style={dynamicStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>작성 정보</Text>
          <Text style={dynamicStyles.dateText}>
            작성일: {new Date(diary.created_at).toLocaleDateString('ko-KR')}
          </Text>
          {diary.updated_at !== diary.created_at && (
            <Text style={dynamicStyles.dateText}>
              수정일: {new Date(diary.updated_at).toLocaleDateString('ko-KR')}
            </Text>
          )}
        </View>

        {/* 하단 여백 */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* 하단 버튼들 */}
      <View style={dynamicStyles.buttonContainer}>
        <TouchableOpacity style={dynamicStyles.deleteButton} onPress={handleDelete}>
          <Text style={dynamicStyles.deleteButtonText}>삭제</Text>
        </TouchableOpacity>
        <TouchableOpacity style={dynamicStyles.editButton} onPress={handleEdit}>
          <Text style={dynamicStyles.editButtonText}>편집</Text>
        </TouchableOpacity>
      </View>

      {/* 이미지 확대 모달 */}
      <Modal
        visible={showImageModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowImageModal(false)}
      >
        <View style={dynamicStyles.modalOverlay}>
          <TouchableOpacity
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            onPress={() => setShowImageModal(false)}
          />
          <View style={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' }}>
            <TouchableOpacity
              style={dynamicStyles.modalCloseButton}
              onPress={() => setShowImageModal(false)}
            >
              <Text style={dynamicStyles.modalCloseText}>✕</Text>
            </TouchableOpacity>
            
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', width: '100%' }}>
              <View
                {...panResponder.panHandlers}
                style={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' }}
              >
                <Image
                  source={{ uri: diary?.images[currentImageIndex] }}
                  style={[
                    dynamicStyles.modalImage,
                    { transform: [{ scale: imageScale }] }
                  ]}
                  resizeMode="contain"
                />
              </View>
              
              {diary && diary.images.length > 1 && (
                <View style={{ position: 'absolute', bottom: 50, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20 }}>
                  <TouchableOpacity
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', borderRadius: 25, width: 50, height: 50, justifyContent: 'center', alignItems: 'center' }}
                    onPress={handlePrevImage}
                  >
                    <Text style={{ color: '#FFFFFF', fontSize: 24, fontWeight: 'bold' }}>‹</Text>
                  </TouchableOpacity>
                  
                  <Text style={{ color: '#FFFFFF', fontSize: 16, backgroundColor: 'rgba(0, 0, 0, 0.5)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15 }}>
                    {currentImageIndex + 1} / {diary.images.length}
                  </Text>
                  
                  <TouchableOpacity
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', borderRadius: 25, width: 50, height: 50, justifyContent: 'center', alignItems: 'center' }}
                    onPress={handleNextImage}
                  >
                    <Text style={{ color: '#FFFFFF', fontSize: 24, fontWeight: 'bold' }}>›</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    lineHeight: 28,
  },
  content: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  moodContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  moodEmoji: {
    fontSize: 24,
    marginRight: 8,
  },
  moodText: {
    fontSize: 16,
    color: '#333',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tag: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    fontSize: 14,
    color: '#666',
  },
  imagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  imageContainer: {
    width: (screenWidth - 60) / 2,
    height: (screenWidth - 60) / 2,
    borderRadius: 8,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageCounter: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  metaText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  bottomSpacer: {
    height: 100,
  },
  bottomButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  deleteButton: {
    flex: 1,
    backgroundColor: '#ff4444',
    paddingVertical: 12,
    borderRadius: 8,
    marginRight: 8,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  editButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 8,
    marginLeft: 8,
    alignItems: 'center',
  },
  editButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // 이미지 모달 스타일
  imageModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalCloseArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  imageModalContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalCloseButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalCloseText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  imageModalContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  imageModalImage: {
    width: screenWidth * 0.9,
    height: screenHeight * 0.9,
  },
  imageTouchable: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalNavigation: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  imageModalNavButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalNavButtonDisabled: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  imageModalNavText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  imageModalCounter: {
    color: '#FFFFFF',
    fontSize: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
});