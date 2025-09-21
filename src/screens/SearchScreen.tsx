import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
} from 'react-native';
import { Diary } from '../types';
import DatabaseService from '../services/database/DatabaseService';
import { MOOD_CONFIG } from '../constants';
import { MOOD_EMOJIS } from '../types';

export default function SearchScreen({ navigation }: any) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Diary[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMoods, setSelectedMoods] = useState<number[]>([]);
  const [hasImages, setHasImages] = useState<boolean | null>(null);

  const handleSearch = async () => {
    if (!query.trim()) {
      Alert.alert('알림', '검색어를 입력해주세요.');
      return;
    }

    try {
      setLoading(true);
      const searchResults = await DatabaseService.searchDiaries(query.trim());
      
      // 필터 적용
      let filteredResults = searchResults;
      
      if (selectedMoods.length > 0) {
        filteredResults = filteredResults.filter(diary => 
          selectedMoods.includes(diary.mood)
        );
      }
      
      if (hasImages !== null) {
        filteredResults = filteredResults.filter(diary => 
          hasImages ? diary.images.length > 0 : diary.images.length === 0
        );
      }
      
      setResults(filteredResults);
    } catch (error) {
      console.error('검색 실패:', error);
      Alert.alert('오류', '검색에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const toggleMoodFilter = (mood: number) => {
    if (selectedMoods.includes(mood)) {
      setSelectedMoods(selectedMoods.filter(m => m !== mood));
    } else {
      setSelectedMoods([...selectedMoods, mood]);
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hour = date.getHours();
    const minute = date.getMinutes();
    const period = hour < 12 ? '오전' : '오후';
    const displayHour = hour > 12 ? hour - 12 : hour;

    return `${year}년 ${month}월 ${day}일 ${period} ${displayHour}:${minute.toString().padStart(2, '0')}`;
  };

  const renderResultItem = ({ item }: { item: Diary }) => (
    <TouchableOpacity
      style={styles.resultItem}
      onPress={() => navigation.navigate('Edit', { diaryId: item.id })}
    >
      <View style={styles.resultContent}>
        <View style={styles.resultHeader}>
          <Text style={styles.resultDate}>{formatDate(item.created_at)}</Text>
          <Text style={styles.resultMood}>{MOOD_EMOJIS[item.mood] || '😐'}</Text>
        </View>
        
        <Text style={styles.resultTitle} numberOfLines={1}>
          {item.title || '제목 없음'}
        </Text>
        
        <Text style={styles.resultContent} numberOfLines={2}>
          {item.content}
        </Text>
        
        {item.tags.length > 0 && (
          <View style={styles.tagsContainer}>
            {item.tags.slice(0, 3).map((tag, index) => (
              <Text key={index} style={styles.tag}>#{tag}</Text>
            ))}
            {item.tags.length > 3 && (
              <Text style={styles.moreTags}>+{item.tags.length - 3}</Text>
            )}
          </View>
        )}
        
        <View style={styles.resultFooter}>
          {item.images.length > 0 && (
            <Text style={styles.imageIndicator}>📷 {item.images.length}장</Text>
          )}
          {item.pinned && (
            <Text style={styles.pinnedIndicator}>📌 고정</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* 검색 입력 */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="제목, 내용, 태그로 검색..."
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
          <Text style={styles.searchButtonText}>🔍</Text>
        </TouchableOpacity>
      </View>

      {/* 필터 옵션 */}
      <View style={styles.filterContainer}>
        <Text style={styles.filterTitle}>기분 필터</Text>
        <View style={styles.moodFilters}>
          {Object.entries(MOOD_CONFIG.emojis).map(([moodValue, emoji]) => (
            <TouchableOpacity
              key={moodValue}
              style={[
                styles.moodFilter,
                selectedMoods.includes(parseInt(moodValue)) && styles.selectedMoodFilter
              ]}
              onPress={() => toggleMoodFilter(parseInt(moodValue))}
            >
              <Text style={styles.moodFilterEmoji}>{emoji}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.filterTitle}>사진 필터</Text>
        <View style={styles.imageFilters}>
          <TouchableOpacity
            style={[
              styles.imageFilter,
              hasImages === true && styles.selectedImageFilter
            ]}
            onPress={() => setHasImages(hasImages === true ? null : true)}
          >
            <Text style={styles.imageFilterText}>사진 있음</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.imageFilter,
              hasImages === false && styles.selectedImageFilter
            ]}
            onPress={() => setHasImages(hasImages === false ? null : false)}
          >
            <Text style={styles.imageFilterText}>사진 없음</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 검색 결과 */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>검색 중...</Text>
        </View>
      ) : results.length > 0 ? (
        <FlatList
          data={results}
          renderItem={renderResultItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.resultsContainer}
          showsVerticalScrollIndicator={false}
        />
      ) : query ? (
        <View style={styles.noResultsContainer}>
          <Text style={styles.noResultsText}>검색 결과가 없습니다.</Text>
          <Text style={styles.noResultsSubtext}>
            다른 검색어나 필터를 시도해보세요.
          </Text>
        </View>
      ) : (
        <View style={styles.placeholderContainer}>
          <Text style={styles.placeholderText}>검색어를 입력해주세요</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginRight: 8,
  },
  searchButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 48,
  },
  searchButtonText: {
    fontSize: 18,
    color: '#FFFFFF',
  },
  filterContainer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 8,
  },
  moodFilters: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  moodFilter: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  selectedMoodFilter: {
    backgroundColor: '#007AFF',
  },
  moodFilterEmoji: {
    fontSize: 20,
  },
  imageFilters: {
    flexDirection: 'row',
    gap: 8,
  },
  imageFilter: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#F2F2F7',
  },
  selectedImageFilter: {
    backgroundColor: '#007AFF',
  },
  imageFilterText: {
    fontSize: 14,
    color: '#000000',
  },
  resultsContainer: {
    padding: 16,
  },
  resultItem: {
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
  resultContent: {
    flex: 1,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  resultDate: {
    fontSize: 12,
    color: '#8E8E93',
  },
  resultMood: {
    fontSize: 16,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 4,
  },
  resultContent: {
    fontSize: 14,
    color: '#000000',
    lineHeight: 20,
    marginBottom: 8,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  tag: {
    fontSize: 12,
    color: '#007AFF',
    backgroundColor: '#F0F8FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 4,
    marginBottom: 4,
  },
  moreTags: {
    fontSize: 12,
    color: '#8E8E93',
    marginLeft: 4,
  },
  resultFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  imageIndicator: {
    fontSize: 12,
    color: '#8E8E93',
  },
  pinnedIndicator: {
    fontSize: 12,
    color: '#FF9500',
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
  noResultsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  noResultsText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 8,
  },
  noResultsSubtext: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 16,
    color: '#8E8E93',
  },
});
