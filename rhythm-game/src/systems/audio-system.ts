import { Howl } from 'howler';

// 音频状态类型
export interface AudioState {
  isPlaying: boolean;
  isLoaded: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  effectsVolume: number;
}

// 音频系统类
export class AudioSystem {
  private sound: Howl | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array | null = null;
  private onBeatCallbacks: ((time: number) => void)[] = [];
  private onEndCallbacks: (() => void)[] = [];
  private startTime: number = 0;
  private audioDelay: number = 0;
  private animationFrame: number | null = null;
  
  // 音频状态
  private state: AudioState = {
    isPlaying: false,
    isLoaded: false,
    currentTime: 0,
    duration: 0,
    volume: 1.0,
    effectsVolume: 0.5
  };
  
  /**
   * 加载音频
   * @param url 音频URL
   * @returns Promise<void>
   */
  async load(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // 卸载之前的音频
      if (this.sound) {
        this.sound.unload();
      }
      
      // 创建新的Howl实例
      this.sound = new Howl({
        src: [url],
        html5: true,
        preload: true,
        onload: () => {
          if (!this.sound) return;
          
          this.state.isLoaded = true;
          this.state.duration = this.sound.duration() * 1000; // 转换为毫秒
          
          // 初始化音频分析
          this.initAudioAnalysis();
          
          resolve();
        },
        onloaderror: (id, error) => {
          console.error('音频加载失败:', error);
          reject(error);
        },
        onplay: () => {
          this.state.isPlaying = true;
          this.startTime = performance.now() - this.audioDelay;
          this.startTimeUpdate();
        },
        onpause: () => {
          this.state.isPlaying = false;
          this.stopTimeUpdate();
        },
        onstop: () => {
          this.state.isPlaying = false;
          this.state.currentTime = 0;
          this.stopTimeUpdate();
        },
        onend: () => {
          this.state.isPlaying = false;
          this.stopTimeUpdate();
          this.onEndCallbacks.forEach(callback => callback());
        }
      });
    });
  }
  
  /**
   * 初始化音频分析
   */
  private initAudioAnalysis(): void {
    try {
      // 创建音频上下文
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // 创建分析器节点
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      
      // 创建数据数组
      const bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(bufferLength);
      
      // 连接节点
      // 注意：这里需要Howler的内部节点，但这只是一个模拟实现
      // 实际项目中需要使用Howler的API获取节点
      
    } catch (error) {
      console.error('音频分析初始化失败:', error);
    }
  }
  
  /**
   * 开始时间更新循环
   */
  private startTimeUpdate(): void {
    const updateTime = () => {
      if (!this.state.isPlaying) return;
      
      const now = performance.now();
      const elapsed = now - this.startTime;
      this.state.currentTime = elapsed;
      
      // 分析音频数据
      this.analyzeAudio();
      
      // 继续循环
      this.animationFrame = requestAnimationFrame(updateTime);
    };
    
    this.animationFrame = requestAnimationFrame(updateTime);
  }
  
  /**
   * 停止时间更新循环
   */
  private stopTimeUpdate(): void {
    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }
  
  /**
   * 分析音频数据
   */
  private analyzeAudio(): void {
    if (!this.analyser || !this.dataArray) return;
    
    // 获取频率数据
    this.analyser.getByteFrequencyData(this.dataArray);
    
    // 计算平均能量
    let sum = 0;
    for (let i = 0; i < this.dataArray.length; i++) {
      sum += this.dataArray[i];
    }
    const average = sum / this.dataArray.length;
    
    // 检测节拍
    // 这里使用一个简单的阈值检测，实际项目中可能需要更复杂的算法
    const threshold = 150;
    if (average > threshold) {
      this.onBeatCallbacks.forEach(callback => callback(this.state.currentTime));
    }
  }
  
  /**
   * 播放音频
   */
  play(): void {
    if (this.sound && this.state.isLoaded) {
      this.sound.play();
    }
  }
  
  /**
   * 暂停音频
   */
  pause(): void {
    if (this.sound && this.state.isPlaying) {
      this.sound.pause();
    }
  }
  
  /**
   * 停止音频
   */
  stop(): void {
    if (this.sound) {
      this.sound.stop();
    }
  }
  
  /**
   * 设置音量
   * @param volume 音量（0-1）
   */
  setVolume(volume: number): void {
    if (this.sound) {
      this.sound.volume(Math.max(0, Math.min(1, volume)));
      this.state.volume = volume;
    }
  }
  
  /**
   * 设置当前时间
   * @param time 时间（毫秒）
   */
  seek(time: number): void {
    if (this.sound) {
      this.sound.seek(time / 1000); // 转换为秒
      this.state.currentTime = time;
    }
  }
  
  /**
   * 校准音频延迟
   * @returns Promise<number> 延迟时间（毫秒）
   */
  async calibrateDelay(): Promise<number> {
    return new Promise((resolve) => {
      const startTime = performance.now();
      
      // 创建一个短暂的测试音频
      const testSound = new Howl({
        src: ['/sounds/click.mp3'],
        volume: 0,
        onplay: () => {
          const delay = performance.now() - startTime;
          this.audioDelay = delay;
          testSound.stop();
          testSound.unload();
          resolve(delay);
        }
      });
      
      testSound.play();
    });
  }
  
  /**
   * 注册节拍回调
   * @param callback 回调函数
   */
  onBeat(callback: (time: number) => void): void {
    this.onBeatCallbacks.push(callback);
  }
  
  /**
   * 注册结束回调
   * @param callback 回调函数
   */
  onEnd(callback: () => void): void {
    this.onEndCallbacks.push(callback);
  }
  
  /**
   * 获取当前状态
   * @returns AudioState
   */
  getState(): AudioState {
    return { ...this.state };
  }
  
  /**
   * 清理资源
   */
  dispose(): void {
    this.stopTimeUpdate();
    
    if (this.sound) {
      this.sound.stop();
      this.sound.unload();
      this.sound = null;
    }
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    this.analyser = null;
    this.dataArray = null;
    this.onBeatCallbacks = [];
    this.onEndCallbacks = [];
  }
  
  /**
   * 设置音效音量
   * @param volume 音量（0-1）
   */
  setEffectsVolume(volume: number): void {
    // 存储音效音量设置
    this.state.effectsVolume = Math.max(0, Math.min(1, volume));
    
    // 在实际项目中，这里应该设置音效的音量
    // 由于我们没有单独的音效系统，这里只是存储设置值
    // 实际应用中可能需要遍历所有音效对象并设置它们的音量
  }
}

// 创建单例实例
export const audioSystem = new AudioSystem();
