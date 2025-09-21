import { MOOD_EMOJIS } from '../types';

// 앱 기본 설정
export const APP_CONFIG = {
  name: 'DiaryApp',
  version: '1.0.0',
  maxTitleLength: 100,
  maxContentLength: 10000,
  maxImageSize: 200, // MB
  maxImagesPerDiary: 10,
  thumbnailSize: 200,
  imageQuality: 0.8,
  maxImageWidth: 1280,
} as const;

// 데이터베이스 설정
export const DB_CONFIG = {
  name: 'diary.db',
  version: 1,
  initialLoadCount: 30,
  loadMoreCount: 20,
} as const;

// 기분 설정
export const MOOD_CONFIG = {
  emojis: MOOD_EMOJIS,
  labels: {
    0: '아주 나쁨',
    1: '나쁨',
    2: '보통',
    3: '좋음',
    4: '아주 좋음',
    5: '최고',
  },
  colors: {
    0: '#FF6B6B', // 빨강
    1: '#FF8E53', // 주황
    2: '#FFD93D', // 노랑
    3: '#6BCF7F', // 연두
    4: '#4ECDC4', // 청록
    5: '#45B7D1', // 파랑
  },
} as const;

// 테마 설정
export const THEME_CONFIG = {
  light: {
    primary: '#007AFF',
    secondary: '#5856D6',
    background: '#FFFFFF',
    surface: '#F2F2F7',
    text: '#000000',
    textSecondary: '#8E8E93',
    border: '#C6C6C8',
    error: '#FF3B30',
    success: '#34C759',
    warning: '#FF9500',
  },
  dark: {
    primary: '#0A84FF',
    secondary: '#5E5CE6',
    background: '#000000',
    surface: '#1C1C1E',
    text: '#FFFFFF',
    textSecondary: '#8E8E93',
    border: '#38383A',
    error: '#FF453A',
    success: '#30D158',
    warning: '#FF9F0A',
  },
} as const;

// 언어 설정
export const LANGUAGE_CONFIG = {
  ko: '한국어',
  en: 'English',
  ja: '日本語',
  zh: '中文',
} as const;

// 날짜 필터 설정
export const DATE_FILTER_CONFIG = {
  '7days': { label: '지난 7일', days: 7 },
  '15days': { label: '지난 15일', days: 15 },
  '30days': { label: '지난 30일', days: 30 },
  '60days': { label: '지난 60일', days: 60 },
  '90days': { label: '지난 90일', days: 90 },
  custom: { label: '사용자 지정', days: 0 },
} as const;

// 파일 경로 설정
export const FILE_PATHS = {
  images: 'images',
  thumbnails: 'thumbnails',
  cache: 'cache',
  backup: 'backup',
} as const;

// 보안 설정
export const SECURITY_CONFIG = {
  minPinLength: 4,
  maxPinLength: 6,
  maxAttempts: 5,
  lockoutDuration: 30000, // 30초
} as const;

// 백업 설정
export const BACKUP_CONFIG = {
  maxBackupFiles: 5,
  autoBackupInterval: 7 * 24 * 60 * 60 * 1000, // 7일
  compressionLevel: 6,
} as const;
