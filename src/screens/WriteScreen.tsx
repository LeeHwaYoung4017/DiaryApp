import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Diary, MoodType } from '../types';
import DatabaseService from '../services/database/DatabaseService';
import { MOOD_CONFIG, APP_CONFIG } from '../constants';

export default function WriteScreen({ navigation }: any) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [mood, setMood] = useState<MoodType>(3);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [images, setImages] = useState<string[]>([]);

  // 이미지 선택 함수들
  const pickImageFromCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('권한 필요', '카메라 권한이 필요합니다.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setImages(prev => [...prev, result.assets[0].uri]);
      }
    } catch (error) {
      console.error('카메라 오류:', error);
      Alert.alert('오류', '카메라를 사용할 수 없습니다.');
    }
  };

  const pickImageFromGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('권한 필요', '갤러리 권한이 필요합니다.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
        allowsMultipleSelection: true,
      });

      if (!result.canceled && result.assets) {
        const newImages = result.assets.map(asset => asset.uri);
        setImages(prev => [...prev, ...newImages]);
      }
    } catch (error) {
      console.error('갤러리 오류:', error);
      Alert.alert('오류', '갤러리를 사용할 수 없습니다.');
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };


  const handleSave = async () => {
    if (!title.trim() && !content.trim()) {
      Alert.alert('알림', '제목 또는 내용을 입력해주세요.');
      return;
    }

    // 일기장별 1일 1회 작성 제한 확인
    try {
      const currentDiaryBookId = await DatabaseService.getCurrentDiaryBookId();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      // 오늘 날짜 범위로 일기 검색
      const todayStart = today.getTime();
      const todayEnd = tomorrow.getTime();
      
      const existingDiaries = await DatabaseService.getDiaries(1000, 0, currentDiaryBookId);
      const todayDiary = existingDiaries.find(diary => {
        const diaryTime = diary.created_at;
        return diaryTime >= todayStart && diaryTime < todayEnd;
      });
      
      if (todayDiary) {
        Alert.alert(
          '알림', 
          '오늘은 이미 일기를 작성하셨습니다.\n기존 일기를 수정하시겠습니까?',
          [
            { text: '취소', style: 'cancel' },
            { text: '수정', onPress: () => navigation.navigate('Edit', { diaryId: todayDiary.id }) }
          ]
        );
        return;
      }
    } catch (error) {
      console.error('일기 중복 확인 실패:', error);
    }

    try {
      const diaryData: Omit<Diary, 'id' | 'created_at' | 'updated_at'> = {
        title: title.trim(),
        content: content.trim(),
        mood,
        pinned: false,
        is_encrypted: false,
        tags,
        images,
        metadata: {},
      };

      await DatabaseService.createDiary(diaryData);
      Alert.alert('성공', '일기가 저장되었습니다.', [
        { text: '확인', onPress: () => navigation.navigate('Feed') }
      ]);
    } catch (error) {
      console.error('일기 저장 실패:', error);
      Alert.alert('오류', '일기 저장에 실패했습니다.');
    }
  };

  const addTag = () => {
    if (tagInput.trim()) {
      // 쉼표로 구분된 태그들을 분리
      const newTags = tagInput.split(',').map(tag => tag.trim()).filter(tag => tag && !tags.includes(tag));
      if (newTags.length > 0) {
        setTags([...tags, ...newTags]);
        setTagInput('');
      }
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* 제목 입력 */}
        <View style={styles.section}>
          <Text style={styles.label}>제목</Text>
          <TextInput
            style={styles.titleInput}
            value={title}
            onChangeText={setTitle}
            placeholder="제목을 입력하세요..."
            maxLength={APP_CONFIG.maxTitleLength}
            multiline={false}
          />
          <Text style={styles.charCount}>
            {title.length}/{APP_CONFIG.maxTitleLength}
          </Text>
        </View>

        {/* 기분 선택 */}
        <View style={styles.section}>
          <Text style={styles.label}>기분</Text>
          <View style={styles.moodContainer}>
            {Object.entries(MOOD_CONFIG.emojis).map(([moodValue, emoji]) => (
              <TouchableOpacity
                key={moodValue}
                style={[
                  styles.moodButton,
                  mood === parseInt(moodValue) && styles.selectedMoodButton
                ]}
                onPress={() => setMood(parseInt(moodValue) as MoodType)}
              >
                <Text style={styles.moodEmoji}>{emoji}</Text>
                <Text style={[
                  styles.moodLabel,
                  mood === parseInt(moodValue) && styles.selectedMoodLabel
                ]}>
                  {MOOD_CONFIG.labels[parseInt(moodValue) as MoodType]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 본문 입력 */}
        <View style={styles.section}>
          <Text style={styles.label}>본문</Text>
          <TextInput
            style={styles.contentInput}
            value={content}
            onChangeText={setContent}
            placeholder="오늘 하루는 어떠셨나요?"
            multiline={true}
            textAlignVertical="top"
            maxLength={APP_CONFIG.maxContentLength}
          />
          <Text style={styles.charCount}>
            {content.length}/{APP_CONFIG.maxContentLength}
          </Text>
        </View>

        {/* 사진 첨부 */}
        <View style={styles.section}>
          <Text style={styles.label}>사진</Text>
          <View style={styles.imageContainer}>
            <TouchableOpacity 
              style={styles.imageButton}
              onPress={pickImageFromCamera}
            >
              <Text style={styles.imageButtonText}>📷 카메라</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.imageButton}
              onPress={pickImageFromGallery}
            >
              <Text style={styles.imageButtonText}>🖼️ 갤러리</Text>
            </TouchableOpacity>
          </View>
          
          {/* 이미지 미리보기 */}
          {images.length > 0 && (
            <View style={styles.imagePreviewContainer}>
              {images.map((imageUri, index) => (
                <View key={index} style={styles.imagePreviewItem}>
                  <Image source={{ uri: imageUri }} style={styles.imagePreview} />
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => removeImage(index)}
                  >
                    <Text style={styles.removeImageText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
          
          <Text style={styles.imageNote}>
            최대 {APP_CONFIG.maxImagesPerDiary}장까지 첨부 가능 ({images.length}/{APP_CONFIG.maxImagesPerDiary})
          </Text>
        </View>

        {/* 태그 입력 */}
        <View style={styles.section}>
          <Text style={styles.label}>태그</Text>
          <View style={styles.tagInputContainer}>
            <TextInput
              style={styles.tagInput}
              value={tagInput}
              onChangeText={setTagInput}
              placeholder="태그를 입력하세요 (쉼표로 구분)"
              onSubmitEditing={addTag}
              returnKeyType="done"
            />
            <TouchableOpacity style={styles.addTagButton} onPress={addTag}>
              <Text style={styles.addTagButtonText}>추가</Text>
            </TouchableOpacity>
          </View>
          {tags.length > 0 && (
            <View style={styles.tagsContainer}>
              {tags.map((tag, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.tag}
                  onPress={() => removeTag(tag)}
                >
                  <Text style={styles.tagText}>#{tag}</Text>
                  <Text style={styles.removeTagText}>×</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>


      {/* 저장 버튼 */}
      <View style={styles.saveButtonContainer}>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>저장</Text>
        </TouchableOpacity>
      </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 8,
  },
  titleInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  contentInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 200,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  charCount: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'right',
    marginTop: 4,
  },
  moodContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  moodButton: {
    width: '30%',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  selectedMoodButton: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F8FF',
  },
  moodEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  moodLabel: {
    fontSize: 12,
    color: '#8E8E93',
  },
  selectedMoodLabel: {
    color: '#007AFF',
    fontWeight: 'bold',
  },
  imageContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  imageButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  imageButtonText: {
    fontSize: 16,
    color: '#007AFF',
  },
  imageNote: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 8,
  },
  imagePreviewContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
  },
  imagePreviewItem: {
    position: 'relative',
    marginRight: 8,
    marginBottom: 8,
  },
  imagePreview: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeImageText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  tagInputContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  tagInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  addTagButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: 'center',
  },
  addTagButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E5E5E5',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    fontSize: 14,
    color: '#000000',
    marginRight: 4,
  },
  removeTagText: {
    fontSize: 16,
    color: '#8E8E93',
    fontWeight: 'bold',
  },
  saveButtonContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
