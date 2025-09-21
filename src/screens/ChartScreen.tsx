import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Diary } from '../types';
import DatabaseService from '../services/database/DatabaseService';
import { MOOD_CONFIG } from '../constants';

const { width } = Dimensions.get('window');

export default function ChartScreen() {
  const [diaries, setDiaries] = useState<Diary[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<'7days' | '30days' | '90days' | 'custom'>('30days');
  const [moodData, setMoodData] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDiaries();
  }, [selectedPeriod]);

  useEffect(() => {
    if (diaries.length > 0) {
      calculateMoodData();
    }
  }, [diaries]);

  const loadDiaries = async () => {
    try {
      setLoading(true);
      const allDiaries = await DatabaseService.getDiaries(1000); // 충분한 수의 일기 로드
      
      // 기간 필터링
      const filteredDiaries = filterDiariesByPeriod(allDiaries, selectedPeriod);
      setDiaries(filteredDiaries);
    } catch (error) {
      console.error('일기 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterDiariesByPeriod = (diaries: Diary[], period: string) => {
    const now = new Date();
    const cutoffDate = new Date();

    switch (period) {
      case '7days':
        cutoffDate.setDate(now.getDate() - 7);
        break;
      case '30days':
        cutoffDate.setDate(now.getDate() - 30);
        break;
      case '90days':
        cutoffDate.setDate(now.getDate() - 90);
        break;
      default:
        return diaries;
    }

    return diaries.filter(diary => 
      new Date(diary.created_at) >= cutoffDate
    );
  };

  const calculateMoodData = () => {
    const moodCounts = [0, 0, 0, 0, 0, 0]; // 0~5 기분별 카운트
    
    diaries.forEach(diary => {
      moodCounts[diary.mood]++;
    });

    setMoodData(moodCounts);
  };

  const getMoodPercentage = (mood: number) => {
    const total = diaries.length;
    if (total === 0) return 0;
    return Math.round((moodData[mood] / total) * 100);
  };

  const getMostFrequentMood = () => {
    if (moodData.length === 0) return null;
    const maxCount = Math.max(...moodData);
    const moodIndex = moodData.indexOf(maxCount);
    return {
      mood: moodIndex,
      count: maxCount,
      percentage: getMoodPercentage(moodIndex)
    };
  };

  const renderMoodBar = (mood: number) => {
    const percentage = getMoodPercentage(mood);
    const count = moodData[mood];
    
    return (
      <View key={mood} style={styles.moodBarContainer}>
        <View style={styles.moodBarHeader}>
          <Text style={styles.moodEmoji}>{MOOD_CONFIG.emojis[mood as keyof typeof MOOD_CONFIG.emojis]}</Text>
          <Text style={styles.moodLabel}>{MOOD_CONFIG.labels[mood as keyof typeof MOOD_CONFIG.labels]}</Text>
          <Text style={styles.moodCount}>{count}회 ({percentage}%)</Text>
        </View>
        <View style={styles.moodBarBackground}>
          <View 
            style={[
              styles.moodBarFill,
              { 
                width: `${percentage}%`,
                backgroundColor: MOOD_CONFIG.colors[mood as keyof typeof MOOD_CONFIG.colors]
              }
            ]} 
          />
        </View>
      </View>
    );
  };

  const renderPieChart = () => {
    const total = diaries.length;
    if (total === 0) return null;

    let currentAngle = 0;
    const radius = 80;
    const centerX = width / 2 - 16;
    const centerY = 100;

    return (
      <View style={styles.pieChartContainer}>
        <Text style={styles.chartTitle}>기분 분포</Text>
        <View style={styles.pieChart}>
          {moodData.map((count, mood) => {
            if (count === 0) return null;
            
            const percentage = (count / total) * 100;
            const angle = (percentage / 100) * 360;
            
            const startAngle = currentAngle;
            const endAngle = currentAngle + angle;
            currentAngle += angle;

            return (
              <View key={mood} style={styles.pieSlice}>
              <View 
                style={[
                  styles.pieSliceFill,
                  { 
                    backgroundColor: MOOD_CONFIG.colors[mood as keyof typeof MOOD_CONFIG.colors],
                  }
                ]} 
              />
              </View>
            );
          })}
        </View>
        <View style={styles.pieLegend}>
          {moodData.map((count, mood) => {
            if (count === 0) return null;
            return (
              <View key={mood} style={styles.legendItem}>
                <View 
                  style={[
                    styles.legendColor,
                    { backgroundColor: MOOD_CONFIG.colors[mood as keyof typeof MOOD_CONFIG.colors] }
                  ]} 
                />
                <Text style={styles.legendText}>
                  {MOOD_CONFIG.emojis[mood as keyof typeof MOOD_CONFIG.emojis]} {count}회
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  const renderStatistics = () => {
    const total = diaries.length;
    const mostFrequent = getMostFrequentMood();
    const averageMood = total > 0 ? 
      diaries.reduce((sum, diary) => sum + diary.mood, 0) / total : 0;

    return (
      <View style={styles.statisticsContainer}>
        <Text style={styles.statisticsTitle}>통계</Text>
        
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>총 일기 수</Text>
          <Text style={styles.statValue}>{total}개</Text>
        </View>
        
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>평균 기분</Text>
          <Text style={styles.statValue}>
            {MOOD_CONFIG.emojis[Math.round(averageMood) as keyof typeof MOOD_CONFIG.emojis]} 
            {averageMood.toFixed(1)}
          </Text>
        </View>
        
        {mostFrequent && (
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>가장 많은 기분</Text>
            <Text style={styles.statValue}>
              {MOOD_CONFIG.emojis[mostFrequent.mood as keyof typeof MOOD_CONFIG.emojis]} 
              {mostFrequent.count}회 ({mostFrequent.percentage}%)
            </Text>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>차트를 불러오는 중...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* 기간 선택 */}
      <View style={styles.periodSelector}>
        <Text style={styles.periodTitle}>분석 기간</Text>
        <View style={styles.periodButtons}>
          {(['7days', '30days', '90days'] as const).map((period) => (
            <TouchableOpacity
              key={period}
              style={[
                styles.periodButton,
                selectedPeriod === period && styles.selectedPeriodButton
              ]}
              onPress={() => setSelectedPeriod(period)}
            >
              <Text style={[
                styles.periodButtonText,
                selectedPeriod === period && styles.selectedPeriodButtonText
              ]}>
                {period === '7days' ? '7일' : period === '30days' ? '30일' : '90일'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* 통계 */}
      {renderStatistics()}

      {/* 원형 차트 */}
      {renderPieChart()}

      {/* 막대 차트 */}
      <View style={styles.barChartContainer}>
        <Text style={styles.chartTitle}>기분별 분포</Text>
        {[0, 1, 2, 3, 4, 5].map(renderMoodBar)}
      </View>
    </ScrollView>
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
  periodSelector: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 16,
  },
  periodTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 12,
  },
  periodButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
  },
  selectedPeriodButton: {
    backgroundColor: '#007AFF',
  },
  periodButtonText: {
    fontSize: 14,
    color: '#000000',
  },
  selectedPeriodButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  statisticsContainer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 16,
  },
  statisticsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 16,
  },
  statItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  statLabel: {
    fontSize: 16,
    color: '#000000',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  pieChartContainer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 16,
  },
  pieChart: {
    width: 160,
    height: 160,
    borderRadius: 80,
    marginBottom: 16,
  },
  pieSlice: {
    position: 'absolute',
    width: 160,
    height: 160,
  },
  pieSliceFill: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  pieLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 8,
    marginVertical: 4,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 4,
  },
  legendText: {
    fontSize: 12,
    color: '#000000',
  },
  barChartContainer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 16,
  },
  moodBarContainer: {
    marginBottom: 16,
  },
  moodBarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  moodEmoji: {
    fontSize: 20,
    marginRight: 8,
  },
  moodLabel: {
    fontSize: 14,
    color: '#000000',
    flex: 1,
  },
  moodCount: {
    fontSize: 12,
    color: '#8E8E93',
  },
  moodBarBackground: {
    height: 8,
    backgroundColor: '#E5E5E5',
    borderRadius: 4,
    overflow: 'hidden',
  },
  moodBarFill: {
    height: '100%',
    borderRadius: 4,
  },
});
