import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import DatabaseService from '../services/database/DatabaseService';
import { THEME_CONFIG } from '../constants';

export type ThemeType = 'light' | 'dark' | 'custom';

export interface Theme {
  type: ThemeType;
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  error: string;
  success: string;
  warning: string;
  customColor?: string;
}

interface ThemeContextType {
  theme: Theme;
  setTheme: (themeType: ThemeType, customColor?: string) => Promise<void>;
  loading: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(THEME_CONFIG.light);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      setLoading(true);
      
      // 데이터베이스가 초기화될 때까지 재시도
      let retryCount = 0;
      const maxRetries = 5;
      
      while (retryCount < maxRetries) {
        try {
          const savedTheme = await DatabaseService.getSetting('theme') as ThemeType;
          const customColor = await DatabaseService.getSetting('customColor') as string;
          
          if (savedTheme) {
            applyTheme(savedTheme, customColor);
          } else {
            applyTheme('light');
          }
          break; // 성공하면 루프 종료
        } catch (dbError) {
          retryCount++;
          if (retryCount >= maxRetries) {
            throw dbError;
          }
          // 500ms 대기 후 재시도
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    } catch (error) {
      console.error('테마 로드 실패:', error);
      applyTheme('light');
    } finally {
      setLoading(false);
    }
  };

  const applyTheme = (themeType: ThemeType, customColor?: string) => {
    let newTheme: Theme;
    
    if (themeType === 'custom' && customColor) {
      // 커스텀 색상의 HSL 값을 계산하여 톤앤매너 결정
      const hex = customColor.replace('#', '');
      const r = parseInt(hex.substr(0, 2), 16) / 255;
      const g = parseInt(hex.substr(2, 2), 16) / 255;
      const b = parseInt(hex.substr(4, 2), 16) / 255;
      
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const lightness = (max + min) / 2;
      
      // 색상의 채도 계산
      const saturation = max === min ? 0 : (max - min) / (1 - Math.abs(2 * lightness - 1));
      
      // 밝고 채도가 높은 색상인지 판단
      const isBrightColor = lightness > 0.6;
      const isHighSaturation = saturation > 0.5;
      
      // 색상에 맞는 배경색과 텍스트 색상 생성
      let background, surface, text, textSecondary, border;
      
      // 연한 색상들의 hex 코드 목록 (연분홍~회색 16개만)
      const lightColors = [
        '#FFE4E1', '#E0FFFF', '#F0FFF0', '#FFF8DC', '#FFEFD5', '#FDF5E6',
        '#F5F5DC', '#FFFAF0', '#F0F8FF', '#E6E6FA', '#FFF0F5', '#F0FFFF',
        '#F5FFFA', '#FFFACD', '#FFEBCD', '#F5F5F5'
      ];
      
      // 더 정교한 대비 계산 함수
      const getContrastColor = (bgColor: string, primaryColor: string) => {
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
        if (colorTextMap[primaryColor.toUpperCase()]) {
          return colorTextMap[primaryColor.toUpperCase()];
        }
        
        // 매핑이 없으면 밝기 계산으로 결정
        const primaryHex = primaryColor.replace('#', '');
        const primaryR = parseInt(primaryHex.substr(0, 2), 16);
        const primaryG = parseInt(primaryHex.substr(2, 2), 16);
        const primaryB = parseInt(primaryHex.substr(4, 2), 16);
        const primaryBrightness = (primaryR * 299 + primaryG * 587 + primaryB * 114) / 1000;
        
        // 밝기 기준으로 결정
        return primaryBrightness > 140 ? '#000000' : '#FFFFFF';
      };
      
      // 선택한 색상에 맞는 조화로운 배경색 생성
      const generateHarmoniousColors = (primaryColor: string, lightness: number, saturation: number) => {
        // 모든 커스텀 색상에 대해 밝은 배경 사용
        if (isBrightColor && isHighSaturation) {
          // 밝고 채도가 높은 색상 (예: 노랑, 연두, 핑크) - 부드러운 배경
          return {
            background: '#FEFEFE',
            surface: '#F8F9FA',
            border: '#E5E7EB'
          };
        } else if (isBrightColor) {
          // 밝지만 채도가 낮은 색상 (예: 파스텔) - 깔끔한 배경
          return {
            background: '#FFFFFF',
            surface: '#F3F4F6',
            border: '#D1D5DB'
          };
        } else {
          // 어두운 색상들도 밝은 배경 사용 (청록, 파랑, 보라 등)
          return {
            background: '#FFFFFF',
            surface: '#F8F9FA',
            border: '#E5E7EB'
          };
        }
      };
      
      const harmoniousColors = generateHarmoniousColors(customColor, lightness, saturation);
      background = harmoniousColors.background;
      surface = harmoniousColors.surface;
      border = harmoniousColors.border;
      
      text = getContrastColor(background, customColor);
      textSecondary = text === '#000000' ? '#6B7280' : '#D1D5DB';
      
      newTheme = {
        ...THEME_CONFIG.light,
        type: 'custom',
        primary: customColor,
        secondary: customColor,
        customColor,
        background,
        surface,
        text,
        textSecondary,
        border,
      };
    } else {
      // 라이트/다크 테마
      newTheme = {
        ...THEME_CONFIG[themeType],
        type: themeType,
      };
    }
    
    setThemeState(newTheme);
  };

  const setTheme = async (themeType: ThemeType, customColor?: string) => {
    try {
      await DatabaseService.setSetting('theme', themeType);
      
      if (themeType === 'custom' && customColor) {
        await DatabaseService.setSetting('customColor', customColor);
      }
      
      applyTheme(themeType, customColor);
    } catch (error) {
      console.error('테마 설정 실패:', error);
      throw error;
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, loading }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
