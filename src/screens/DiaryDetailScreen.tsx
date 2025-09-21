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

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function DiaryDetailScreen({ navigation, route }: any) {
  const { diaryId } = route.params;
  const [diary, setDiary] = useState<Diary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showImageModal, setShowImageModal] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageScale, setImageScale] = useState(1);
  const [isZoomed, setIsZoomed] = useState(false);
  const [lastTap, setLastTap] = useState(0);
  
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
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>로딩 중...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!diary) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text>일기를 찾을 수 없습니다.</Text>
        </View>
      </SafeAreaView>
    );
  }


  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
        {/* 제목 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>제목</Text>
          <Text style={styles.title}>{diary.title || '제목 없음'}</Text>
        </View>

        {/* 내용 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>내용</Text>
          <Text style={styles.content}>{diary.content || '내용 없음'}</Text>
        </View>

        {/* 기분 */}
        {diary.mood !== null && diary.mood !== undefined && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>기분</Text>
            <View style={styles.moodContainer}>
              <Text style={styles.moodEmoji}>{MOOD_EMOJIS[diary.mood] || '😐'}</Text>
              <Text style={styles.moodText}>{MOOD_CONFIG.labels[diary.mood] || MOOD_CONFIG.labels[2]}</Text>
            </View>
          </View>
        )}

        {/* 태그 */}
        {diary.tags && Array.isArray(diary.tags) && diary.tags.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>태그</Text>
            <View style={styles.tagsContainer}>
              {diary.tags.map((tag, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>#{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* 이미지 */}
        {diary.images && Array.isArray(diary.images) && diary.images.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>사진</Text>
            <View style={styles.imagesContainer}>
              {diary.images.map((image, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.imageContainer}
                  onPress={() => handleImagePress(index)}
                >
                  <Image
                    source={{ uri: image || '' }}
                    style={styles.image}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* 메타데이터 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>작성 정보</Text>
          <Text style={styles.metaText}>
            작성일: {new Date(diary.created_at).toLocaleDateString('ko-KR')}
          </Text>
          {diary.updated_at !== diary.created_at && (
            <Text style={styles.metaText}>
              수정일: {new Date(diary.updated_at).toLocaleDateString('ko-KR')}
            </Text>
          )}
        </View>

        {/* 하단 여백 */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* 하단 버튼들 */}
      <View style={styles.bottomButtons}>
        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
          <Text style={styles.deleteButtonText}>삭제</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.editButton} onPress={handleEdit}>
          <Text style={styles.editButtonText}>편집</Text>
        </TouchableOpacity>
      </View>

      {/* 이미지 확대 모달 */}
      <Modal
        visible={showImageModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowImageModal(false)}
      >
        <View style={styles.imageModalOverlay}>
          <TouchableOpacity
            style={styles.imageModalCloseArea}
            onPress={() => setShowImageModal(false)}
          />
          <View style={styles.imageModalContainer}>
            <TouchableOpacity
              style={styles.imageModalCloseButton}
              onPress={() => setShowImageModal(false)}
            >
              <Text style={styles.imageModalCloseText}>✕</Text>
            </TouchableOpacity>
            
            <View style={styles.imageModalContent}>
              <View
                {...panResponder.panHandlers}
                style={styles.imageTouchable}
              >
                <Image
                  source={{ uri: diary?.images[currentImageIndex] }}
                  style={[
                    styles.imageModalImage,
                    { transform: [{ scale: imageScale }] }
                  ]}
                  resizeMode="contain"
                />
              </View>
              
              {diary && diary.images.length > 1 && (
                <View style={styles.imageModalNavigation}>
                  <TouchableOpacity
                    style={styles.imageModalNavButton}
                    onPress={handlePrevImage}
                  >
                    <Text style={styles.imageModalNavText}>‹</Text>
                  </TouchableOpacity>
                  
                  <Text style={styles.imageModalCounter}>
                    {currentImageIndex + 1} / {diary.images.length}
                  </Text>
                  
                  <TouchableOpacity
                    style={styles.imageModalNavButton}
                    onPress={handleNextImage}
                  >
                    <Text style={styles.imageModalNavText}>›</Text>
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