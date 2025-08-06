import * as THREE from 'three';
import { BeatPoint, BeatMap } from './rhythm-engine';
import { audioSystem } from './audio-system';
import { motionTracker } from './motion-tracker';
import { effectsManager } from './effects-manager';

// 判定结果类型
export type JudgementResult = 'perfect' | 'good' | 'miss' | null;

// 判定窗口（毫秒）
const JUDGEMENT_WINDOWS = {
  perfect: 50,  // ±50ms
  good: 100     // ±100ms
};

// 判定距离（单位）
const JUDGEMENT_DISTANCES = {
  perfect: 0.3, // 0.3单位内
  good: 0.6     // 0.6单位内
};

// 得分配置
const SCORE_CONFIG = {
  perfect: 100,
  good: 50,
  miss: 0,
  comboBonus: 0.1 // 每10连击增加10%得分
};

// 游戏状态类型
export type GameState = 'loading' | 'ready' | 'countdown' | 'playing' | 'paused' | 'finished';

// 游戏统计数据
export interface GameStats {
  score: number;
  combo: number;
  maxCombo: number;
  perfects: number;
  goods: number;
  misses: number;
  accuracy: number;
  totalNotes: number;
  hitNotes: number;
}

// 游戏配置
export interface GameConfig {
  difficulty: 'easy' | 'normal' | 'hard';
  autoPlay: boolean;
  visualEffects: 'low' | 'medium' | 'high';
  judgementVisibility: boolean;
  backgroundIntensity: number;
}

// 游戏事件回调
export interface GameCallbacks {
  onStateChange?: (state: GameState) => void;
  onScoreUpdate?: (stats: GameStats) => void;
  onJudgement?: (result: JudgementResult, position: THREE.Vector3) => void;
  onBeatCreate?: (beat: BeatPoint) => void;
  onBeatRemove?: (beat: BeatPoint) => void;
  onCountdown?: (count: number) => void;
  onGameComplete?: (stats: GameStats) => void;
}

// 游戏管理器类
export class GameManager {
  // 游戏状态
  private state: GameState = 'loading';
  private beatMap: BeatMap | null = null;
  private activeBeats: BeatPoint[] = [];
  private processedBeats: Set<number> = new Set();
  private missedBeats: Set<number> = new Set();
  private gameStartTime: number = 0;
  private lastUpdateTime: number = 0;
  private countdownValue: number = 3;
  private countdownInterval: any = null;
  
  // 游戏统计
  private stats: GameStats = {
    score: 0,
    combo: 0,
    maxCombo: 0,
    perfects: 0,
    goods: 0,
    misses: 0,
    accuracy: 100,
    totalNotes: 0,
    hitNotes: 0
  };
  
  // 游戏配置
  private config: GameConfig = {
    difficulty: 'normal',
    autoPlay: false,
    visualEffects: 'medium',
    judgementVisibility: true,
    backgroundIntensity: 0.5
  };
  
  // 回调函数
  private callbacks: GameCallbacks = {};
  
  // 场景引用
  private scene: THREE.Scene | null = null;
  
  /**
   * 初始化游戏管理器
   * @param scene Three.js场景
   * @param config 游戏配置
   * @param callbacks 回调函数
   */
  initialize(
    scene: THREE.Scene,
    config: Partial<GameConfig> = {},
    callbacks: GameCallbacks = {}
  ): void {
    this.scene = scene;
    this.config = { ...this.config, ...config };
    this.callbacks = callbacks;
    
    // 初始化特效管理器
    effectsManager.initialize(scene);
    
    // 重置游戏状态
    this.resetGameState();
    
    // 设置状态为就绪
    this.setState('ready');
  }
  
  /**
   * 加载谱面
   * @param beatMap 谱面数据
   */
  loadBeatMap(beatMap: BeatMap): void {
    this.beatMap = beatMap;
    
    // 更新总音符数
    this.stats.totalNotes = beatMap.beats.length;
    
    // 通知状态更新
    this.notifyScoreUpdate();
  }
  
  /**
   * 开始倒计时
   */
  startCountdown(): void {
    if (this.state !== 'ready') return;
    
    this.setState('countdown');
    this.countdownValue = 3;
    
    // 通知倒计时更新
    if (this.callbacks.onCountdown) {
      this.callbacks.onCountdown(this.countdownValue);
    }
    
    // 开始倒计时
    this.countdownInterval = setInterval(() => {
      this.countdownValue--;
      
      // 通知倒计时更新
      if (this.callbacks.onCountdown) {
        this.callbacks.onCountdown(this.countdownValue);
      }
      
      if (this.countdownValue <= 0) {
        clearInterval(this.countdownInterval);
        this.startGame();
      }
    }, 1000);
  }
  
