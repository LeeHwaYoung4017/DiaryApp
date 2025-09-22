import * as SQLite from 'expo-sqlite';
import { Diary, Settings, SecuritySettings } from '../../types';
import { DB_CONFIG } from '../../constants';

class DatabaseService {
  private db: SQLite.SQLiteDatabase | null = null;
  private isLocked = false;
  private jsonParseErrorLogged = false;

  async init(): Promise<void> {
    try {
      // 기존 데이터베이스 연결이 있으면 안전하게 닫기
      if (this.db) {
        try {
          await this.db.closeAsync();
          await new Promise(resolve => setTimeout(resolve, 1000)); // 더 긴 대기 시간
        } catch (closeError) {
          console.log('데이터베이스 닫기 실패 (무시):', closeError);
        }
        this.db = null;
      }

      // 데이터베이스가 이미 열려있는지 확인하고 안전하게 열기
      let retryCount = 0;
      const maxRetries = 5; // 재시도 횟수 증가
      
      while (retryCount < maxRetries) {
        try {
          this.db = await SQLite.openDatabaseAsync(DB_CONFIG.name);
          break;
        } catch (openError) {
          retryCount++;
          if (retryCount >= maxRetries) {
            throw openError;
          }
          console.log(`데이터베이스 열기 재시도 ${retryCount}/${maxRetries}`);
          await new Promise(resolve => setTimeout(resolve, 2000 * retryCount)); // 더 긴 대기 시간
        }
      }
      
      // WAL 모드 활성화로 동시 접근 개선
      await this.db.execAsync('PRAGMA journal_mode=WAL;');
      await this.db.execAsync('PRAGMA synchronous=NORMAL;');
      await this.db.execAsync('PRAGMA cache_size=10000;');
      await this.db.execAsync('PRAGMA temp_store=MEMORY;');
      await this.db.execAsync('PRAGMA busy_timeout=30000;'); // 30초 대기
      
      await this.migrateDatabase();
      console.log('데이터베이스 초기화 완료');
    } catch (error) {
      console.error('데이터베이스 초기화 실패:', error);
      
      // 초기화 실패 시 데이터베이스 재생성 시도 (더 안전하게)
      try {
        console.log('데이터베이스 재생성 시도...');
        
        // 기존 연결 완전히 정리
        if (this.db) {
          try {
            await this.db.closeAsync();
          } catch (closeError) {
            console.log('재생성 전 데이터베이스 닫기 실패 (무시):', closeError);
          }
          this.db = null;
        }
        
        // 충분한 대기 시간 후 재생성
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // 데이터베이스 삭제 시도 (실패해도 계속 진행)
        try {
          await SQLite.deleteDatabaseAsync(DB_CONFIG.name);
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (deleteError) {
          console.log('데이터베이스 삭제 실패 (무시):', deleteError);
        }
        
        // 새로운 데이터베이스 생성
        this.db = await SQLite.openDatabaseAsync(DB_CONFIG.name);
        await this.db.execAsync('PRAGMA journal_mode=WAL;');
        await this.db.execAsync('PRAGMA synchronous=NORMAL;');
        await this.db.execAsync('PRAGMA busy_timeout=30000;');
        await this.migrateDatabase();
        console.log('데이터베이스 재생성 완료');
      } catch (retryError) {
        console.error('데이터베이스 재생성 실패:', retryError);
        // 재생성도 실패하면 기본 데이터베이스로 계속 진행
        console.log('기본 데이터베이스로 계속 진행...');
        this.db = null;
      }
    }
  }

  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 5,
    delay: number = 1000
  ): Promise<T> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // 데이터베이스 연결 확인 및 재초기화
        if (!this.db) {
          await this.init();
        }
        
        // 데이터베이스가 여전히 null이면 재시도
        if (!this.db) {
          throw new Error('데이터베이스 연결 실패');
        }
        
