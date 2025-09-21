# 📋 일기 앱 상세 개발 계획서

## 🎯 프로젝트 개요

### 기본 정보
- **앱 이름**: DiaryApp (고려중)
- **개발 언어**: React Native (Expo)
- **실행 명령어**: `npx expo start`
- **목표**: 하루의 기록과 추억을 관리할 수 있는 개인 일기 앱
- **핵심 기능**: 다중 일기장 시스템으로 일기별 분리 관리

---

## 🏗️ 아키텍처 설계

### 폴더 구조
```
src/
├── components/          # 재사용 가능한 컴포넌트
│   ├── common/         # 공통 컴포넌트
│   ├── diary/          # 일기 관련 컴포넌트
│   └── chart/          # 차트 컴포넌트
├── screens/            # 화면 컴포넌트
│   ├── FeedScreen.tsx  # 메인 피드
│   ├── WriteScreen.tsx # 일기 작성
│   ├── EditScreen.tsx  # 일기 편집
│   ├── SearchScreen.tsx # 검색
│   ├── SettingsScreen.tsx # 설정
│   └── ChartScreen.tsx # 기분 차트
├── navigation/         # 네비게이션 설정
├── services/           # 비즈니스 로직
│   ├── database/       # DB 관련
│   ├── storage/        # 파일 저장
│   ├── auth/           # 인증
│   └── backup/         # 백업/복원
├── hooks/              # 커스텀 훅
├── utils/              # 유틸리티 함수
├── types/              # TypeScript 타입 정의
├── constants/          # 상수
└── i18n/               # 다국어 리소스
```

---

## 📱 화면별 상세 설계

### 1. 메인 피드 화면 (FeedScreen)

#### UI 구성
```
┌─────────────────────────────────────┐
│ [일기장이름]            [✚] [☰]    │ ← 최상단 바
├─────────────────────────────────────┤
│ [지난 30일 ▼]              [🔍]    │ ← 필터 + 검색
├─────────────────────────────────────┤
│                                     │
│ 12/19 (목) 😊                       │ ← 일기 목록
│ 2024년 12월 19일 오후 3:30 목요일    │
│ 오늘은 정말 좋은 하루였다...         │
│                              [📷]   │
├─────────────────────────────────────┤
│ 12/18 (수) 😐                       │
│ 2024년 12월 18일 오전 10:15 수요일   │
│ 회의가 많아서 힘들었지만...          │
│                              [📷]   │
│                                     │
└─────────────────────────────────────┘
```

#### 주요 기능
- **일기장 시스템**: 다중 일기장으로 일기 분리 관리
- **기간 필터**: 셀렉트 옵션으로 7일/15일/30일/60일/90일/사용자지정 선택
- **설정 슬라이드**: ☰ 버튼으로 오른쪽에서 30% 슬라이드 메뉴
- **일기 추가**: ✚ 버튼으로 새 일기 작성
- **Pull-to-refresh**: 아래로 당겨서 새로고침
- **검색**: 제목+본문 전체 텍스트 검색

### 2. 일기 작성/편집 화면 (WriteScreen/EditScreen)

#### UI 구성
```
┌─────────────────────────────────────┐
│ [←] 일기 작성              [저장]    │ ← 헤더
├─────────────────────────────────────┤
│ 제목: [________________]            │ ← 제목 입력
├─────────────────────────────────────┤
│ 기분: [😊] [😐] [😢] [😡] [🤔] [😴] │ ← 기분 선택
├─────────────────────────────────────┤
│                                     │
│ 본문을 입력하세요...                │ ← 본문 입력
│                                     │
│                                     │
│                                     │
├─────────────────────────────────────┤
│ 사진: [📷] [🖼️] [🗑️]               │ ← 사진 첨부
│ [이미지 썸네일들...]                │
├─────────────────────────────────────┤
│ 태그: #여행 #학교 #친구             │ ← 태그 입력
└─────────────────────────────────────┘
```

#### 주요 기능
- **자동 저장**: 30초마다 초안 저장
- **이미지 처리**: 리사이즈(최대 1280px), 압축(JPEG 0.8)
- **기분 선택**: 6가지 이모지 (0~5 스케일)
- **태그 시스템**: 해시태그 형태로 입력

### 3. 설정 슬라이드 메뉴

