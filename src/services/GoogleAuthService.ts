import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// WebBrowser를 완료하도록 설정
WebBrowser.maybeCompleteAuthSession();

export interface GoogleUser {
  id: string;
  name: string;
  email: string;
  picture: string;
  accessToken: string;
}

class GoogleAuthService {
  private readonly config = {
    webClientId: '699351469476-o5ifbkh3unvqvmhoo00budfqe4dkna0u.apps.googleusercontent.com',
    androidClientId: '699351469476-gvvre0suhi2cmtidmob393tg1643oteq.apps.googleusercontent.com',
    scopes: ['openid', 'profile', 'email'],
  };

  async signIn(): Promise<{ success: boolean; user?: GoogleUser; error?: string }> {
    try {
      console.log('Starting Google sign in...');
      
      // Google Cloud Console에 등록된 정확한 URI 사용
      const redirectUri = 'https://auth.expo.io/@leehwayeong/diary-app';
      
      console.log('Redirect URI:', redirectUri);
      
      const request = new AuthSession.AuthRequest({
        clientId: Platform.OS === 'android' ? this.config.androidClientId : this.config.webClientId,
        scopes: this.config.scopes,
        redirectUri,
        responseType: AuthSession.ResponseType.Token,
        extraParams: {},
        additionalParameters: {},
      });

      const result = await request.promptAsync({
        authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
        useProxy: false,
        returnUrl: redirectUri,
      });

      console.log('Auth result:', result);

      if (result.type === 'success' && result.authentication?.accessToken) {
        console.log('Access token received directly');
        
        const accessToken = result.authentication.accessToken;
        
        // 사용자 정보 가져오기
        const userInfo = await this.getUserInfo(accessToken);
        
        if (userInfo) {
          const user: GoogleUser = {
            id: userInfo.id,
            name: userInfo.name,
            email: userInfo.email,
            picture: userInfo.picture,
            accessToken: accessToken,
          };

          // 사용자 정보 저장
          await this.saveUser(user);
          
          console.log('User saved successfully:', user.name);
          return { success: true, user };
        }
      }

      if (result.type === 'cancel') {
        return { success: false, error: '로그인이 취소되었습니다.' };
      }

      return { success: false, error: '인증에 실패했습니다.' };
    } catch (error) {
      console.error('구글 로그인 오류:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.' 
      };
    }
  }

  private async exchangeCodeForToken(code: string, redirectUri: string) {
    const tokenEndpoint = 'https://oauth2.googleapis.com/token';
    
    const params = new URLSearchParams({
      client_id: this.config.webClientId,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    });

    console.log('Token exchange params:', params.toString());
    
    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    console.log('Token exchange response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Token exchange error:', errorText);
      throw new Error(`토큰 교환 실패: ${response.status} - ${errorText}`);
    }

    const tokenData = await response.json();
    console.log('Token exchange success');
    return tokenData;
  }

  private async getUserInfo(accessToken: string) {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`사용자 정보 가져오기 실패: ${response.status}`);
    }

    return await response.json();
  }

  async signOut(): Promise<{ success: boolean; error?: string }> {
    try {
      await SecureStore.deleteItemAsync('googleUser');
      return { success: true };
    } catch (error) {
      console.error('구글 로그아웃 오류:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : '로그아웃 중 오류가 발생했습니다.' 
      };
    }
  }

  async getCurrentUser(): Promise<GoogleUser | null> {
    try {
      const userData = await SecureStore.getItemAsync('googleUser');
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('사용자 정보 가져오기 오류:', error);
      return null;
    }
  }

  private async saveUser(user: GoogleUser): Promise<void> {
    try {
      await SecureStore.setItemAsync('googleUser', JSON.stringify(user));
    } catch (error) {
      console.error('사용자 정보 저장 오류:', error);
      throw error;
    }
  }

  async isSignedIn(): Promise<boolean> {
    const user = await this.getCurrentUser();
    return user !== null;
  }
}

export default new GoogleAuthService();
