import * as Crypto from 'expo-crypto';
import * as LocalAuthentication from 'expo-local-authentication';
import { SecuritySettings, SecurityQuestion } from '../types';

class SecurityService {
  // PIN 코드 해시화
  async hashPinCode(pinCode: string): Promise<string> {
    return await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      pinCode + 'diary_app_salt',
      { encoding: Crypto.CryptoEncoding.BASE64 }
    );
  }

  // PIN 코드 검증
  async verifyPinCode(inputPin: string, hashedPin: string): Promise<boolean> {
    const hashedInput = await this.hashPinCode(inputPin);
    return hashedInput === hashedPin;
  }

  // 보안 질문 답변 해시화
  async hashAnswer(answer: string): Promise<string> {
    return await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      answer.toLowerCase().trim() + 'security_question_salt',
      { encoding: Crypto.CryptoEncoding.BASE64 }
    );
  }

  // 보안 질문 답변 검증
  async verifyAnswer(inputAnswer: string, hashedAnswer: string): Promise<boolean> {
    const hashedInput = await this.hashAnswer(inputAnswer);
    return hashedInput === hashedAnswer;
  }

  // 생체 인증 가능 여부 확인
  async isBiometricAvailable(): Promise<boolean> {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      return hasHardware && isEnrolled;
    } catch (error) {
      console.error('생체 인증 확인 실패:', error);
      return false;
    }
  }

  // 생체 인증 실행
  async authenticateWithBiometrics(): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: '일기 앱 잠금을 해제하려면 생체 인증을 사용하세요',
        fallbackLabel: 'PIN 코드 사용',
        cancelLabel: '취소',
      });
      return { success: result.success };
    } catch (error) {
      console.error('생체 인증 실패:', error);
      return { success: false, error: error.message };
    }
  }

  // PIN 코드 유효성 검사
  validatePinCode(pinCode: string): { isValid: boolean; message?: string } {
    if (!pinCode) {
      return { isValid: false, message: 'PIN 코드를 입력해주세요' };
    }
    
    if (pinCode.length < 4) {
      return { isValid: false, message: 'PIN 코드는 최소 4자리여야 합니다' };
    }
    
    if (pinCode.length > 8) {
      return { isValid: false, message: 'PIN 코드는 최대 8자리까지 가능합니다' };
    }
    
    if (!/^\d+$/.test(pinCode)) {
      return { isValid: false, message: 'PIN 코드는 숫자만 입력 가능합니다' };
    }
    
    return { isValid: true };
  }

  // 보안 질문 생성
  generateSecurityQuestions(): SecurityQuestion[] {
    return [
      {
        id: '1',
        question: '어릴 때 살던 집의 동네 이름은?',
        answer: '', // 사용자가 설정
      },
      {
        id: '2',
        question: '가장 좋아하는 음식은?',
        answer: '', // 사용자가 설정
      },
      {
        id: '3',
        question: '첫 번째 애완동물의 이름은?',
        answer: '', // 사용자가 설정
      },
      {
        id: '4',
        question: '가장 기억에 남는 여행지는?',
        answer: '', // 사용자가 설정
      },
      {
        id: '5',
        question: '어릴 때 꿈이었던 직업은?',
        answer: '', // 사용자가 설정
      },
    ];
  }

  // 패턴 데이터 검증
  validatePattern(pattern: string): { isValid: boolean; message?: string } {
    try {
      const patternData = JSON.parse(pattern);
      if (!patternData.points || !Array.isArray(patternData.points)) {
        return { isValid: false, message: '잘못된 패턴 데이터입니다' };
      }
      
      if (patternData.points.length < 4) {
        return { isValid: false, message: '패턴은 최소 4개 점을 연결해야 합니다' };
      }
      
      return { isValid: true };
    } catch (error) {
      return { isValid: false, message: '잘못된 패턴 형식입니다' };
    }
  }

  // 보안 설정 초기화
  getDefaultSecuritySettings(): SecuritySettings {
    return {
      isEnabled: false,
      lockType: 'pin',
      biometricEnabled: false,
      backupUnlockEnabled: false,
      securityQuestions: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }
}

export default new SecurityService();
