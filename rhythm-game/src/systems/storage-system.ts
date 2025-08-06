// 存储系统 - 使用IndexedDB存储游戏数据

// 数据库配置
const DB_NAME = 'RhythmGameDB';
const DB_VERSION = 1;

// 存储对象类型
export interface ScoreRecord {
  id?: number;
  songId: string;
  playerName: string;
  score: number;
  maxCombo: number;
  accuracy: number;
  perfects: number;
  goods: number;
  misses: number;
  date: Date;
  difficulty: string;
}

export interface GameSettings {
  id?: number;
  playerName: string;
  volume: number;
  effectsVolume: number;
  visualEffects: 'low' | 'medium' | 'high';
  handCalibration: any; // 手部校准数据
  lastPlayed: string | null; // 最后播放的歌曲ID
}

export interface CustomBeatMap {
  id?: number;
  name: string;
  songId: string;
  creator: string;
  difficulty: string;
  bpm: number;
  offset: number;
  beats: any[]; // 节拍点数据
  dateCreated: Date;
  dateModified: Date;
}

// 存储系统类
class StorageSystem {
  private db: IDBDatabase | null = null;
  private isInitialized: boolean = false;
  private initPromise: Promise<boolean> | null = null;
  
  /**
   * 初始化数据库
   * @returns Promise<boolean>
   */
  initialize(): Promise<boolean> {
    // 如果已经初始化或正在初始化，直接返回结果
    if (this.isInitialized) return Promise.resolve(true);
    if (this.initPromise) return this.initPromise;
    
    this.initPromise = new Promise((resolve, reject) => {
      // 打开数据库
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      
      // 数据库升级事件
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // 创建分数记录存储
        if (!db.objectStoreNames.contains('scores')) {
          const scoresStore = db.createObjectStore('scores', { keyPath: 'id', autoIncrement: true });
          scoresStore.createIndex('songId', 'songId', { unique: false });
          scoresStore.createIndex('playerName', 'playerName', { unique: false });
          scoresStore.createIndex('date', 'date', { unique: false });
        }
        
        // 创建游戏设置存储
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'id', autoIncrement: true });
        }
        
