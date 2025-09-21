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
} from 'react-native';
import { Diary, MoodType } from '../types';
import DatabaseService from '../services/database/DatabaseService';
import { MOOD_CONFIG, APP_CONFIG } from '../constants';

export default function EditScreen({ navigation, route }: any) {
  const { diaryId } = route.params;
  const [diary, setDiary] = useState<Diary | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [mood, setMood] = useState<MoodType>(3);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDiary();
  }, [diaryId]);

  const loadDiary = async () => {
    try {
      const diaryData = await DatabaseService.getDiary(diaryId);
      if (diaryData) {
        setDiary(diaryData);
        setTitle(diaryData.title);
        setContent(diaryData.content);
        setMood(diaryData.mood);
        setTags(diaryData.tags);
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

  const handleSave = async () => {
    if (!diary) return;

    if (!title.trim() && !content.trim()) {
      Alert.alert('알림', '제목 또는 내용을 입력해주세요.');
      return;
    }

    try {
      await DatabaseService.updateDiary(diaryId, {
        title: title.trim(),
        content: content.trim(),
        mood,
        tags,
        // TODO: 이미지 업데이트 구현
      });

      Alert.alert('성공', '일기가 수정되었습니다.', [
        { text: '확인', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error('일기 수정 실패:', error);
      Alert.alert('오류', '일기 수정에 실패했습니다.');
    }
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
                { text: '확인', onPress: () => navigation.goBack() }
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

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>일기를 불러오는 중...</Text>
      </View>
    );
  }

  if (!diary) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>일기를 찾을 수 없습니다.</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
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
            <TouchableOpacity style={styles.imageButton}>
              <Text style={styles.imageButtonText}>📷 카메라</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.imageButton}>
              <Text style={styles.imageButtonText}>🖼️ 갤러리</Text>
            </TouchableOpacity>
            {diary.images.length > 0 && (
              <TouchableOpacity style={styles.imageButton}>
                <Text style={styles.imageButtonText}>🗑️ 삭제</Text>
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.imageNote}>
            최대 {APP_CONFIG.maxImagesPerDiary}장까지 첨부 가능
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
              placeholder="태그를 입력하세요..."
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

      {/* 버튼들 */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
          <Text style={styles.deleteButtonText}>삭제</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>저장</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
    backgroundColor: '#F2F2F7',
  },
  loadingText: {
    fontSize: 16,
    color: '#8E8E93',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
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
  buttonContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    gap: 12,
  },
  deleteButton: {
    flex: 1,
    backgroundColor: '#FF3B30',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  saveButton: {
    flex: 1,
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