  /**
   * 开始游戏
   */
  startGame(): void {
    if (!this.beatMap) return;
    
    // 设置状态为游戏中
    this.setState('playing');
    
    // 记录开始时间
    this.gameStartTime = performance.now();
    this.lastUpdateTime = this.gameStartTime;
    
    // 加载并播放音频
    audioSystem.load(this.beatMap.songId)
      .then(() => {
        audioSystem.play();
      })
      .catch(error => {
        console.error('音频加载失败:', error);
      });
    
    // 开始手部追踪
    motionTracker.initialize()
      .catch(error => {
        console.error('手部追踪初始化失败:', error);
      });
  }
  
  /**
   * 暂停游戏
   */
  pauseGame(): void {
    if (this.state !== 'playing') return;
    
    // 设置状态为暂停
    this.setState('paused');
    
    // 暂停音频
    audioSystem.pause();
    
    // 暂停手部追踪
    motionTracker.pause();
  }
  
  /**
   * 恢复游戏
   */
  resumeGame(): void {
    if (this.state !== 'paused') return;
    
    // 设置状态为游戏中
    this.setState('playing');
    
    // 恢复音频
    audioSystem.play();
    
    // 恢复手部追踪
    motionTracker.resume();
    
    // 更新时间
    const now = performance.now();
    const pauseDuration = now - this.lastUpdateTime;
    this.gameStartTime += pauseDuration;
    this.lastUpdateTime = now;
  }
  
  /**
   * 结束游戏
   */
  endGame(): void {
    // 设置状态为结束
    this.setState('finished');
    
    // 停止音频
    audioSystem.stop();
    
    // 停止手部追踪
    motionTracker.dispose();
    
    // 计算最终准确率
    this.calculateFinalAccuracy();
    
    // 通知游戏完成
    if (this.callbacks.onGameComplete) {
      this.callbacks.onGameComplete({ ...this.stats });
    }
  }
  
  /**
   * 更新游戏
   * 这个方法应该在游戏循环中每帧调用
   */
  update(): void {
    if (this.state !== 'playing') return;
    
    const now = performance.now();
    const gameTime = now - this.gameStartTime;
    const deltaTime = now - this.lastUpdateTime;
    this.lastUpdateTime = now;
    
    // 更新活跃节拍点
    this.updateActiveBeats(gameTime);
    
    // 检测手部与节拍点的碰撞
    this.checkHandCollisions();
    
    // 检测错过的节拍点
    this.checkMissedBeats(gameTime);
    
    // 更新特效
    effectsManager.update(deltaTime / 1000); // 转换为秒
    
    // 自动播放模式
    if (this.config.autoPlay) {
      this.handleAutoPlay(gameTime);
    }
    
    // 检查游戏是否结束
    this.checkGameEnd(gameTime);
  }
  
  /**
   * 更新活跃节拍点
   * @param gameTime 游戏时间（毫秒）
   */
  private updateActiveBeats(gameTime: number): void {
    if (!this.beatMap) return;
    
    // 查找当前应该显示的节拍点
    const newActiveBeats = this.beatMap.beats.filter(beat => {
      // 节拍点出现时间窗口：提前1000ms出现，持续到判定时间后500ms
      const appearTime = beat.time - 1000;
      const disappearTime = beat.time + 500;
      
      // 检查是否在时间窗口内且未被处理
      const isActive = gameTime >= appearTime && gameTime <= disappearTime;
      const isProcessed = this.processedBeats.has(beat.time);
      
      return isActive && !isProcessed;
    });
    
    // 检查新出现的节拍点
    newActiveBeats.forEach(beat => {
      if (!this.activeBeats.some(activeBeat => activeBeat.time === beat.time)) {
        // 通知节拍点创建
        if (this.callbacks.onBeatCreate) {
          this.callbacks.onBeatCreate(beat);
        }
      }
    });
    
    // 检查消失的节拍点
    this.activeBeats.forEach(activeBeat => {
      if (!newActiveBeats.some(beat => beat.time === activeBeat.time)) {
        // 通知节拍点移除
        if (this.callbacks.onBeatRemove) {
          this.callbacks.onBeatRemove(activeBeat);
        }
      }
    });
    
    // 更新活跃节拍点
    this.activeBeats = newActiveBeats;
  }
  
