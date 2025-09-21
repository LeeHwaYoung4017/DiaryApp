// 일기 관련 타입 정의
export interface Diary {
  id: string;
  title: string;
  content: string;
  mood: 0 | 1 | 2 | 3 | 4 | 5; // 0=아주나쁨, 5=아주좋음
  created_at: number;
  updated_at: number;
  pinned: boolean;
  is_encrypted: boolean;
  tags: string[];
  images: string[];
  metadata: DiaryMetadata;
}

export interface DiaryMetadata {
  location?: {
    latitude: number;
    longitude: number;
    address: string;
  };
  weather?: string;
}

// 설정 관련 타입 정의
export interface Settings {
  appTitle: string;
  theme: 'light' | 'dark' | 'custom';
  language: 'ko' | 'en' | 'ja' | 'zh';
  isLockEnabled: boolean;
  lockType: 'pin' | 'pattern' | 'biometric';
  isGoogleDriveEnabled: boolean;
  autoBackup: boolean;
  maxImageSize: number; // MB
}

// 검색 관련 타입 정의
export interface SearchOptions {
  query: string;
  filters: {
    mood?: number[];
    hasImages?: boolean;
    tags?: string[];
    dateRange?: {
      start: number;
      end: number;
    };
  };
  sortBy: 'date' | 'title' | 'mood';
  sortOrder: 'asc' | 'desc';
}

// 네비게이션 타입 정의
export type RootStackParamList = {
  Feed: undefined;
  Write: { diaryId?: string };
  Edit: { diaryId: string };
  Search: undefined;
  Settings: undefined;
  Chart: undefined;
  DiaryBookSettings: { diaryBookId?: string };
  SecuritySettings: undefined;
  ThemeSettings: undefined;
  GoogleDriveSettings: undefined;
  LanguageSettings: undefined;
};

// 일기장 관련 타입 정의
export interface DiaryBook {
  id: string;
  name: string;
  created_at: number;
  updated_at: number;
  is_default: boolean;
}

// 일기 타입에 일기장 ID 추가
export interface Diary {
  id: string;
  diary_book_id: string; // 일기장 ID 추가
  title: string;
  content: string;
  mood: 0 | 1 | 2 | 3 | 4 | 5; // 0=아주나쁨, 5=아주좋음
  created_at: number;
  updated_at: number;
  pinned: boolean;
  is_encrypted: boolean;
  tags: string[];
  images: string[];
  metadata: DiaryMetadata;
}

// 기분 타입 정의
export const MOOD_EMOJIS = {
  0: '😡', // 아주 나쁨
  1: '😢', // 나쁨
  2: '😐', // 보통
  3: '😊', // 좋음
  4: '😄', // 아주 좋음
  5: '🤩', // 최고
} as const;

export type MoodType = keyof typeof MOOD_EMOJIS;

// 백업 관련 타입 정의
export interface BackupData {
  diaries: Diary[];
  settings: Settings;
  images: {
    [key: string]: string; // base64 인코딩된 이미지
  };
  metadata: {
    backupDate: number;
    version: string;
    deviceInfo: string;
  };
}

// 차트 관련 타입 정의
export interface ChartData {
  labels: string[];
  datasets: {
    data: number[];
    color?: (opacity: number) => string;
  }[];
}

// 필터 관련 타입 정의
export type DateFilter = '7days' | '15days' | '30days' | '60days' | '90days' | 'custom';

export interface DateRange {
  start: number;
  end: number;
}
