import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Image,
  Dimensions,
  PanResponder,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Diary, DiaryBook } from '../types';
import DatabaseService from '../services/database/DatabaseService';
import { MOOD_CONFIG, DATE_FILTER_CONFIG } from '../constants';
import { MOOD_EMOJIS } from '../types';
import { useTheme } from '../contexts/ThemeContext';

// 헤더 텍스트 색상 결정 함수
const getHeaderTextColor = (customColor: string): string => {
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
  if (colorTextMap[customColor.toUpperCase()]) {
    return colorTextMap[customColor.toUpperCase()];
  }
  
  // 매핑이 없으면 밝기 계산으로 결정
  const hex = customColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  
  // 밝기 기준으로 결정
  return brightness > 140 ? '#000000' : '#FFFFFF';
};

export default function FeedScreen({ navigation }: any) {
  const { theme } = useTheme();
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
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
  const [customStartDate, setCustomStartDate] = useState<Date | null>(null);
  const [customEndDate, setCustomEndDate] = useState<Date | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageScale, setImageScale] = useState(1);
  const [isZoomed, setIsZoomed] = useState(false);
  const [lastTap, setLastTap] = useState(0);
  
  // useRef로 최신 상태 값 참조
  const currentImageIndexRef = useRef(currentImageIndex);
  const selectedImagesRef = useRef(selectedImages);
  const isZoomedRef = useRef(isZoomed);
  
  // ref 값들을 최신 상태로 업데이트
  useEffect(() => {
    currentImageIndexRef.current = currentImageIndex;
  }, [currentImageIndex]);
  
  useEffect(() => {
    selectedImagesRef.current = selectedImages;
  }, [selectedImages]);
  
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
      console.log('PanResponder Grant, time diff:', now - lastTap);
      if (now - lastTap < 300) {
        // 더블탭 감지됨
        console.log('Double tap detected!');
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

  // 날짜 포맷팅 함수
  const formatDiaryDate = (date: Date) => {
    if (!date || isNaN(date.getTime())) {
      return {
        day: '날짜 오류',
        dayOfWeek: '?',
        isWeekend: false,
        isSunday: false,
        isSaturday: false
      };
    }
    
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // 30일 이내면 "21일 (일)" 형식
    if (diffDays <= 30) {
      const day = date.getDate();
      const dayOfWeek = date.getDay();
      const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
      
      return {
        day: day.toString(),
        dayOfWeek: dayNames[dayOfWeek],
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6, // 일요일(0) 또는 토요일(6)
        isSunday: dayOfWeek === 0,
        isSaturday: dayOfWeek === 6
      };
    } else {
      // 60일 이상이면 "8월21일 (일)" 형식
      const month = date.getMonth() + 1;
      const day = date.getDate();
      const dayOfWeek = date.getDay();
      const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
      
      return {
        day: `${month}/${day}`,
        dayOfWeek: dayNames[dayOfWeek],
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
        isSunday: dayOfWeek === 0,
        isSaturday: dayOfWeek === 6
      };
    }
  };

  useEffect(() => {
    loadDiaryBooks();
    loadDiaries();
  }, []);

  useEffect(() => {
    if (currentDiaryBook) {
      loadDiaries();
    }
  }, [currentDiaryBook, selectedDateFilter, customStartDate, customEndDate]);

  // 화면이 포커스될 때마다 일기 목록 새로고침
  useFocusEffect(
    React.useCallback(() => {
      loadDiaryBooks();
      if (currentDiaryBook) {
        loadDiaries();
      }
    }, [currentDiaryBook])
  );

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
      // 충분한 수의 일기를 가져온 후 클라이언트에서 날짜 필터링
      const allData = await DatabaseService.getDiaries(1000, 0, currentDiaryBook.id);
      
      // 날짜 필터링 적용
      const filteredData = filterDiariesByDate(allData, selectedDateFilter, customStartDate, customEndDate);
      setDiaries(filteredData);
    } catch (error) {
      console.error('일기 로드 실패:', error);
      Alert.alert('오류', '일기를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 날짜 필터링 함수
  const filterDiariesByDate = (diaries: Diary[], filter: string, startDate?: Date | null, endDate?: Date | null) => {
    const now = new Date();
    const cutoffDate = new Date();

    switch (filter) {
      case '7days':
        cutoffDate.setDate(now.getDate() - 7);
        break;
      case '15days':
        cutoffDate.setDate(now.getDate() - 15);
        break;
      case '30days':
        cutoffDate.setDate(now.getDate() - 30);
        break;
      case '60days':
        cutoffDate.setDate(now.getDate() - 60);
        break;
      case '90days':
        cutoffDate.setDate(now.getDate() - 90);
        break;
      case 'custom':
        if (startDate && endDate) {
          return diaries.filter(diary => {
            const diaryDate = new Date(diary.created_at);
            return diaryDate >= startDate && diaryDate <= endDate;
          });
        }
        return diaries;
      default:
        return diaries;
    }

    return diaries.filter(diary => 
      new Date(diary.created_at) >= cutoffDate
    );
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

  const handleWriteDiary = async () => {
    try {
      // 오늘 날짜에 이미 일기가 있는지 확인
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const todayStart = today.getTime();
      const todayEnd = tomorrow.getTime();
      
      const existingDiaries = await DatabaseService.getDiaries(1000, 0, currentDiaryBook?.id);
      const todayDiary = existingDiaries.find(diary => {
        const diaryTime = diary.created_at;
        return diaryTime >= todayStart && diaryTime < todayEnd;
      });
      
      if (todayDiary) {
        Alert.alert(
          '알림', 
          '금일은 일기를 작성했습니다.',
          [
            { text: '확인', style: 'cancel' }
          ]
        );
        return;
      }
      
      // 중복이 없으면 일기 작성 화면으로 이동
      navigation.navigate('Write');
    } catch (error) {
      console.error('일기 중복 확인 실패:', error);
      // 오류 발생 시에도 일기 작성 화면으로 이동
      navigation.navigate('Write');
    }
  };


  const handleImagePress = (images: string[], index: number) => {
    setSelectedImages(images);
    setCurrentImageIndex(index);
    setImageScale(1);
    setIsZoomed(false);
    setShowImageModal(true);
  };

  const handleImageDoublePress = useCallback(() => {
    // 더블탭으로 확대/축소 토글
    console.log('handleImageDoublePress called, isZoomed:', isZoomed);
    if (isZoomed) {
      setImageScale(1);
      setIsZoomed(false);
      console.log('Zooming out to scale 1');
    } else {
      setImageScale(2);
      setIsZoomed(true);
      console.log('Zooming in to scale 2');
    }
  }, [isZoomed]);

  const handleNextImage = () => {
    const currentIndex = currentImageIndexRef.current;
    const images = selectedImagesRef.current;
    console.log('handleNextImage called, selectedImages.length:', images.length, 'currentIndex:', currentIndex);
    if (images.length > 1) {
      const nextIndex = currentIndex < images.length - 1 ? currentIndex + 1 : 0;
      console.log('Setting next index to:', nextIndex);
      setCurrentImageIndex(nextIndex);
    }
  };

  const handlePrevImage = () => {
    const currentIndex = currentImageIndexRef.current;
    const images = selectedImagesRef.current;
    console.log('handlePrevImage called, selectedImages.length:', images.length, 'currentIndex:', currentIndex);
    if (images.length > 1) {
      const prevIndex = currentIndex > 0 ? currentIndex - 1 : images.length - 1;
      console.log('Setting prev index to:', prevIndex);
      setCurrentImageIndex(prevIndex);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDiaries();
    setRefreshing(false);
  };

  const formatDate = (timestamp: number) => {
    if (!timestamp || isNaN(timestamp)) {
      return '날짜 오류';
    }
    
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      return '날짜 오류';
    }
    
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
    if (!timestamp || isNaN(timestamp)) {
      return '날짜 오류';
    }
    
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      return '날짜 오류';
    }
    
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

  const renderDiaryItem = ({ item }: { item: Diary }) => {
    const dateInfo = formatDiaryDate(new Date(item.created_at));
    
    return (
      <TouchableOpacity
        style={dynamicStyles.diaryItem}
        onPress={() => navigation.navigate('DiaryDetail', { diaryId: item.id })}
      >
        <View style={dynamicStyles.diaryContent}>
          <View style={dynamicStyles.dateSection}>
            <Text style={[
              dynamicStyles.dateText,
              dateInfo.isSunday && dynamicStyles.sundayText,
              dateInfo.isSaturday && dynamicStyles.saturdayText
            ]}>
              {dateInfo.day}
            </Text>
            <Text style={[
              dynamicStyles.dayOfWeekText,
              dateInfo.isSunday && dynamicStyles.sundayText,
              dateInfo.isSaturday && dynamicStyles.saturdayText
            ]}>
              ({dateInfo.dayOfWeek})
            </Text>
          </View>
          
          <View style={dynamicStyles.contentSection}>
            <View style={dynamicStyles.headerRow}>
              <Text style={dynamicStyles.fullDateText}>{formatFullDate(item.created_at)}</Text>
            </View>
            
            <Text style={dynamicStyles.titleText} numberOfLines={1}>
              {item.title || (item.content ? item.content.substring(0, 30) + '...' : '제목 없음')}
            </Text>
          </View>
          
          <View style={dynamicStyles.moodSection}>
            <Text style={dynamicStyles.moodEmoji}>{MOOD_EMOJIS[item.mood] || '😐'}</Text>
          </View>
          
          <View style={dynamicStyles.imageSection}>
            {item.images && item.images.length > 0 ? (
              <TouchableOpacity
                onPress={() => handleImagePress(item.images, 0)}
                style={dynamicStyles.imagePreviewContainer}
              >
                <Image 
                  source={{ uri: item.images[0] || '' }} 
                  style={dynamicStyles.imagePreview}
                  resizeMode="cover"
                />
                {item.images.length > 1 && (
                  <View style={dynamicStyles.imageCountBadge}>
                    <Text style={dynamicStyles.imageCountText}>+{item.images.length - 1}</Text>
                  </View>
                )}
              </TouchableOpacity>
            ) : (
              <Text style={dynamicStyles.noImageText}>📒</Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.surface,
    },
    topBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: theme.primary,
    },
    appTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.type === 'dark' ? '#FFFFFF' : (theme.type === 'custom' && theme.customColor ? getHeaderTextColor(theme.customColor) : '#FFFFFF'),
    },
    addButton: {
      backgroundColor: theme.type === 'custom' && theme.customColor ? 
        (getHeaderTextColor(theme.customColor) === '#000000' ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.2)') : 
        'rgba(255, 255, 255, 0.2)',
      borderRadius: 20,
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 8,
    },
    addButtonText: {
      color: theme.type === 'custom' && theme.customColor ? getHeaderTextColor(theme.customColor) : '#FFFFFF',
      fontSize: 20,
      fontWeight: 'bold',
    },
    settingsButton: {
      backgroundColor: theme.type === 'custom' && theme.customColor ? 
        (getHeaderTextColor(theme.customColor) === '#000000' ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.2)') : 
        'rgba(255, 255, 255, 0.2)',
      borderRadius: 20,
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    settingsButtonText: {
      color: theme.type === 'custom' && theme.customColor ? getHeaderTextColor(theme.customColor) : '#FFFFFF',
      fontSize: 18,
    },
    filterBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: theme.background,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    dateFilterButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.surface,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
    },
    dateFilterText: {
      fontSize: 14,
      color: theme.text,
      marginRight: 4,
    },
    dateFilterArrow: {
      fontSize: 12,
      color: theme.textSecondary,
    },
    searchButton: {
      backgroundColor: theme.surface,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
    },
    searchButtonText: {
      fontSize: 16,
    },
    listContainer: {
      padding: 16,
    },
    diaryItem: {
      backgroundColor: theme.background,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: theme.border,
    },
    diaryContent: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    dateSection: {
      alignItems: 'center',
      marginRight: 16,
    },
    dateText: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.text,
    },
    dayOfWeekText: {
      fontSize: 12,
      color: theme.textSecondary,
      marginTop: 2,
    },
    sundayText: {
      color: '#FF3B30',
    },
    saturdayText: {
      color: '#007AFF',
    },
    contentSection: {
      flex: 1,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
    },
    fullDateText: {
      fontSize: 12,
      color: theme.textSecondary,
    },
    titleText: {
      fontSize: 16,
      color: theme.text,
      fontWeight: '500',
    },
    moodSection: {
      marginLeft: 12,
    },
    moodEmoji: {
      fontSize: 24,
    },
    imageSection: {
      marginLeft: 12,
    },
    imagePreviewContainer: {
      width: 50,
      height: 50,
      borderRadius: 8,
      overflow: 'hidden',
    },
    imagePreview: {
      width: '100%',
      height: '100%',
    },
    imageCountBadge: {
      position: 'absolute',
      top: -5,
      right: -5,
      backgroundColor: theme.primary,
      borderRadius: 10,
      width: 20,
      height: 20,
      justifyContent: 'center',
      alignItems: 'center',
    },
    imageCountText: {
      color: '#FFFFFF',
      fontSize: 10,
      fontWeight: 'bold',
    },
    noImageIcon: {
      width: 50,
      height: 50,
      borderRadius: 8,
      backgroundColor: theme.surface,
      justifyContent: 'center',
      alignItems: 'center',
    },
    noImageText: {
      fontSize: 20,
      color: theme.textSecondary,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalBackdrop: {
      flex: 1,
    },
    settingsMenu: {
      position: 'absolute',
      right: 0,
      top: 0,
      bottom: 0,
      width: '80%',
      backgroundColor: theme.background,
      paddingTop: 50,
    },
    settingsHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingBottom: 20,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    settingsTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.text,
    },
    closeButton: {
      fontSize: 24,
      color: theme.textSecondary,
    },
    settingsContent: {
      padding: 20,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: theme.text,
      marginBottom: 16,
    },
    diaryBookItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 8,
      marginBottom: 8,
      backgroundColor: theme.surface,
    },
    selectedDiaryBook: {
      backgroundColor: theme.primary,
    },
    diaryBookName: {
      fontSize: 16,
      color: theme.text,
    },
    selectedDiaryBookName: {
      color: theme.text,
    },
    defaultLabel: {
      fontSize: 12,
      color: theme.textSecondary,
      backgroundColor: theme.surface,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 4,
    },
    addDiaryBookButton: {
      backgroundColor: theme.surface,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 8,
      marginTop: 8,
    },
    addDiaryBookText: {
      fontSize: 16,
      color: theme.text,
      textAlign: 'center',
    },
    settingItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: theme.surface,
      borderRadius: 8,
      marginBottom: 8,
    },
    settingItemText: {
      fontSize: 16,
      color: theme.text,
    },
    settingItemArrow: {
      fontSize: 18,
      color: theme.textSecondary,
    },
  });

  return (
    <SafeAreaView style={dynamicStyles.container}>
      {/* 최상단 바 */}
      <View style={dynamicStyles.topBar}>
        <Text style={dynamicStyles.appTitle}>{currentDiaryBook?.name || '일기장'}</Text>
        <View style={styles.topBarButtons}>
          <TouchableOpacity
            style={dynamicStyles.addButton}
            onPress={handleWriteDiary}
          >
            <Text style={dynamicStyles.addButtonText}>✚</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={dynamicStyles.settingsButton}
            onPress={() => setShowSettings(true)}
          >
            <Text style={dynamicStyles.settingsButtonText}>☰</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 기간 필터 + 검색 */}
      <View style={dynamicStyles.filterBar}>
        <TouchableOpacity 
          style={dynamicStyles.dateFilterButton}
          onPress={() => setShowDateFilter(true)}
        >
          <Text style={dynamicStyles.dateFilterText}>
            {DATE_FILTER_CONFIG[selectedDateFilter].label}
          </Text>
          <Text style={dynamicStyles.dateFilterArrow}>▼</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={dynamicStyles.searchButton}
          onPress={() => navigation.navigate('Search')}
        >
          <Text style={dynamicStyles.searchButtonText}>🔍</Text>
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
        contentContainerStyle={dynamicStyles.listContainer}
        showsVerticalScrollIndicator={false}
      />

      {/* 설정 슬라이드 메뉴 */}
      <Modal
        visible={showSettings}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowSettings(false)}
      >
        <View style={dynamicStyles.modalOverlay}>
          <TouchableOpacity 
            style={dynamicStyles.modalBackdrop}
            onPress={() => setShowSettings(false)}
          />
          <View style={dynamicStyles.settingsMenu}>
            <View style={dynamicStyles.settingsHeader}>
              <Text style={dynamicStyles.settingsTitle}>일기장 설정</Text>
              <TouchableOpacity onPress={() => setShowSettings(false)}>
                <Text style={dynamicStyles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <View style={dynamicStyles.settingsContent}>
              <Text style={dynamicStyles.sectionTitle}>일기장 선택</Text>
              {diaryBooks.map((book) => (
                <TouchableOpacity
                  key={book.id}
                  style={[
                    dynamicStyles.diaryBookItem,
                    currentDiaryBook?.id === book.id && dynamicStyles.selectedDiaryBook
                  ]}
                  onPress={() => switchDiaryBook(book)}
                >
                  <Text style={[
                    dynamicStyles.diaryBookName,
                    currentDiaryBook?.id === book.id && dynamicStyles.selectedDiaryBookName
                  ]}>
                    {book.name}
                  </Text>
                  {book.is_default && (
                    <Text style={dynamicStyles.defaultLabel}>기본</Text>
                  )}
                </TouchableOpacity>
              ))}
              
              <TouchableOpacity
                style={dynamicStyles.addDiaryBookButton}
                onPress={() => setShowNewDiaryBook(true)}
              >
                <Text style={dynamicStyles.addDiaryBookText}>+ 새 일기장 추가</Text>
              </TouchableOpacity>

              <Text style={dynamicStyles.sectionTitle}>일기장 설정</Text>
              
              <TouchableOpacity
                style={dynamicStyles.settingItem}
                onPress={() => {
                  setShowSettings(false);
                  navigation.navigate('DiaryBookSettings', { diaryBookId: currentDiaryBook?.id });
                }}
              >
                <Text style={dynamicStyles.settingItemText}>📝 일기제목 변경</Text>
                <Text style={dynamicStyles.settingItemArrow}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={dynamicStyles.settingItem}
                onPress={() => {
                  setShowSettings(false);
                  navigation.navigate('SecuritySettings');
                }}
              >
                <Text style={dynamicStyles.settingItemText}>🔒 암호설정</Text>
                <Text style={dynamicStyles.settingItemArrow}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={dynamicStyles.settingItem}
                onPress={() => {
                  setShowSettings(false);
                  navigation.navigate('ThemeSettings');
                }}
              >
                <Text style={dynamicStyles.settingItemText}>🎨 테마선택</Text>
                <Text style={dynamicStyles.settingItemArrow}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={dynamicStyles.settingItem}
                onPress={() => {
                  setShowSettings(false);
                  navigation.navigate('GoogleDriveSettings');
                }}
              >
                <Text style={dynamicStyles.settingItemText}>☁️ 구글드라이브 연동</Text>
                <Text style={dynamicStyles.settingItemArrow}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={dynamicStyles.settingItem}
                onPress={() => {
                  setShowSettings(false);
                  navigation.navigate('Chart');
                }}
              >
                <Text style={dynamicStyles.settingItemText}>📊 기분차트</Text>
                <Text style={dynamicStyles.settingItemArrow}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={dynamicStyles.settingItem}
                onPress={() => {
                  setShowSettings(false);
                  navigation.navigate('LanguageSettings');
                }}
              >
                <Text style={dynamicStyles.settingItemText}>🌐 언어선택</Text>
                <Text style={dynamicStyles.settingItemArrow}>›</Text>
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
                  if (key === 'custom') {
                    setShowCustomDatePicker(true);
                    // custom 선택 시 모달을 닫지 않음
                  } else {
                    setSelectedDateFilter(key as any);
                    setShowDateFilter(false);
                  }
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
            
            {/* 사용자 지정 날짜 선택기 */}
            {showCustomDatePicker && (
              <View style={styles.customDatePicker}>
                <Text style={styles.customDatePickerTitle}>날짜 범위 선택</Text>
                
                <View style={styles.dateInputContainer}>
                  <View style={styles.dateInput}>
                    <Text style={styles.dateInputLabel}>시작 날짜</Text>
                    <TouchableOpacity
                      style={styles.dateInputButton}
                      onPress={() => {
                        // 실제 구현에서는 날짜 선택기 모달 표시
                        Alert.alert('날짜 선택', '시작 날짜 선택 기능을 구현할 예정입니다.');
                      }}
                    >
                      <Text style={styles.dateInputText}>
                        {customStartDate ? customStartDate.toLocaleDateString('ko-KR') : '날짜 선택'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  
                  <View style={styles.dateInput}>
                    <Text style={styles.dateInputLabel}>종료 날짜</Text>
                    <TouchableOpacity
                      style={styles.dateInputButton}
                      onPress={() => {
                        // 실제 구현에서는 날짜 선택기 모달 표시
                        Alert.alert('날짜 선택', '종료 날짜 선택 기능을 구현할 예정입니다.');
                      }}
                    >
                      <Text style={styles.dateInputText}>
                        {customEndDate ? customEndDate.toLocaleDateString('ko-KR') : '날짜 선택'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
                
                <View style={styles.customDateButtons}>
                  <TouchableOpacity
                    style={styles.customDateCancelButton}
                    onPress={() => {
                      setShowCustomDatePicker(false);
                      setShowDateFilter(false);
                    }}
                  >
                    <Text style={styles.customDateCancelText}>취소</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.customDateApplyButton}
                    onPress={() => {
                      if (customStartDate && customEndDate) {
                        setSelectedDateFilter('custom');
                        setShowCustomDatePicker(false);
                        setShowDateFilter(false);
                        // 실제 구현에서는 선택된 날짜 범위로 일기 필터링
                      } else {
                        Alert.alert('알림', '시작 날짜와 종료 날짜를 모두 선택해주세요.');
                      }
                    }}
                  >
                    <Text style={styles.customDateApplyText}>적용</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>

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
                  source={{ uri: selectedImages[currentImageIndex] }}
                  style={[
                    styles.imageModalImage,
                    { transform: [{ scale: imageScale }] }
                  ]}
                  resizeMode="contain"
                />
              </View>
              
              {selectedImages.length > 1 && (
                <View style={styles.imageModalNavigation}>
                  <TouchableOpacity
                    style={styles.imageModalNavButton}
                    onPress={handlePrevImage}
                  >
                    <Text style={styles.imageModalNavText}>‹</Text>
                  </TouchableOpacity>
                  
                  <Text style={styles.imageModalCounter}>
                    {currentImageIndex + 1} / {selectedImages.length}
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
  dayOfWeekText: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  sundayText: {
    color: '#FF3B30',
  },
  saturdayText: {
    color: '#007AFF',
  },
  contentSection: {
    flex: 1,
    marginLeft: 12,
  },
  moodSection: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
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
  imagePreviewContainer: {
    position: 'relative',
  },
  imagePreview: {
    width: 50,
    height: 50,
    borderRadius: 8,
  },
  imageCountBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageCountText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
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
  customDatePicker: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  customDatePickerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 16,
    textAlign: 'center',
  },
  dateInputContainer: {
    marginBottom: 20,
  },
  dateInput: {
    marginBottom: 12,
  },
  dateInputLabel: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 8,
  },
  dateInputButton: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#FFFFFF',
  },
  dateInputText: {
    fontSize: 16,
    color: '#000000',
  },
  customDateButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  customDateCancelButton: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    padding: 12,
    marginRight: 8,
    alignItems: 'center',
  },
  customDateCancelText: {
    fontSize: 16,
    color: '#8E8E93',
  },
  customDateApplyButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 12,
    marginLeft: 8,
    alignItems: 'center',
  },
  customDateApplyText: {
    fontSize: 16,
    color: '#FFFFFF',
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
    width: Dimensions.get('window').width * 0.9,
    height: Dimensions.get('window').height * 0.9,
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