  /**
   * 检测手部与节拍点的碰撞
   */
  private checkHandCollisions(): void {
    // 获取手部位置
    const handPosition = motionTracker.getState().handPosition;
    if (!handPosition) return;
    
    // 获取当前游戏时间
    const gameTime = performance.now() - this.gameStartTime;
    
    // 检查每个活跃节拍点
    this.activeBeats.forEach(beat => {
      // 如果已经处理过，跳过
      if (this.processedBeats.has(beat.time)) return;
      
      // 计算时间差
      const timeDiff = Math.abs(gameTime - beat.time);
      
      // 检查是否在判定时间窗口内
      if (timeDiff <= JUDGEMENT_WINDOWS.good) {
        // 计算空间距离
        const beatPosition = new THREE.Vector3(
          beat.position.x,
          beat.position.y,
          beat.position.z
        );
        const distance = handPosition.distanceTo(beatPosition);
        
        // 判定结果
        let result: JudgementResult = null;
        
        // 检查是否命中
        if (distance <= JUDGEMENT_DISTANCES.perfect && timeDiff <= JUDGEMENT_WINDOWS.perfect) {
          result = 'perfect';
        } else if (distance <= JUDGEMENT_DISTANCES.good && timeDiff <= JUDGEMENT_WINDOWS.good) {
          result = 'good';
        }
        
        // 如果命中，处理结果
        if (result) {
          this.processHit(beat, result);
        }
      }
    });
  }
  
  /**
   * 处理命中结果
   * @param beat 命中的节拍点
   * @param result 判定结果
   */
  private processHit(beat: BeatPoint, result: JudgementResult): void {
    // 标记为已处理
    this.processedBeats.add(beat.time);
    
    // 从活跃列表中移除
    this.activeBeats = this.activeBeats.filter(b => b.time !== beat.time);
    
    // 更新统计数据
    this.stats.hitNotes++;
    
    if (result === 'perfect') {
      this.stats.perfects++;
      this.stats.combo++;
      
      // 播放完美命中特效
      const position = new THREE.Vector3(
        beat.position.x,
        beat.position.y,
        beat.position.z
      );
      effectsManager.playPerfectEffect(position, beat.color);
      
    } else if (result === 'good') {
      this.stats.goods++;
      this.stats.combo++;
      
      // 播放普通命中特效
      const position = new THREE.Vector3(
        beat.position.x,
        beat.position.y,
        beat.position.z
      );
      effectsManager.playHitEffect(position, beat.color);
    }
    
    // 更新最大连击
    if (this.stats.combo > this.stats.maxCombo) {
      this.stats.maxCombo = this.stats.combo;
    }
    
    // 计算得分
    const baseScore = result ? SCORE_CONFIG[result] : 0;
    const comboBonus = Math.floor(this.stats.combo / 10) * SCORE_CONFIG.comboBonus;
    const scoreGain = Math.floor(baseScore * (1 + comboBonus));
    
    this.stats.score += scoreGain;
    
    // 计算准确率
    this.calculateAccuracy();
    
    // 通知判定结果
    if (this.callbacks.onJudgement) {
      const position = new THREE.Vector3(
        beat.position.x,
        beat.position.y,
        beat.position.z
      );
      this.callbacks.onJudgement(result, position);
    }
    
    // 通知分数更新
    this.notifyScoreUpdate();
    
    // 连击特效
    if (this.stats.combo > 0 && this.stats.combo % 10 === 0) {
      const position = new THREE.Vector3(0, 0, -3);
      effectsManager.playComboEffect(position, this.stats.combo);
    }
  }
  
  /**
   * 检测错过的节拍点
   * @param gameTime 游戏时间（毫秒）
   */
  private checkMissedBeats(gameTime: number): void {
    this.activeBeats.forEach(beat => {
      // 如果已经处理过，跳过
      if (this.processedBeats.has(beat.time) || this.missedBeats.has(beat.time)) return;
      
      // 检查是否已经错过判定时间
      if (gameTime > beat.time + JUDGEMENT_WINDOWS.good) {
        // 标记为已错过
        this.missedBeats.add(beat.time);
        
        // 更新统计数据
        this.stats.misses++;
        this.stats.combo = 0; // 重置连击
        
        // 播放未命中特效
        const position = new THREE.Vector3(
          beat.position.x,
          beat.position.y,
          beat.position.z
        );
        effectsManager.playMissEffect(position);
        
        // 计算准确率
        this.calculateAccuracy();
        
        // 通知判定结果
        if (this.callbacks.onJudgement) {
          this.callbacks.onJudgement('miss', position);
        }
        
        // 通知分数更新
        this.notifyScoreUpdate();
      }
    });
  }
  