        // 创建自定义谱面存储
        if (!db.objectStoreNames.contains('beatmaps')) {
          const beatmapsStore = db.createObjectStore('beatmaps', { keyPath: 'id', autoIncrement: true });
          beatmapsStore.createIndex('songId', 'songId', { unique: false });
          beatmapsStore.createIndex('creator', 'creator', { unique: false });
          beatmapsStore.createIndex('dateModified', 'dateModified', { unique: false });
        }
      };
      
      // 数据库打开成功
      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        this.isInitialized = true;
        console.log('数据库初始化成功');
        resolve(true);
      };
      
      // 数据库打开失败
      request.onerror = (event) => {
        console.error('数据库初始化失败:', (event.target as IDBOpenDBRequest).error);
        reject((event.target as IDBOpenDBRequest).error);
      };
    });
    
    return this.initPromise;
  }
  
  /**
   * 保存分数记录
   * @param score 分数记录
   * @returns Promise<number> 记录ID
   */
  async saveScore(score: ScoreRecord): Promise<number> {
    await this.initialize();
    
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('数据库未初始化'));
        return;
      }
      
      const transaction = this.db.transaction('scores', 'readwrite');
      const store = transaction.objectStore('scores');
      
      // 添加记录
      const request = store.add({
        ...score,
        date: new Date() // 确保日期是当前时间
      });
      
      request.onsuccess = () => {
        resolve(request.result as number);
      };
      
      request.onerror = () => {
        reject(request.error);
      };
    });
  }
  
  /**
   * 获取指定歌曲的最高分数
   * @param songId 歌曲ID
   * @param difficulty 难度（可选）
   * @returns Promise<ScoreRecord | null>
   */
  async getHighScore(songId: string, difficulty?: string): Promise<ScoreRecord | null> {
    await this.initialize();
    
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('数据库未初始化'));
        return;
      }
      
      const transaction = this.db.transaction('scores', 'readonly');
      const store = transaction.objectStore('scores');
      const index = store.index('songId');
      
      // 获取所有匹配的记录
      const request = index.getAll(songId);
      
      request.onsuccess = () => {
        const scores = request.result as ScoreRecord[];
        
        // 过滤难度（如果指定）
        const filteredScores = difficulty 
          ? scores.filter(score => score.difficulty === difficulty)
          : scores;
        
        // 按分数排序并返回最高分
        if (filteredScores.length > 0) {
          const highScore = filteredScores.sort((a, b) => b.score - a.score)[0];
          resolve(highScore);
        } else {
          resolve(null);
        }
      };
      
      request.onerror = () => {
        reject(request.error);
      };
    });
  }
  
  /**
   * 获取排行榜
   * @param songId 歌曲ID（可选）
   * @param difficulty 难度（可选）
   * @param limit 限制数量（默认10）
   * @returns Promise<ScoreRecord[]>
   */
  async getLeaderboard(songId?: string, difficulty?: string, limit: number = 10): Promise<ScoreRecord[]> {
    await this.initialize();
    
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('数据库未初始化'));
        return;
      }
      
      const transaction = this.db.transaction('scores', 'readonly');
      const store = transaction.objectStore('scores');
      
      // 获取所有记录或特定歌曲的记录
      const request = songId 
        ? store.index('songId').getAll(songId)
        : store.getAll();
      
      request.onsuccess = () => {
        let scores = request.result as ScoreRecord[];
        
        // 过滤难度（如果指定）
        if (difficulty) {
          scores = scores.filter(score => score.difficulty === difficulty);
        }
        
        // 按分数排序并限制数量
        scores = scores.sort((a, b) => b.score - a.score).slice(0, limit);
        
        resolve(scores);
      };
      
      request.onerror = () => {
        reject(request.error);
      };
    });
  }
  
  /**
   * 保存游戏设置
   * @param settings 游戏设置
   * @returns Promise<number> 设置ID
   */
  async saveSettings(settings: GameSettings): Promise<number> {
    await this.initialize();
    
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('数据库未初始化'));
        return;
      }
      
      const transaction = this.db.transaction('settings', 'readwrite');
      const store = transaction.objectStore('settings');
      
      // 获取现有设置
      const getRequest = store.getAll();
      
      getRequest.onsuccess = () => {
        const existingSettings = getRequest.result as GameSettings[];
        
        if (existingSettings.length > 0) {
          // 更新现有设置
          const updateRequest = store.put({
            ...settings,
            id: existingSettings[0].id
          });
          
          updateRequest.onsuccess = () => {
            resolve(updateRequest.result as number);
          };
          
          updateRequest.onerror = () => {
            reject(updateRequest.error);
          };
        } else {
          // 添加新设置
          const addRequest = store.add(settings);
          
          addRequest.onsuccess = () => {
            resolve(addRequest.result as number);
          };
          
          addRequest.onerror = () => {
            reject(addRequest.error);
          };
        }
      };
      
      getRequest.onerror = () => {
        reject(getRequest.error);
      };
    });
  }
  
  /**
   * 获取游戏设置
   * @returns Promise<GameSettings | null>
   */
  async getSettings(): Promise<GameSettings | null> {
    await this.initialize();
    
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('数据库未初始化'));
        return;
      }
      
      const transaction = this.db.transaction('settings', 'readonly');
      const store = transaction.objectStore('settings');
      
      // 获取所有设置
      const request = store.getAll();
      
      request.onsuccess = () => {
        const settings = request.result as GameSettings[];
        
        if (settings.length > 0) {
          resolve(settings[0]);
        } else {
          // 返回默认设置
          resolve({
            playerName: '玩家',
            volume: 0.8,
            effectsVolume: 0.5,
            visualEffects: 'medium',
            handCalibration: null,
            lastPlayed: null
          });
        }
      };
      
      request.onerror = () => {
        reject(request.error);
      };
    });
  }
  
  /**
   * 保存自定义谱面
   * @param beatmap 自定义谱面
   * @returns Promise<number> 谱面ID
   */
  async saveBeatMap(beatmap: CustomBeatMap): Promise<number> {
    await this.initialize();
    
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('数据库未初始化'));
        return;
      }
      
      const transaction = this.db.transaction('beatmaps', 'readwrite');
      const store = transaction.objectStore('beatmaps');
      
      // 设置修改日期
      const updatedBeatmap = {
        ...beatmap,
        dateModified: new Date()
      };
      
      // 如果有ID，更新现有谱面，否则添加新谱面
      const request = beatmap.id 
        ? store.put(updatedBeatmap)
        : store.add({
            ...updatedBeatmap,
            dateCreated: new Date() // 新谱面设置创建日期
          });
      
      request.onsuccess = () => {
        resolve(request.result as number);
      };
      
      request.onerror = () => {
        reject(request.error);
      };
    });
  }
  
  /**
   * 获取自定义谱面
   * @param id 谱面ID
   * @returns Promise<CustomBeatMap | null>
   */
  async getBeatMap(id: number): Promise<CustomBeatMap | null> {
    await this.initialize();
    
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('数据库未初始化'));
        return;
      }
      
      const transaction = this.db.transaction('beatmaps', 'readonly');
      const store = transaction.objectStore('beatmaps');
      
      // 获取指定ID的谱面
      const request = store.get(id);
      
      request.onsuccess = () => {
        resolve(request.result as CustomBeatMap || null);
      };
      
      request.onerror = () => {
        reject(request.error);
      };
    });
  }
  
  /**
   * 获取歌曲的所有自定义谱面
   * @param songId 歌曲ID
   * @returns Promise<CustomBeatMap[]>
   */
  async getBeatMapsBySong(songId: string): Promise<CustomBeatMap[]> {
    await this.initialize();
    
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('数据库未初始化'));
        return;
      }
      
      const transaction = this.db.transaction('beatmaps', 'readonly');
      const store = transaction.objectStore('beatmaps');
      const index = store.index('songId');
      
      // 获取指定歌曲的所有谱面
      const request = index.getAll(songId);
      
      request.onsuccess = () => {
        resolve(request.result as CustomBeatMap[]);
      };
      
      request.onerror = () => {
        reject(request.error);
      };
    });
  }
  
  /**
   * 获取所有自定义谱面
   * @returns Promise<CustomBeatMap[]>
   */
  async getAllBeatMaps(): Promise<CustomBeatMap[]> {
    await this.initialize();
    
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('数据库未初始化'));
        return;
      }
      
      const transaction = this.db.transaction('beatmaps', 'readonly');
      const store = transaction.objectStore('beatmaps');
      
      // 获取所有谱面
      const request = store.getAll();
      
      request.onsuccess = () => {
        resolve(request.result as CustomBeatMap[]);
      };
      
      request.onerror = () => {
        reject(request.error);
      };
    });
  }
  
  /**
   * 删除自定义谱面
   * @param id 谱面ID
   * @returns Promise<void>
   */
  async deleteBeatMap(id: number): Promise<void> {
    await this.initialize();
    
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('数据库未初始化'));
        return;
      }
      
      const transaction = this.db.transaction('beatmaps', 'readwrite');
      const store = transaction.objectStore('beatmaps');
      
      // 删除指定ID的谱面
      const request = store.delete(id);
      
      request.onsuccess = () => {
        resolve();
      };
      
      request.onerror = () => {
        reject(request.error);
      };
    });
  }
  
  /**
   * 清理数据库
   * @returns Promise<void>
   */
  async clearDatabase(): Promise<void> {
    await this.initialize();
    
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('数据库未初始化'));
        return;
      }
      
      // 清理所有存储
      const transaction = this.db.transaction(['scores', 'settings', 'beatmaps'], 'readwrite');
      
      transaction.oncomplete = () => {
        resolve();
      };
      
      transaction.onerror = () => {
        reject(transaction.error);
      };
      
      // 清理各个存储
      transaction.objectStore('scores').clear();
      transaction.objectStore('settings').clear();
      transaction.objectStore('beatmaps').clear();
    });
  }
}

// 创建单例实例
export const storageSystem = new StorageSystem();