#### UI 구성
```
┌─────────────────────────────────────┐
│ [일기장 설정]                [✕]    │ ← 헤더
├─────────────────────────────────────┤
│ 일기장 선택                          │
│ ┌─────────────────────────────────┐ │
│ │ 📖 기본 일기장            [기본] │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ 📖 여행 일기장                  │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ 📖 학교 일기장                  │ │
│ └─────────────────────────────────┘ │
│                                     │
│ [+ 새 일기장 추가]                  │
│                                     │
│ 일기장 설정                          │
│ ┌─────────────────────────────────┐ │
│ │ 📝 일기제목 변경            ›   │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ 🔒 암호설정                ›   │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ 🎨 테마선택                ›   │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ ☁️ 구글드라이브 연동        ›   │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ 📊 기분차트                ›   │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ 🌐 언어선택                ›   │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

#### 주요 기능
- **일기장 선택**: 현재 사용 중인 일기장 표시 및 변경
- **일기장 추가**: 새로운 일기장 생성
- **일기장별 분리**: 각 일기장마다 독립적인 일기, 사진 저장
- **일기제목 변경**: 기본 일기장 포함 모든 일기장 이름 변경 가능
- **암호설정**: PIN/패턴/생체인증 설정 및 관리
- **테마선택**: 라이트/다크/커스텀(36색상) 테마
- **구글드라이브 연동**: 백업·복원 기능
- **기분차트**: 기간별 기분 분석 화면 이동
- **언어선택**: 한국어/영어/일본어/중국어 지원

### 4. 암호설정 화면 (SecuritySettingsScreen)

#### 주요 기능
- **앱 잠금 ON/OFF**: 전체 앱 잠금 기능 활성화/비활성화
- **잠금 방식 선택**: PIN(4-6자리), 패턴(3x3 그리드), 생체인증
- **암호 변경**: 기존 암호 변경 및 생체인증 재등록
- **보안 정보**: 각 잠금 방식별 설명 및 사용법 안내

### 5. 테마설정 화면 (ThemeSettingsScreen)

#### 주요 기능
- **기본 테마**: 라이트(흰색), 다크(검은색) 테마
- **커스텀 테마**: 36개 색상 팔레트에서 선택
- **실시간 미리보기**: 선택한 테마의 미리보기 표시
- **즉시 적용**: 테마 변경 시 즉시 앱에 반영

### 6. 구글드라이브 설정 화면 (GoogleDriveSettingsScreen)

#### 주요 기능
- **구글드라이브 연동**: OAuth 인증을 통한 구글 계정 연동
- **자동 백업**: 7일마다 자동 백업 실행
- **수동 백업**: 사용자가 직접 백업 실행
- **백업 복원**: 구글드라이브에서 백업 데이터 복원
- **백업 정보**: 마지막 백업 날짜 및 백업 상태 표시

### 7. 언어설정 화면 (LanguageSettingsScreen)

#### 주요 기능
- **언어 선택**: 한국어, 영어, 일본어, 중국어 중 선택
- **국가별 플래그**: 각 언어별 국기 이모지 표시
- **현재 설정 표시**: 선택된 언어 정보 표시
- **앱 재시작 안내**: 언어 변경 후 앱 재시작 필요 안내

---

## 🗄️ 데이터베이스 설계

### SQLite 스키마

```sql
-- 일기장 테이블
CREATE TABLE diary_books (
  id TEXT PRIMARY KEY,           -- UUID
  name TEXT,                     -- 일기장 이름
  created_at INTEGER,            -- 생성 시간 (epoch ms)
  updated_at INTEGER,            -- 수정 시간
  is_default INTEGER DEFAULT 0   -- 기본 일기장 여부 (0/1)
);

-- 일기 테이블
CREATE TABLE diaries (
  id TEXT PRIMARY KEY,           -- UUID
  diary_book_id TEXT,            -- 일기장 ID (외래키)
  title TEXT,                    -- 제목 (최대 100자)
  content TEXT,                  -- 본문 (무제한)
  mood INTEGER DEFAULT 3,        -- 기분 (0~5)
  created_at INTEGER,            -- 작성 시간 (epoch ms)
  updated_at INTEGER,            -- 수정 시간
  pinned INTEGER DEFAULT 0,      -- 고정 여부 (0/1)
  is_encrypted INTEGER DEFAULT 0, -- 암호화 여부 (0/1)
  tags TEXT,                     -- JSON 배열
  images TEXT,                   -- JSON 배열 (파일 경로)
  metadata TEXT,                 -- JSON (위치정보 등)
  FOREIGN KEY (diary_book_id) REFERENCES diary_books (id)
);

-- 설정 테이블
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

-- 백업 히스토리 테이블
CREATE TABLE backup_history (
  id TEXT PRIMARY KEY,
  backup_date INTEGER,
  file_size INTEGER,
  file_path TEXT
);
```

### 데이터 타입 정의

```typescript
// 일기장 관련 타입 정의
interface DiaryBook {
  id: string;
  name: string;
  created_at: number;
  updated_at: number;
  is_default: boolean;
}

