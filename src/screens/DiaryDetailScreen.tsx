import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Diary } from '../types';
import DatabaseService from '../services/database/DatabaseService';
import { MOOD_CONFIG } from '../constants';


export default function DiaryDetailScreen({ navigation, route }: any) {
  const { diaryId } = route.params;
  const [diary, setDiary] = useState<Diary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showImageModal, setShowImageModal] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    loadDiary();
  }, [diaryId]);

  const loadDiary = async () => {
    try {
      setLoading(true);
      const diaryData = await DatabaseService.getDiary(diaryId);
      if (diaryData) {
        setDiary(diaryData);
      } else {
        Alert.alert('오류', '일기를 찾을 수 없습니다.', [
          { text: '확인', onPress: () => navigation.goBack() }
        ]);
      }
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
    setShowImageModal(true);
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hour = date.getHours();
    const minute = date.getMinutes();
    const weekday = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];
    
    const period = hour < 12 ? '오전' : '오후';
    const displayHour = hour > 12 ? hour - 12 : hour;

    return `${year}년 ${month}월 ${day}일 ${period} ${displayHour}:${minute.toString().padStart(2, '0')} ${weekday}`;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>일기를 불러오는 중...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!diary) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>일기를 찾을 수 없습니다.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* 헤더 */}
        <View style={styles.header}>
          <View style={styles.dateContainer}>
            <Text style={styles.dateText}>{formatDate(diary.created_at)}</Text>
            <View style={styles.moodContainer}>
              <Text style={styles.moodEmoji}>{MOOD_CONFIG.emojis[diary.mood]}</Text>
              <Text style={styles.moodText}>{MOOD_CONFIG.labels[diary.mood]}</Text>
            </View>
          </View>
        </View>

        {/* 제목 */}
        {diary.title && (
          <View style={styles.titleSection}>
            <Text style={styles.sectionTitle}>제목</Text>
            <Text style={styles.titleText}>{diary.title}</Text>
          </View>
        )}

        {/* 내용 */}
        <View style={styles.contentSection}>
          <Text style={styles.sectionTitle}>내용</Text>
          <Text style={styles.contentText}>{diary.content}</Text>
        </View>

        {/* 이미지 */}
        {diary.images.length > 0 && (
          <View style={styles.imageSection}>
            <Text style={styles.sectionTitle}>사진</Text>
            <View style={styles.imageGrid}>
              {diary.images.map((imageUri, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.imageContainer}
                  onPress={() => handleImagePress(index)}
                >
                  <Image 
                    source={{ uri: imageUri }} 
                    style={styles.image}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* 태그 */}
        {diary.tags.length > 0 && (
          <View style={styles.tagSection}>
            <Text style={styles.sectionTitle}>태그</Text>
            <View style={styles.tagContainer}>
              {diary.tags.map((tag, index) => (
                <View key={index} style={styles.tagItem}>
                  <Text style={styles.tagText}>#{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* 메타데이터 */}
        <View style={styles.metadataSection}>
          <View style={styles.metadataItem}>
            <Text style={styles.metadataLabel}>작성일:</Text>
            <Text style={styles.metadataValue}>{formatDate(diary.created_at)}</Text>
          </View>
          {diary.updated_at !== diary.created_at && (
            <View style={styles.metadataItem}>
              <Text style={styles.metadataLabel}>수정일:</Text>
              <Text style={styles.metadataValue}>{formatDate(diary.updated_at)}</Text>
            </View>
          )}
          {diary.pinned && (
            <View style={styles.metadataItem}>
              <Text style={styles.metadataLabel}>상태:</Text>
              <Text style={styles.metadataValue}>📌 고정됨</Text>
            </View>
          )}
        </View>
        
        {/* 하단 버튼 공간 확보 */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* 하단 버튼 */}
      <View style={styles.bottomButtons}>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDelete}
        >
          <Text style={styles.deleteButtonText}>삭제</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.editButton}
          onPress={handleEdit}
        >
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
              <Image
                source={{ uri: diary?.images[currentImageIndex] }}
                style={styles.imageModalImage}
                resizeMode="contain"
              />
              
              {diary && diary.images.length > 1 && (
                <View style={styles.imageModalNavigation}>
                  <TouchableOpacity
                    style={[
                      styles.imageModalNavButton,
                      currentImageIndex === 0 && styles.imageModalNavButtonDisabled
                    ]}
                    onPress={() => {
                      if (currentImageIndex > 0) {
                        setCurrentImageIndex(currentImageIndex - 1);
                      }
                    }}
                    disabled={currentImageIndex === 0}
                  >
                    <Text style={styles.imageModalNavText}>‹</Text>
                  </TouchableOpacity>
                  
                  <Text style={styles.imageModalCounter}>
                    {currentImageIndex + 1} / {diary.images.length}
                  </Text>
                  
                  <TouchableOpacity
                    style={[
                      styles.imageModalNavButton,
                      currentImageIndex === diary.images.length - 1 && styles.imageModalNavButtonDisabled
                    ]}
                    onPress={() => {
                      if (currentImageIndex < diary.images.length - 1) {
                        setCurrentImageIndex(currentImageIndex + 1);
                      }
                    }}
                    disabled={currentImageIndex === diary.images.length - 1}
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  header: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  dateContainer: {
    alignItems: 'center',
  },
  dateText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 12,
  },
  moodContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F8FF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  moodEmoji: {
    fontSize: 24,
    marginRight: 8,
  },
  moodText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  titleSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  titleText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
    lineHeight: 28,
  },
  contentSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  contentText: {
    fontSize: 16,
    color: '#000000',
    lineHeight: 24,
  },
  imageSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 12,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  imageContainer: {
    width: (Dimensions.get('window').width - 80) / 2,
    height: (Dimensions.get('window').width - 80) / 2,
    borderRadius: 8,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  tagSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagItem: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagText: {
    fontSize: 14,
    color: '#1976D2',
    fontWeight: '500',
  },
  metadataSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 100, // 하단 버튼 공간 확보
  },
  metadataItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  metadataLabel: {
    fontSize: 14,
    color: '#8E8E93',
  },
  metadataValue: {
    fontSize: 14,
    color: '#000000',
    fontWeight: '500',
  },
  bottomSpacer: {
    height: 100, // 하단 버튼 공간 확보
  },
  bottomButtons: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  deleteButton: {
    flex: 1,
    backgroundColor: '#FF3B30',
    borderRadius: 8,
    padding: 16,
    marginRight: 8,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  editButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    marginLeft: 8,
    alignItems: 'center',
  },
  editButtonText: {
    color: '#FFFFFF',
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
    width: Dimensions.get('window').width - 40,
    height: Dimensions.get('window').width - 40,
    maxHeight: '80%',
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