        return await operation();
      } catch (error) {
        const isRetryableError = error instanceof Error && (
          error.message.includes('database is locked') ||
          error.message.includes('database is closed') ||
          error.message.includes('finalizeAsync') ||
          error.message.includes('NullPointerException') ||
          error.message.includes('Access to closed resource') ||
          error.message.includes('prepareAsync') ||
          error.message.includes('shared object that was already released') ||
          error.message.includes('Unable to delete database') ||
          error.message.includes('currently open')
        );
        
        if (isRetryableError) {
          if (attempt === maxRetries) {
            console.error(`데이터베이스 작업 실패 (${maxRetries}회 재시도 후):`, error);
            // 마지막 시도에서도 실패하면 데이터베이스 재초기화
            try {
              console.log('데이터베이스 재초기화 시도...');
              await this.init();
              if (this.db) {
                return await operation();
              } else {
                throw new Error('데이터베이스 재초기화 실패');
              }
            } catch (finalError) {
              console.error('데이터베이스 재초기화 실패:', finalError);
              throw finalError;
            }
          }
          console.log(`데이터베이스 오류 감지. ${delay}ms 후 재시도 (${attempt}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 1.5; // 지수 백오프
        } else {
          throw error;
        }
      }
    }
    throw new Error('최대 재시도 횟수 초과');
  }

  private async migrateDatabase(): Promise<void> {
    if (!this.db) throw new Error('데이터베이스가 초기화되지 않았습니다.');

    // 데이터베이스 버전 확인
    const version = await this.getDatabaseVersion();
    
    if (version === 0) {
      // 새 데이터베이스 - 모든 테이블 생성
      await this.createTables();
      await this.setDatabaseVersion(3);
    } else if (version === 1) {
      // 기존 데이터베이스 - 마이그레이션 수행
      await this.migrateFromV1ToV2();
      await this.setDatabaseVersion(2);
    } else if (version === 2) {
      // v2에서 v3로 마이그레이션 (보안 설정 추가)
      await this.migrateFromV2ToV3();
      await this.setDatabaseVersion(3);
    }
  }

  private async getDatabaseVersion(): Promise<number> {
    if (!this.db) return 0;

    try {
      // settings 테이블이 있는지 확인
      const result = await this.db.getFirstAsync(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='settings'"
      );
      
      if (!result) {
        return 0; // 새 데이터베이스
      }

      // version 설정 확인
      const versionResult = await this.db.getFirstAsync(
        'SELECT value FROM settings WHERE key = ?',
        'database_version'
      ) as any;

      return versionResult ? parseInt(versionResult.value) : 1;
    } catch (error) {
      return 0;
    }
  }

  private async setDatabaseVersion(version: number): Promise<void> {
    if (!this.db) return;
    
    await this.db.runAsync(
      'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
      ['database_version', version.toString()]
    );
  }

  private async migrateFromV1ToV2(): Promise<void> {
    if (!this.db) throw new Error('데이터베이스가 초기화되지 않았습니다.');

    console.log('데이터베이스 마이그레이션 시작: v1 → v2');

    // 1. 일기장 테이블 생성
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS diary_books (
        id TEXT PRIMARY KEY,
        name TEXT,
        created_at INTEGER,
        updated_at INTEGER,
        is_default INTEGER DEFAULT 0
      );
    `);

    // 2. 기본 일기장 생성
    const defaultBookId = this.generateId();
    const now = Date.now();
    await this.db.runAsync(
      'INSERT INTO diary_books (id, name, created_at, updated_at, is_default) VALUES (?, ?, ?, ?, ?)',
      [defaultBookId, '기본 일기장', now, now, 1]
    );

    // 3. 기존 diaries 테이블에 diary_book_id 컬럼 추가
    try {
      await this.db.execAsync(`
        ALTER TABLE diaries ADD COLUMN diary_book_id TEXT;
      `);
    } catch (error) {
      // 컬럼이 이미 존재하는 경우 무시
      console.log('diary_book_id 컬럼이 이미 존재합니다.');
    }

    // 4. 기존 일기들을 기본 일기장에 할당
    await this.db.runAsync(
      'UPDATE diaries SET diary_book_id = ? WHERE diary_book_id IS NULL',
      [defaultBookId]
    );

    // 5. 외래키 제약조건 추가 (SQLite에서는 ALTER TABLE로 외래키를 추가할 수 없으므로 새 테이블 생성)
    const tempTable = 'diaries_temp';
    
    // 임시 테이블 생성
    await this.db.execAsync(`
      CREATE TABLE ${tempTable} (
        id TEXT PRIMARY KEY,
        diary_book_id TEXT,
        title TEXT,
        content TEXT,
        mood INTEGER DEFAULT 3,
        created_at INTEGER,
        updated_at INTEGER,
        pinned INTEGER DEFAULT 0,
        is_encrypted INTEGER DEFAULT 0,
        tags TEXT,
        images TEXT,
        metadata TEXT,
        FOREIGN KEY (diary_book_id) REFERENCES diary_books (id)
      );
    `);

    // 기존 데이터 복사
    await this.db.execAsync(`
      INSERT INTO ${tempTable} 
      SELECT id, diary_book_id, title, content, mood, created_at, updated_at, 
             pinned, is_encrypted, tags, images, metadata 
      FROM diaries;
    `);

    // 기존 테이블 삭제
    await this.db.execAsync('DROP TABLE diaries;');

    // 새 테이블을 diaries로 이름 변경
    await this.db.execAsync(`ALTER TABLE ${tempTable} RENAME TO diaries;`);

    // 인덱스 재생성
    await this.db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_diaries_created_at ON diaries(created_at);
      CREATE INDEX IF NOT EXISTS idx_diaries_mood ON diaries(mood);
      CREATE INDEX IF NOT EXISTS idx_diaries_pinned ON diaries(pinned);
      CREATE INDEX IF NOT EXISTS idx_diaries_diary_book_id ON diaries(diary_book_id);
    `);

    console.log('데이터베이스 마이그레이션 완료: v1 → v2');
  }

  private async migrateFromV2ToV3(): Promise<void> {
    if (!this.db) throw new Error('데이터베이스가 초기화되지 않았습니다.');

    console.log('데이터베이스 마이그레이션 시작: v2 → v3');

    try {
      // 보안 설정 테이블 생성
      await this.db.runAsync(`
        CREATE TABLE IF NOT EXISTS security_settings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          is_enabled INTEGER DEFAULT 0,
          lock_type TEXT DEFAULT 'pin',
          pin_code TEXT,
          pattern TEXT,
          biometric_enabled INTEGER DEFAULT 0,
          backup_unlock_enabled INTEGER DEFAULT 0,
          security_questions TEXT,
          created_at INTEGER,
          updated_at INTEGER
        );
      `);

      // 보안 질문 테이블 생성
      await this.db.runAsync(`
        CREATE TABLE IF NOT EXISTS security_questions (
          id TEXT PRIMARY KEY,
          question TEXT NOT NULL,
          answer TEXT NOT NULL,
          created_at INTEGER
        );
      `);

      console.log('데이터베이스 마이그레이션 완료: v2 → v3');
    } catch (error) {
      console.error('마이그레이션 중 오류 발생:', error);
      // 테이블이 이미 존재하는 경우 무시
      if (error instanceof Error && error.message.includes('already exists')) {
        console.log('테이블이 이미 존재합니다.');
      } else {
        throw error;
      }
    }
  }

  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('데이터베이스가 초기화되지 않았습니다.');

    // 일기장 테이블 생성
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS diary_books (
        id TEXT PRIMARY KEY,
        name TEXT,
        created_at INTEGER,
        updated_at INTEGER,
        is_default INTEGER DEFAULT 0
      );
    `);

    // 일기 테이블 생성
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS diaries (
        id TEXT PRIMARY KEY,
        diary_book_id TEXT,
        title TEXT,
        content TEXT,
        mood INTEGER DEFAULT 3,
        created_at INTEGER,
        updated_at INTEGER,
        pinned INTEGER DEFAULT 0,
        is_encrypted INTEGER DEFAULT 0,
        tags TEXT,
        images TEXT,
        metadata TEXT,
        FOREIGN KEY (diary_book_id) REFERENCES diary_books (id)
      );
    `);

    // 설정 테이블 생성
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
      );
    `);

    // 백업 히스토리 테이블 생성
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS backup_history (
        id TEXT PRIMARY KEY,
        backup_date INTEGER,
        file_size INTEGER,
        file_path TEXT
      );
    `);

    // 보안 설정 테이블 생성
    await this.db.runAsync(`
      CREATE TABLE IF NOT EXISTS security_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        is_enabled INTEGER DEFAULT 0,
        lock_type TEXT DEFAULT 'pin',
        pin_code TEXT,
        pattern TEXT,
        biometric_enabled INTEGER DEFAULT 0,
        backup_unlock_enabled INTEGER DEFAULT 0,
        security_questions TEXT,
        created_at INTEGER,
        updated_at INTEGER
      );
    `);

    // 보안 질문 테이블 생성
    await this.db.runAsync(`
      CREATE TABLE IF NOT EXISTS security_questions (
        id TEXT PRIMARY KEY,
        question TEXT NOT NULL,
        answer TEXT NOT NULL,
        created_at INTEGER
      );
    `);

    // 인덱스 생성
    await this.db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_diaries_created_at ON diaries(created_at);
      CREATE INDEX IF NOT EXISTS idx_diaries_mood ON diaries(mood);
      CREATE INDEX IF NOT EXISTS idx_diaries_pinned ON diaries(pinned);
      CREATE INDEX IF NOT EXISTS idx_diaries_diary_book_id ON diaries(diary_book_id);
    `);

    // 기본 일기장 생성
    await this.createDefaultDiaryBook();
  }

  // 기본 일기장 생성
  private async createDefaultDiaryBook(): Promise<void> {
    if (!this.db) throw new Error('데이터베이스가 초기화되지 않았습니다.');

    const existingDefault = await this.db.getFirstAsync(
      'SELECT id FROM diary_books WHERE is_default = 1'
    );

    if (!existingDefault) {
      const id = this.generateId();
      const now = Date.now();
      
      await this.db.runAsync(
        'INSERT INTO diary_books (id, name, created_at, updated_at, is_default) VALUES (?, ?, ?, ?, ?)',
        [id, '기본 일기장', now, now, 1]
      );
    }
  }

  // 일기장 CRUD 작업
  async createDiaryBook(name: string): Promise<string> {
    if (!this.db) throw new Error('데이터베이스가 초기화되지 않았습니다.');

    const id = this.generateId();
    const now = Date.now();

    await this.db.runAsync(
      'INSERT INTO diary_books (id, name, created_at, updated_at, is_default) VALUES (?, ?, ?, ?, ?)',
      [id, name, now, now, 0]
    );

    return id;
  }

  async getDiaryBooks(): Promise<DiaryBook[]> {
    if (!this.db) throw new Error('데이터베이스가 초기화되지 않았습니다.');

    const results = await this.executeWithRetry(async () => {
      return await this.db!.getAllAsync(
        'SELECT * FROM diary_books ORDER BY created_at ASC'
      ) as any[];
    });

    return results.map(row => ({
      id: row.id,
      name: row.name,
      created_at: row.created_at,
      updated_at: row.updated_at,
      is_default: Boolean(row.is_default),
    }));
  }

  async getCurrentDiaryBookId(): Promise<string> {
    if (!this.db) throw new Error('데이터베이스가 초기화되지 않았습니다.');

    const currentId = await this.getSetting('currentDiaryBookId');
    if (currentId) return currentId;

    // 기본 일기장 ID 반환
    const defaultBook = await this.executeWithRetry(async () => {
      return await this.db!.getFirstAsync(
        'SELECT id FROM diary_books WHERE is_default = 1'
      ) as any;
    });

    return defaultBook?.id || '';
  }

  async setCurrentDiaryBookId(diaryBookId: string): Promise<void> {
    await this.setSetting('currentDiaryBookId', diaryBookId);
  }

  async updateDiaryBook(diaryBookId: string, name: string): Promise<void> {
    if (!this.db) throw new Error('데이터베이스가 초기화되지 않았습니다.');

    const now = Date.now();
    await this.db.runAsync(
      'UPDATE diary_books SET name = ?, updated_at = ? WHERE id = ?',
      [name, now, diaryBookId]
    );
  }

  // 일기 CRUD 작업
  async createDiary(diary: Omit<Diary, 'id' | 'created_at' | 'updated_at'>): Promise<string> {
    if (!this.db) throw new Error('데이터베이스가 초기화되지 않았습니다.');

    const id = this.generateId();
    const now = Date.now();
    const diaryBookId = diary.diary_book_id || await this.getCurrentDiaryBookId();

    await this.db.runAsync(
      `INSERT INTO diaries (id, diary_book_id, title, content, mood, created_at, updated_at, pinned, is_encrypted, tags, images, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        diaryBookId,
        diary.title,
        diary.content,
        diary.mood,
        now,
        now,
        diary.pinned ? 1 : 0,
        diary.is_encrypted ? 1 : 0,
        JSON.stringify(diary.tags),
        JSON.stringify(diary.images),
        JSON.stringify(diary.metadata),
      ]
    );

    return id;
  }

  async getDiary(id: string): Promise<Diary | null> {
    if (!this.db) throw new Error('데이터베이스가 초기화되지 않았습니다.');

    const result = await this.executeWithRetry(async () => {
      return await this.db!.getFirstAsync(
        'SELECT * FROM diaries WHERE id = ?',
        id
      ) as any;
    });

    if (!result) return null;

    return this.mapRowToDiary(result);
  }

  async getDiaries(limit: number = DB_CONFIG.initialLoadCount, offset: number = 0, diaryBookId?: string): Promise<Diary[]> {
    if (!this.db) throw new Error('데이터베이스가 초기화되지 않았습니다.');

    const currentDiaryBookId = diaryBookId || await this.getCurrentDiaryBookId();
    
    const results = await this.executeWithRetry(async () => {
      return await this.db!.getAllAsync(
        `SELECT * FROM diaries 
         WHERE diary_book_id = ?
         ORDER BY created_at DESC 
         LIMIT ? OFFSET ?`,
        currentDiaryBookId, limit, offset
      ) as any[];
    });

    return results.map(row => this.mapRowToDiary(row));
  }

  async updateDiary(id: string, updates: Partial<Diary>): Promise<void> {
    if (!this.db) throw new Error('데이터베이스가 초기화되지 않았습니다.');

    const setClause = [];
    const values = [];

    if (updates.title !== undefined) {
      setClause.push('title = ?');
      values.push(updates.title);
    }
    if (updates.content !== undefined) {
      setClause.push('content = ?');
      values.push(updates.content);
    }
    if (updates.mood !== undefined) {
      setClause.push('mood = ?');
      values.push(updates.mood);
    }
    if (updates.pinned !== undefined) {
      setClause.push('pinned = ?');
      values.push(updates.pinned ? 1 : 0);
    }
    if (updates.is_encrypted !== undefined) {
      setClause.push('is_encrypted = ?');
      values.push(updates.is_encrypted ? 1 : 0);
    }
    if (updates.tags !== undefined) {
      setClause.push('tags = ?');
      values.push(JSON.stringify(updates.tags));
    }
    if (updates.images !== undefined) {
      setClause.push('images = ?');
      values.push(JSON.stringify(updates.images));
    }
    if (updates.metadata !== undefined) {
      setClause.push('metadata = ?');
      values.push(JSON.stringify(updates.metadata));
    }

    setClause.push('updated_at = ?');
    values.push(Date.now());
    values.push(id);

    await this.db.runAsync(
      `UPDATE diaries SET ${setClause.join(', ')} WHERE id = ?`,
      values
    );
  }

  async deleteDiary(id: string): Promise<void> {
    if (!this.db) throw new Error('데이터베이스가 초기화되지 않았습니다.');

    await this.db.runAsync('DELETE FROM diaries WHERE id = ?', [id]);
  }

  async searchDiaries(query: string, limit: number = 30, offset: number = 0): Promise<Diary[]> {
    if (!this.db) throw new Error('데이터베이스가 초기화되지 않았습니다.');

    const searchTerm = `%${query}%`;
    const results = await this.db.getAllAsync(
      `SELECT * FROM diaries 
       WHERE title LIKE ? OR content LIKE ? OR tags LIKE ?
       ORDER BY created_at DESC 
       LIMIT ? OFFSET ?`,
      [searchTerm, searchTerm, searchTerm, limit, offset]
    ) as any[];

    return results.map(row => this.mapRowToDiary(row));
  }

  // 설정 관리
  async getSetting(key: string): Promise<string | null> {
    if (!this.db) throw new Error('데이터베이스가 초기화되지 않았습니다.');

    const result = await this.executeWithRetry(async () => {
      return await this.db!.getFirstAsync(
        'SELECT value FROM settings WHERE key = ?',
        key
      ) as any;
    });

    return result?.value || null;
  }

  async setSetting(key: string, value: string): Promise<void> {
    if (!this.db) throw new Error('데이터베이스가 초기화되지 않았습니다.');

    await this.executeWithRetry(async () => {
      await this.db!.runAsync(
        'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
        [key, value]
      );
    });
  }

  // 보안 설정 관련 메서드들
  async getSecuritySettings(): Promise<SecuritySettings | null> {
    if (!this.db) throw new Error('데이터베이스가 초기화되지 않았습니다.');

    return this.executeWithRetry(async () => {
      const result = await this.db!.getFirstAsync(
        'SELECT * FROM security_settings ORDER BY id DESC LIMIT 1'
      ) as any;

      if (!result) return null;

      return {
        isEnabled: Boolean(result.is_enabled),
        lockType: result.lock_type || 'pin',
        pinCode: result.pin_code,
        pattern: result.pattern,
        biometricEnabled: Boolean(result.biometric_enabled),
        backupUnlockEnabled: Boolean(result.backup_unlock_enabled),
        securityQuestions: result.security_questions ? JSON.parse(result.security_questions) : [],
        createdAt: result.created_at,
        updatedAt: result.updated_at,
      };
    });
  }

  async saveSecuritySettings(settings: SecuritySettings): Promise<void> {
    if (!this.db) throw new Error('데이터베이스가 초기화되지 않았습니다.');

    return this.executeWithRetry(async () => {
      const now = Date.now();
      await this.db!.runAsync(`
        INSERT OR REPLACE INTO security_settings 
        (is_enabled, lock_type, pin_code, pattern, biometric_enabled, backup_unlock_enabled, security_questions, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        settings.isEnabled ? 1 : 0,
        settings.lockType,
        settings.pinCode || null,
        settings.pattern || null,
        settings.biometricEnabled ? 1 : 0,
        settings.backupUnlockEnabled ? 1 : 0,
        settings.securityQuestions ? JSON.stringify(settings.securityQuestions) : null,
        settings.createdAt || now,
        now,
      ]);
    });
  }

  async updateSecuritySettings(updates: Partial<SecuritySettings>): Promise<void> {
    if (!this.db) throw new Error('데이터베이스가 초기화되지 않았습니다.');

    return this.executeWithRetry(async () => {
      const existing = await this.getSecuritySettings();
      if (!existing) {
        throw new Error('보안 설정이 존재하지 않습니다.');
      }

      const updatedSettings: SecuritySettings = {
        ...existing,
        ...updates,
        updatedAt: Date.now(),
      };

      await this.saveSecuritySettings(updatedSettings);
    });
  }

  async deleteSecuritySettings(): Promise<void> {
    if (!this.db) throw new Error('데이터베이스가 초기화되지 않았습니다.');

    return this.executeWithRetry(async () => {
      await this.db!.runAsync('DELETE FROM security_settings');
      await this.db!.runAsync('DELETE FROM security_questions');
    });
  }

  // 가데이터 생성 메서드
  async generateSampleData(): Promise<void> {
    if (!this.db) throw new Error('데이터베이스가 초기화되지 않았습니다.');

    try {
      // 기본 일기장 생성
      const defaultDiaryBook = {
        id: 'default-diary-book',
        name: '나의 일기장',
        created_at: Date.now(),
        updated_at: Date.now(),
        is_default: 1
      };

      await this.db.runAsync(`
        INSERT OR REPLACE INTO diary_books (id, name, created_at, updated_at, is_default)
        VALUES (?, ?, ?, ?, ?)
      `, [defaultDiaryBook.id, defaultDiaryBook.name, defaultDiaryBook.created_at, defaultDiaryBook.updated_at, defaultDiaryBook.is_default]);

      // 2025년 6월~9월 가데이터 생성 (월별 5개씩)
      const sampleDiaries = [
        // 6월
        {
          date: '2025-06-01',
          title: '6월의 시작',
          content: '새로운 달이 시작되었다. 6월은 여름의 시작이자 반년의 중간점이다. 올해 상반기에 이루고 싶었던 목표들을 되돌아보며, 하반기 계획을 세워보았다.',
          mood: 4,
          tags: '새로운 시작,목표,계획'
        },
        {
          date: '2025-06-08',
          title: '따뜻한 햇살',
          content: '오늘은 정말 좋은 날씨였다. 창문을 열고 들어오는 따뜻한 햇살이 마음을 밝게 해주었다. 점심시간에 공원을 산책하며 자연의 소리를 들었다.',
          mood: 5,
          tags: '날씨,산책,자연'
        },
        {
          date: '2025-06-15',
          title: '친구와의 만남',
          content: '오랜만에 대학교 동기 친구를 만났다. 각자 다른 길을 걷고 있지만, 만나면 여전히 예전과 같은 편안함이 있다.',
          mood: 5,
          tags: '친구,만남,우정'
        },
        {
          date: '2025-06-22',
          title: '새로운 도전',
          content: '오늘부터 새로운 프로젝트를 시작했다. 처음에는 막막했지만, 차근차근 계획을 세우며 진행해보니 생각보다 할 만하다.',
          mood: 4,
          tags: '새로운 도전,프로젝트,성장'
        },
        {
          date: '2025-06-29',
          title: '6월의 마무리',
          content: '6월의 마지막 날이다. 한 달이 이렇게 빨리 지나갔나 싶다. 이번 달에는 새로운 것들을 많이 시도해보고, 좋은 사람들과 만나고, 소중한 시간들을 보냈다.',
          mood: 5,
          tags: '6월 마무리,회고,7월 계획'
        },
        // 7월
        {
          date: '2025-07-01',
          title: '7월의 시작',
          content: '7월이 시작되었다. 여름이 본격적으로 시작되는 느낌이다. 더위가 시작되지만, 여름만의 특별한 매력도 있다.',
          mood: 4,
          tags: '7월,여름,시작'
        },
        {
          date: '2025-07-08',
          title: '시원한 바다',
          content: '오늘은 바다에 갔다. 파도 소리와 시원한 바닷바람이 마음을 시원하게 해주었다. 여름 바다의 매력을 다시 한번 느꼈다.',
          mood: 5,
          tags: '바다,여름,휴가'
        },
        {
          date: '2025-07-15',
          title: '아이스크림의 맛',
          content: '더운 날씨에 아이스크림을 먹었다. 시원한 맛이 입안에서 퍼지면서 더위가 한순간에 사라지는 것 같았다.',
          mood: 4,
          tags: '아이스크림,여름,시원함'
        },
        {
          date: '2025-07-22',
          title: '여름밤의 산책',
          content: '저녁에 공원을 산책했다. 여름밤의 시원한 바람과 반딧불이들이 만들어내는 아름다운 풍경이 인상적이었다.',
          mood: 4,
          tags: '산책,여름밤,자연'
        },
        {
          date: '2025-07-29',
          title: '7월의 마무리',
          content: '7월이 끝나간다. 이번 달에는 여름의 매력을 제대로 느낄 수 있었다. 8월에도 좋은 추억을 만들어야겠다.',
          mood: 4,
          tags: '7월 마무리,여름,추억'
        },
        // 8월
        {
          date: '2025-08-01',
          title: '8월의 시작',
          content: '8월이 시작되었다. 여름의 절정기다. 더위가 심하지만 여름의 마지막을 제대로 즐겨야겠다.',
          mood: 4,
          tags: '8월,여름,절정'
        },
        {
          date: '2025-08-08',
          title: '여름 축제',
          content: '오늘은 여름 축제에 갔다. 다양한 음식과 공연을 즐기며 여름의 즐거움을 만끽했다.',
          mood: 5,
          tags: '축제,여름,즐거움'
        },
        {
          date: '2025-08-15',
          title: '광복절',
          content: '광복절이다. 조상들의 희생을 기리며 자유와 평화의 소중함을 다시 한번 생각해본다.',
          mood: 3,
          tags: '광복절,역사,감사'
        },
        {
          date: '2025-08-22',
          title: '여름의 끝',
          content: '여름이 끝나가는 느낌이다. 아직 더위는 있지만 가을이 오고 있다는 신호를 느낄 수 있다.',
          mood: 3,
          tags: '여름 끝,가을,계절'
        },
        {
          date: '2025-08-29',
          title: '8월의 마무리',
          content: '8월의 마지막 날이다. 여름의 마지막을 보내며 가을을 준비해야겠다.',
          mood: 4,
          tags: '8월 마무리,여름 끝,가을 준비'
        },
        // 9월
        {
          date: '2025-09-01',
          title: '9월의 시작',
          content: '9월이 시작되었다. 가을이 시작되는 달이다. 선선한 바람과 함께 새로운 시작을 맞이한다.',
          mood: 4,
          tags: '9월,가을,시작'
        },
        {
          date: '2025-09-08',
          title: '가을의 첫걸음',
          content: '가을의 첫걸음을 내딛었다. 선선한 바람과 노란 단풍이 가을의 시작을 알려준다.',
          mood: 4,
          tags: '가을,단풍,바람'
        },
        {
          date: '2025-09-15',
          title: '추석 연휴',
          content: '추석 연휴다. 가족들과 함께 보내는 시간이 정말 소중하다. 맛있는 음식과 함께하는 대화가 좋다.',
          mood: 5,
          tags: '추석,가족,연휴'
        },
        {
          date: '2025-09-18',
          title: '가을의 매력',
          content: '가을의 매력을 제대로 느꼈다. 선선한 날씨와 아름다운 단풍이 마음을 평화롭게 해준다.',
          mood: 5,
          tags: '가을,단풍,평화'
        },
        {
          date: '2025-09-21',
          title: '9월의 중반',
          content: '9월의 중반이다. 가을이 본격적으로 시작되어 자연의 변화를 느낄 수 있다. 새로운 계절의 시작이 기대된다.',
          mood: 4,
          tags: '9월 중반,가을,자연'
        }
      ];

      for (const diary of sampleDiaries) {
        const date = new Date(diary.date);
        const timestamp = date.getTime();
        
        await this.db.runAsync(`
          INSERT OR REPLACE INTO diaries 
          (id, diary_book_id, title, content, mood, created_at, updated_at, pinned, is_encrypted, tags, images, metadata)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          `diary-${diary.date}`,
          defaultDiaryBook.id,
          diary.title,
          diary.content,
          diary.mood,
          timestamp,
          timestamp,
          0,
          0,
          JSON.stringify(diary.tags.split(',')), // tags를 JSON 배열로 변환
          JSON.stringify([]), // images를 빈 배열로 저장
          JSON.stringify({}) // metadata를 빈 객체로 저장
        ]);
      }

      console.log('가데이터 생성 완료');
    } catch (error) {
      console.error('가데이터 생성 실패:', error);
      throw error;
    }
  }

  // 유틸리티 메서드
private mapRowToDiary(row: any): Diary {
    // JSON 파싱 오류 방지를 위한 안전한 파싱 함수
    const safeJsonParse = (jsonString: string, defaultValue: any) => {
      try {
        // 빈 문자열이나 null인 경우 기본값 반환
        if (!jsonString || jsonString.trim() === '') {
          return defaultValue;
        }
        
        // JSON 형식이 아닌 문자열인 경우 (한글이 포함된 경우) 기본값 반환
        if (!jsonString.startsWith('[') && !jsonString.startsWith('{')) {
          return defaultValue;
        }
        
        return JSON.parse(jsonString);
      } catch (error) {
        // 로그를 한 번만 출력하도록 수정
        if (!this.jsonParseErrorLogged) {
          console.log('JSON 파싱 오류 감지, 기본값 사용:', jsonString.substring(0, 50) + '...');
          this.jsonParseErrorLogged = true;
        }
        return defaultValue;
      }
    };

    return {
      id: row.id || '',
      diary_book_id: row.diary_book_id || '',
      title: row.title || '',
      content: row.content || '',
      mood: row.mood !== null && row.mood !== undefined ? row.mood : 2, // 기본값: 보통
      created_at: row.created_at || Date.now(),
      updated_at: row.updated_at || Date.now(),
      pinned: Boolean(row.pinned),
      is_encrypted: Boolean(row.is_encrypted),
      tags: safeJsonParse(row.tags || '[]', []),
      images: safeJsonParse(row.images || '[]', []),
      metadata: safeJsonParse(row.metadata || '{}', {}),
    };
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  async close(): Promise<void> {
    if (this.db) {
      await this.db.closeAsync();
      this.db = null;
    }
  }
}

export default new DatabaseService();