// 일기 타입에 일기장 ID 추가
interface Diary {
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
  metadata: {
    location?: {
      latitude: number;
      longitude: number;
      address: string;
    };
    weather?: string;
  };
}

interface Settings {
  currentDiaryBookId: string; // 현재 선택된 일기장 ID
  theme: 'light' | 'dark' | 'custom';
  language: 'ko' | 'en' | 'ja' | 'zh';
  isLockEnabled: boolean;
  lockType: 'pin' | 'pattern' | 'biometric';
  isGoogleDriveEnabled: boolean;
  autoBackup: boolean;
  maxImageSize: number; // MB
}
```

---

## 🔧 핵심 기능 구현 계획

### 1. 이미지 처리 시스템

#### 저장 구조
```
/앱전용디렉토리/
├── images/
│   ├── 2024/
│   │   ├── 12/
│   │   │   ├── 19/
│   │   │   │   ├── diary_001_001.jpg
│   │   │   │   └── diary_001_002.jpg
│   │   │   └── 20/
│   │   └── 11/
│   └── thumbnails/
│       └── (썸네일 이미지들)
└── cache/
    └── (임시 파일들)
```

#### 처리 로직
1. **이미지 선택**: 카메라 촬영 또는 갤러리 선택
2. **리사이즈**: 최대 1280px로 리사이즈
3. **압축**: JPEG 품질 0.8로 압축
4. **저장**: 날짜별 폴더에 저장
5. **썸네일 생성**: 200x200 썸네일 생성
6. **DB 저장**: 파일 경로를 JSON 배열로 저장

### 2. 검색 시스템

#### 검색 알고리즘
```typescript
interface SearchOptions {
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

// 검색 쿼리 예시
const searchQuery = `
  SELECT * FROM diaries 
  WHERE (
    title LIKE ? OR 
    content LIKE ? OR 
    tags LIKE ?
  )
  AND mood IN (${moodFilters.join(',')})
  AND created_at BETWEEN ? AND ?
  ORDER BY ${sortBy} ${sortOrder}
  LIMIT 30 OFFSET ?
`;
```

### 3. 보안 시스템

#### 암호화 구현
```typescript
// AES 암호화
import CryptoJS from 'crypto-js';

const encryptText = (text: string, password: string): string => {
  return CryptoJS.AES.encrypt(text, password).toString();
};

const decryptText = (encryptedText: string, password: string): string => {
  const bytes = CryptoJS.AES.decrypt(encryptedText, password);
  return bytes.toString(CryptoJS.enc.Utf8);
};
```

#### 인증 시스템
- **PIN**: 4-6자리 숫자
- **패턴**: 3x3 그리드 패턴
- **생체인증**: 지문/얼굴 인식

### 4. 백업/복원 시스템

#### 구글 드라이브 연동
```typescript
interface BackupData {
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
```

#### 백업 프로세스
1. **데이터 수집**: 일기, 설정, 이미지 수집
2. **압축**: ZIP 파일로 압축
3. **암호화**: 사용자 비밀번호로 암호화
4. **업로드**: 구글 드라이브에 업로드
5. **메타데이터 저장**: 백업 히스토리 기록

---

## 📊 성능 최적화 계획

### 1. 이미지 최적화
- **지연 로딩**: 화면에 보이는 이미지만 로드
- **캐시 관리**: LRU 알고리즘으로 캐시 관리
- **용량 제한**: 200MB 초과 시 오래된 이미지 자동 삭제

### 2. 데이터베이스 최적화
- **인덱스 생성**: 검색 성능 향상
- **페이지네이션**: 대용량 데이터 처리
- **쿼리 최적화**: 효율적인 SQL 쿼리

### 3. 메모리 관리
- **컴포넌트 최적화**: React.memo, useMemo 활용
- **이미지 압축**: 메모리 사용량 최소화
- **가비지 컬렉션**: 불필요한 객체 정리

---

## 🧪 테스트 계획

### 1. 단위 테스트
- **유틸리티 함수**: 날짜, 암호화, 이미지 처리
- **데이터베이스**: CRUD 작업
- **컴포넌트**: 렌더링 및 상호작용

### 2. 통합 테스트
- **네비게이션**: 화면 간 이동
- **데이터 플로우**: 전체 사용자 시나리오
- **백업/복원**: 구글 드라이브 연동

### 3. 사용자 테스트
- **사용성 테스트**: 실제 사용자 피드백
- **성능 테스트**: 대용량 데이터 처리
- **호환성 테스트**: 다양한 디바이스

---

*이 계획서는 개발 진행에 따라 지속적으로 업데이트됩니다.*
*마지막 업데이트: 2025년 9월 21일*
