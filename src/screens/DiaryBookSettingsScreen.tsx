import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DatabaseService from '../services/database/DatabaseService';
import { DiaryBook } from '../types';

export default function DiaryBookSettingsScreen({ navigation, route }: any) {
  const { diaryBookId } = route.params;
  const [diaryBook, setDiaryBook] = useState<DiaryBook | null>(null);
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDiaryBook();
  }, [diaryBookId]);

  const loadDiaryBook = async () => {
    try {
      setLoading(true);
      const books = await DatabaseService.getDiaryBooks();
      const book = books.find(b => b.id === diaryBookId);
      if (book) {
        setDiaryBook(book);
        setNewName(book.name);
      }
    } catch (error) {
      console.error('일기장 로드 실패:', error);
      Alert.alert('오류', '일기장을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!diaryBook || !newName.trim()) {
      Alert.alert('알림', '일기장 이름을 입력해주세요.');
      return;
    }

    if (newName.trim() === diaryBook.name) {
      Alert.alert('알림', '변경된 내용이 없습니다.');
      return;
    }

    try {
      await DatabaseService.updateDiaryBook(diaryBook.id, newName.trim());
      Alert.alert('성공', '일기장 이름이 변경되었습니다.', [
        { text: '확인', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error('일기장 이름 변경 실패:', error);
      Alert.alert('오류', '일기장 이름 변경에 실패했습니다.');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>일기장을 불러오는 중...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!diaryBook) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>일기장을 찾을 수 없습니다.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.label}>일기장 이름</Text>
          <TextInput
            style={styles.input}
            value={newName}
            onChangeText={setNewName}
            placeholder="일기장 이름을 입력하세요"
            maxLength={50}
          />
          <Text style={styles.charCount}>
            {newName.length}/50
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>일기장 정보</Text>
          <View style={styles.infoContainer}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>생성일:</Text>
              <Text style={styles.infoValue}>
                {new Date(diaryBook.created_at).toLocaleDateString('ko-KR')}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>수정일:</Text>
              <Text style={styles.infoValue}>
                {new Date(diaryBook.updated_at).toLocaleDateString('ko-KR')}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>타입:</Text>
              <Text style={styles.infoValue}>
                {diaryBook.is_default ? '기본 일기장' : '사용자 일기장'}
              </Text>
            </View>
          </View>
        </View>

        {diaryBook.is_default && (
          <View style={styles.warningContainer}>
            <Text style={styles.warningText}>
              ⚠️ 기본 일기장의 이름을 변경할 수 있습니다.
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>저장</Text>
        </TouchableOpacity>
      </View>
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
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
  },
  charCount: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'right',
    marginTop: 4,
  },
  infoContainer: {
    marginTop: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  infoLabel: {
    fontSize: 14,
    color: '#8E8E93',
  },
  infoValue: {
    fontSize: 14,
    color: '#000000',
    fontWeight: '500',
  },
  warningContainer: {
    backgroundColor: '#FFF3CD',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  warningText: {
    fontSize: 14,
    color: '#856404',
  },
  buttonContainer: {
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