  /**
   * 自动播放模式处理
   * @param gameTime 游戏时间（毫秒）
   */
  private handleAutoPlay(gameTime: number): void {
    this.activeBeats.forEach(beat => {
      // 如果已经处理过，跳过
      if (this.processedBeats.has(beat.time)) return;
      
      // 在节拍点时间自动命中
      if (Math.abs(gameTime - beat.time) < 10) {
        // 80%概率完美，20%概率良好
        const result: JudgementResult = Math.random() > 0.2 ? 'perfect' : 'good';
        this.processHit(beat, result);
      }
    });
  }
  
  /**
   * 检查游戏是否结束
   * @param gameTime 游戏时间（毫秒）
   */
  private checkGameEnd(gameTime: number): void {
    if (!this.beatMap) return;
    
    // 检查是否所有节拍点都已处理
    const allProcessed = this.beatMap.beats.every(beat => 
      this.processedBeats.has(beat.time) || this.missedBeats.has(beat.time)
    );
    
    // 检查音频是否播放完毕
    const audioState = audioSystem.getState();
    const audioEnded = !audioState.isPlaying && audioState.currentTime > 0;
    
    // 如果所有节拍点都已处理或音频播放完毕，结束游戏
    if (allProcessed || audioEnded) {
      // 延迟一段时间再结束，让最后的特效显示完
      setTimeout(() => this.endGame(), 2000);
    }
  }
  
  /**
   * 计算准确率
   */
  private calculateAccuracy(): void {
    const totalJudged = this.stats.perfects + this.stats.goods + this.stats.misses;
    if (totalJudged === 0) return;
    
    // 计算加权准确率
    const weightedSum = this.stats.perfects * 100 + this.stats.goods * 60;
    this.stats.accuracy = Math.round((weightedSum / (totalJudged * 100)) * 100);
  }
  
  /**
   * 计算最终准确率
   */
  private calculateFinalAccuracy(): void {
    // 将所有未处理的节拍点标记为错过
    if (this.beatMap) {
      this.beatMap.beats.forEach(beat => {
        if (!this.processedBeats.has(beat.time) && !this.missedBeats.has(beat.time)) {
          this.stats.misses++;
        }
      });
    }
    
    // 重新计算准确率
    this.calculateAccuracy();
  }
  
  /**
   * 重置游戏状态
   */
  private resetGameState(): void {
    this.activeBeats = [];
    this.processedBeats.clear();
    this.missedBeats.clear();
    this.gameStartTime = 0;
    this.lastUpdateTime = 0;
    
    // 重置统计数据
    this.stats = {
      score: 0,
      combo: 0,
      maxCombo: 0,
      perfects: 0,
      goods: 0,
      misses: 0,
      accuracy: 100,
      totalNotes: this.beatMap ? this.beatMap.beats.length : 0,
      hitNotes: 0
    };
    
    // 通知分数更新
    this.notifyScoreUpdate();
  }
  
  /**
   * 设置游戏状态
   * @param newState 新状态
   */
  private setState(newState: GameState): void {
    if (this.state === newState) return;
    
    this.state = newState;
    
    // 通知状态变化
    if (this.callbacks.onStateChange) {
      this.callbacks.onStateChange(newState);
    }
  }
  
  /**
   * 通知分数更新
   */
  private notifyScoreUpdate(): void {
    if (this.callbacks.onScoreUpdate) {
      this.callbacks.onScoreUpdate({ ...this.stats });
    }
  }
  
  /**
   * 获取当前游戏状态
   * @returns GameState
   */
  getState(): GameState {
    return this.state;
  }
  
  /**
   * 获取游戏统计数据
   * @returns GameStats
   */
  getStats(): GameStats {
    return { ...this.stats };
  }
  
  /**
   * 获取活跃节拍点
   * @returns BeatPoint[]
   */
  getActiveBeats(): BeatPoint[] {
    return [...this.activeBeats];
  }
  
  /**
   * 清理资源
   */
  dispose(): void {
    // 清理倒计时
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
    
    // 停止音频
    audioSystem.dispose();
    
    // 停止手部追踪
    motionTracker.dispose();
    
    // 清理特效
    effectsManager.dispose();
    
    // 重置状态
    this.scene = null;
    this.callbacks = {};
  }
}

// 创建单例实例
export const gameManager = new GameManager();