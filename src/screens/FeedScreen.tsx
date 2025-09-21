import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Diary, DiaryBook } from '../types';
import DatabaseService from '../services/database/DatabaseService';
import { MOOD_CONFIG, DATE_FILTER_CONFIG } from '../constants';

export default function FeedScreen({ navigation }: any) {
  const [diaries, setDiaries] = useState<Diary[]>([]);
  const [diaryBooks, setDiaryBooks] = useState<DiaryBook[]>([]);
  const [currentDiaryBook, setCurrentDiaryBook] = useState<DiaryBook | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [selectedDateFilter, setSelectedDateFilter] = useState<'7days' | '15days' | '30days' | '60days' | '90days' | 'custom'>('30days');
  const [showNewDiaryBook, setShowNewDiaryBook] = useState(false);
  const [newDiaryBookName, setNewDiaryBookName] = useState('');

  useEffect(() => {
    loadDiaryBooks();
    loadDiaries();
  }, []);

  useEffect(() => {
    if (currentDiaryBook) {
      loadDiaries();
    }
  }, [currentDiaryBook]);

  const loadDiaryBooks = async () => {
    try {
      const books = await DatabaseService.getDiaryBooks();
      setDiaryBooks(books);
      
      const currentId = await DatabaseService.getCurrentDiaryBookId();
      const current = books.find(book => book.id === currentId);
      setCurrentDiaryBook(current || books[0]);
    } catch (error) {
      console.error('일기장 로드 실패:', error);
    }
  };

  const loadDiaries = async () => {
    if (!currentDiaryBook) return;
    
    try {
      setLoading(true);
      const data = await DatabaseService.getDiaries(30, 0, currentDiaryBook.id);
      setDiaries(data);
    } catch (error) {
      console.error('일기 로드 실패:', error);
      Alert.alert('오류', '일기를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const createNewDiaryBook = async () => {
    if (!newDiaryBookName.trim()) {
      Alert.alert('알림', '일기장 이름을 입력해주세요.');
      return;
    }

    try {
      const newId = await DatabaseService.createDiaryBook(newDiaryBookName.trim());
      await loadDiaryBooks();
      setNewDiaryBookName('');
      setShowNewDiaryBook(false);
      Alert.alert('성공', '새 일기장이 생성되었습니다.');
    } catch (error) {
      console.error('일기장 생성 실패:', error);
      Alert.alert('오류', '일기장 생성에 실패했습니다.');
    }
  };

  const switchDiaryBook = async (diaryBook: DiaryBook) => {
    try {
      await DatabaseService.setCurrentDiaryBookId(diaryBook.id);
      setCurrentDiaryBook(diaryBook);
      setShowSettings(false);
    } catch (error) {
      console.error('일기장 변경 실패:', error);
      Alert.alert('오류', '일기장 변경에 실패했습니다.');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDiaries();
    setRefreshing(false);
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 30) {
      return `${date.getDate()}일 (${['일', '월', '화', '수', '목', '금', '토'][date.getDay()]})`;
    } else {
      return `${date.getMonth() + 1}/${date.getDate()} (${['일', '월', '화', '수', '목', '금', '토'][date.getDay()]})`;
    }
  };

  const formatFullDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hour = date.getHours();
    const minute = date.getMinutes();
    const weekdays = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
    const weekday = weekdays[date.getDay()];
    const period = hour < 12 ? '오전' : '오후';
    const displayHour = hour > 12 ? hour - 12 : hour;

    return `${year}년 ${month}월 ${day}일 ${period} ${displayHour}:${minute.toString().padStart(2, '0')} ${weekday}`;
  };

  const renderDiaryItem = ({ item }: { item: Diary }) => (
    <TouchableOpacity
      style={styles.diaryItem}
      onPress={() => navigation.navigate('Edit', { diaryId: item.id })}
    >
      <View style={styles.diaryContent}>
        <View style={styles.dateSection}>
          <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
        </View>
        
        <View style={styles.contentSection}>
          <View style={styles.headerRow}>
            <Text style={styles.fullDateText}>{formatFullDate(item.created_at)}</Text>
            <Text style={styles.moodEmoji}>{MOOD_CONFIG.emojis[item.mood]}</Text>
          </View>
          
          <Text style={styles.titleText} numberOfLines={1}>
            {item.title || item.content.substring(0, 30) + '...'}
          </Text>
        </View>
        
        <View style={styles.imageSection}>
          {item.images.length > 0 ? (
            <Text style={styles.imageIcon}>📷</Text>
          ) : (
            <Text style={styles.defaultIcon}>📒</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* 최상단 바 */}
      <View style={styles.topBar}>
        <Text style={styles.appTitle}>{currentDiaryBook?.name || '일기장'}</Text>
        <View style={styles.topBarButtons}>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('Write')}
          >
            <Text style={styles.addButtonText}>✚</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => setShowSettings(true)}
          >
            <Text style={styles.settingsButtonText}>☰</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 기간 필터 + 검색 */}
      <View style={styles.filterBar}>
        <TouchableOpacity 
          style={styles.dateFilterButton}
          onPress={() => setShowDateFilter(true)}
        >
          <Text style={styles.dateFilterText}>
            {DATE_FILTER_CONFIG[selectedDateFilter].label}
          </Text>
          <Text style={styles.dateFilterArrow}>▼</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.searchButton}
          onPress={() => navigation.navigate('Search')}
        >
          <Text style={styles.searchButtonText}>🔍</Text>
        </TouchableOpacity>
      </View>

      {/* 피드 목록 */}
      <FlatList
        data={diaries}
        renderItem={renderDiaryItem}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />

      {/* 설정 슬라이드 메뉴 */}
      <Modal
        visible={showSettings}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowSettings(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalBackdrop}
            onPress={() => setShowSettings(false)}
          />
          <View style={styles.settingsMenu}>
            <View style={styles.settingsHeader}>
              <Text style={styles.settingsTitle}>일기장 설정</Text>
              <TouchableOpacity onPress={() => setShowSettings(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.settingsContent}>
              <Text style={styles.sectionTitle}>일기장 선택</Text>
              {diaryBooks.map((book) => (
                <TouchableOpacity
                  key={book.id}
                  style={[
                    styles.diaryBookItem,
                    currentDiaryBook?.id === book.id && styles.selectedDiaryBook
                  ]}
                  onPress={() => switchDiaryBook(book)}
                >
                  <Text style={[
                    styles.diaryBookName,
                    currentDiaryBook?.id === book.id && styles.selectedDiaryBookName
                  ]}>
                    {book.name}
                  </Text>
                  {book.is_default && (
                    <Text style={styles.defaultLabel}>기본</Text>
                  )}
                </TouchableOpacity>
              ))}
              
              <TouchableOpacity
                style={styles.addDiaryBookButton}
                onPress={() => setShowNewDiaryBook(true)}
              >
                <Text style={styles.addDiaryBookText}>+ 새 일기장 추가</Text>
              </TouchableOpacity>

              <Text style={styles.sectionTitle}>일기장 설정</Text>
              
              <TouchableOpacity
                style={styles.settingItem}
                onPress={() => {
                  setShowSettings(false);
                  navigation.navigate('DiaryBookSettings', { diaryBookId: currentDiaryBook?.id });
                }}
              >
                <Text style={styles.settingItemText}>📝 일기제목 변경</Text>
                <Text style={styles.settingItemArrow}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.settingItem}
                onPress={() => {
                  setShowSettings(false);
                  navigation.navigate('SecuritySettings');
                }}
              >
                <Text style={styles.settingItemText}>🔒 암호설정</Text>
                <Text style={styles.settingItemArrow}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.settingItem}
                onPress={() => {
                  setShowSettings(false);
                  navigation.navigate('ThemeSettings');
                }}
              >
                <Text style={styles.settingItemText}>🎨 테마선택</Text>
                <Text style={styles.settingItemArrow}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.settingItem}
                onPress={() => {
                  setShowSettings(false);
                  navigation.navigate('GoogleDriveSettings');
                }}
              >
                <Text style={styles.settingItemText}>☁️ 구글드라이브 연동</Text>
                <Text style={styles.settingItemArrow}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.settingItem}
                onPress={() => {
                  setShowSettings(false);
                  navigation.navigate('Chart');
                }}
              >
                <Text style={styles.settingItemText}>📊 기분차트</Text>
                <Text style={styles.settingItemArrow}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.settingItem}
                onPress={() => {
                  setShowSettings(false);
                  navigation.navigate('LanguageSettings');
                }}
              >
                <Text style={styles.settingItemText}>🌐 언어선택</Text>
                <Text style={styles.settingItemArrow}>›</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 새 일기장 추가 모달 */}
      <Modal
        visible={showNewDiaryBook}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowNewDiaryBook(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.newDiaryBookModal}>
            <Text style={styles.modalTitle}>새 일기장 추가</Text>
            <TextInput
              style={styles.modalInput}
              value={newDiaryBookName}
              onChangeText={setNewDiaryBookName}
              placeholder="일기장 이름을 입력하세요"
              autoFocus={true}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setShowNewDiaryBook(false)}
              >
                <Text style={styles.modalButtonText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.primaryButton]}
                onPress={createNewDiaryBook}
              >
                <Text style={[styles.modalButtonText, styles.primaryButtonText]}>추가</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 날짜 필터 모달 */}
      <Modal
        visible={showDateFilter}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDateFilter(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.dateFilterModal}>
            <Text style={styles.modalTitle}>기간 선택</Text>
            {Object.entries(DATE_FILTER_CONFIG).map(([key, config]) => (
              <TouchableOpacity
                key={key}
                style={[
                  styles.dateFilterOption,
                  selectedDateFilter === key && styles.selectedDateFilterOption
                ]}
                onPress={() => {
                  setSelectedDateFilter(key as any);
                  setShowDateFilter(false);
                }}
              >
                <Text style={[
                  styles.dateFilterOptionText,
                  selectedDateFilter === key && styles.selectedDateFilterOptionText
                ]}>
                  {config.label}
                </Text>
              </TouchableOpacity>
            ))}
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
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  appTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
  },
  topBarButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  addButtonText: {
    color: '#007AFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  settingsButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsButtonText: {
    fontSize: 18,
    color: '#000000',
  },
  filterBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  dateFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
  },
  dateFilterText: {
    fontSize: 14,
    color: '#007AFF',
    marginRight: 4,
  },
  dateFilterArrow: {
    fontSize: 12,
    color: '#007AFF',
  },
  searchButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonText: {
    fontSize: 18,
  },
  listContainer: {
    padding: 16,
  },
  diaryItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginBottom: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  diaryContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateSection: {
    width: 60,
    alignItems: 'center',
  },
  dateText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  contentSection: {
    flex: 1,
    marginLeft: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  fullDateText: {
    fontSize: 12,
    color: '#8E8E93',
  },
  moodEmoji: {
    fontSize: 16,
  },
  titleText: {
    fontSize: 16,
    color: '#000000',
    fontWeight: '500',
  },
  imageSection: {
    width: 40,
    alignItems: 'center',
  },
  imageIcon: {
    fontSize: 20,
  },
  defaultIcon: {
    fontSize: 20,
    opacity: 0.3,
  },
  // 모달 스타일
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  settingsMenu: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: '70%',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: {
      width: -2,
      height: 0,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  settingsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  settingsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
  },
  closeButton: {
    fontSize: 20,
    color: '#8E8E93',
  },
  settingsContent: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 12,
  },
  diaryBookItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#F2F2F7',
  },
  selectedDiaryBook: {
    backgroundColor: '#E3F2FD',
  },
  diaryBookName: {
    fontSize: 16,
    color: '#000000',
  },
  selectedDiaryBookName: {
    color: '#007AFF',
    fontWeight: 'bold',
  },
  defaultLabel: {
    fontSize: 12,
    color: '#8E8E93',
    backgroundColor: '#E5E5E5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  addDiaryBookButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    marginTop: 16,
  },
  addDiaryBookText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  newDiaryBookModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxWidth: 300,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  modalButtonText: {
    fontSize: 16,
    color: '#000000',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  dateFilterModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxWidth: 300,
  },
  dateFilterOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#F2F2F7',
  },
  selectedDateFilterOption: {
    backgroundColor: '#E3F2FD',
  },
  dateFilterOptionText: {
    fontSize: 16,
    color: '#000000',
    textAlign: 'center',
  },
  selectedDateFilterOptionText: {
    color: '#007AFF',
    fontWeight: 'bold',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#F2F2F7',
  },
  settingItemText: {
    fontSize: 16,
    color: '#000000',
  },
  settingItemArrow: {
    fontSize: 18,
    color: '#C6C6C8',
  },
});
