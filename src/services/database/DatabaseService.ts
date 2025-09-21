import * as SQLite from 'expo-sqlite';
import { Diary, Settings } from '../../types';
import { DB_CONFIG } from '../../constants';

class DatabaseService {
  private db: SQLite.SQLiteDatabase | null = null;

  async init(): Promise<void> {
    try {
      this.db = await SQLite.openDatabaseAsync(DB_CONFIG.name);
      await this.migrateDatabase();
    } catch (error) {
      console.error('데이터베이스 초기화 실패:', error);
      throw error;
    }
  }

  private async migrateDatabase(): Promise<void> {
    if (!this.db) throw new Error('데이터베이스가 초기화되지 않았습니다.');

    // 데이터베이스 버전 확인
    const version = await this.getDatabaseVersion();
    
    if (version === 0) {
      // 새 데이터베이스 - 모든 테이블 생성
      await this.createTables();
      await this.setDatabaseVersion(1);
    } else if (version === 1) {
      // 기존 데이터베이스 - 마이그레이션 수행
      await this.migrateFromV1ToV2();
      await this.setDatabaseVersion(2);
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

    const results = await this.db.getAllAsync(
      'SELECT * FROM diary_books ORDER BY created_at ASC'
    ) as any[];

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
    const defaultBook = await this.db.getFirstAsync(
      'SELECT id FROM diary_books WHERE is_default = 1'
    ) as any;

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

    const result = await this.db.getFirstAsync(
      'SELECT * FROM diaries WHERE id = ?',
      id
    ) as any;

    if (!result) return null;

    return this.mapRowToDiary(result);
  }

  async getDiaries(limit: number = DB_CONFIG.initialLoadCount, offset: number = 0, diaryBookId?: string): Promise<Diary[]> {
    if (!this.db) throw new Error('데이터베이스가 초기화되지 않았습니다.');

    const currentDiaryBookId = diaryBookId || await this.getCurrentDiaryBookId();
    
    const results = await this.db.getAllAsync(
      `SELECT * FROM diaries 
       WHERE diary_book_id = ?
       ORDER BY created_at DESC 
       LIMIT ? OFFSET ?`,
      [currentDiaryBookId, limit, offset]
    ) as any[];

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

    const result = await this.db.getFirstAsync(
      'SELECT value FROM settings WHERE key = ?',
      key
    ) as any;

    return result?.value || null;
  }

  async setSetting(key: string, value: string): Promise<void> {
    if (!this.db) throw new Error('데이터베이스가 초기화되지 않았습니다.');

    await this.db.runAsync(
      'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
      [key, value]
    );
  }

  // 유틸리티 메서드
  private mapRowToDiary(row: any): Diary {
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
      tags: JSON.parse(row.tags || '[]'),
      images: JSON.parse(row.images || '[]'),
      metadata: JSON.parse(row.metadata || '{}'),
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
