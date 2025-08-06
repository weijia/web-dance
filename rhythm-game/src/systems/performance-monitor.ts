// 性能监控系统 - 用于监测游戏性能并自动调整设置

// 性能数据类型
export interface PerformanceData {
  fps: number;           // 帧率
  frameTime: number;     // 帧时间（毫秒）
  memoryUsage: number;   // 内存使用（MB，如果可用）
  renderTime: number;    // 渲染时间（毫秒）
  audioLatency: number;  // 音频延迟（毫秒）
  deviceTier: number;    // 设备等级（1-3，低、中、高）
}

// 性能配置类型
export interface PerformanceConfig {
  targetFps: number;             // 目标帧率
  particleMultiplier: number;    // 粒子效果倍率
  shadowQuality: 'off' | 'low' | 'medium' | 'high'; // 阴影质量
  antialiasing: boolean;         // 抗锯齿
  postProcessing: boolean;       // 后处理效果
  maxVisibleBeats: number;       // 最大可见节拍点数量
  renderDistance: number;        // 渲染距离
  reflections: boolean;          // 反射效果
  textureQuality: 'low' | 'medium' | 'high'; // 纹理质量
  autoAdjust: boolean;           // 自动调整设置
}

// 默认性能配置
const DEFAULT_CONFIG: PerformanceConfig = {
  targetFps: 60,
  particleMultiplier: 1.0,
  shadowQuality: 'medium',
  antialiasing: true,
  postProcessing: true,
  maxVisibleBeats: 30,
  renderDistance: 15,
  reflections: true,
  textureQuality: 'medium',
  autoAdjust: true
};

// 性能监控系统类
class PerformanceMonitor {
  private isRunning: boolean = false;
  private frameCount: number = 0;
  private lastTime: number = 0;
  private frameTimeHistory: number[] = [];
  private fpsHistory: number[] = [];
  private renderTimeHistory: number[] = [];
  private config: PerformanceConfig = { ...DEFAULT_CONFIG };
  private data: PerformanceData = {
    fps: 60,
    frameTime: 16.67,
    memoryUsage: 0,
    renderTime: 0,
    audioLatency: 0,
    deviceTier: 2
  };
  private onUpdateCallbacks: ((data: PerformanceData) => void)[] = [];
  private onConfigChangeCallbacks: ((config: PerformanceConfig) => void)[] = [];
  private measureRenderTimeCallback: (() => number) | null = null;
  private measureAudioLatencyCallback: (() => number) | null = null;
  private rafId: number | null = null;
  private updateInterval: number = 1000; // 更新间隔（毫秒）
  private lastUpdateTime: number = 0;
  private deviceDetected: boolean = false;
  
  /**
   * 初始化性能监控
   * @param config 初始配置（可选）
   */
  initialize(config?: Partial<PerformanceConfig>): void {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    if (!this.deviceDetected) {
      this.detectDevice();
    }
    
    // 通知配置更改
    this.notifyConfigChange();
  }
  
  /**
   * 开始监控
   */
  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.lastTime = performance.now();
    this.frameCount = 0;
    this.lastUpdateTime = this.lastTime;
    
    // 开始帧循环
    this.rafId = requestAnimationFrame(this.update.bind(this));
  }
  
  /**
   * 停止监控
   */
  stop(): void {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }
  
  /**
   * 更新帧
   * @param time 当前时间戳
   */
  private update(time: number): void {
    if (!this.isRunning) return;
    
    // 计算帧时间
    const frameTime = time - this.lastTime;
    this.lastTime = time;
    
    // 记录帧时间历史
    this.frameTimeHistory.push(frameTime);
    if (this.frameTimeHistory.length > 60) {
      this.frameTimeHistory.shift();
    }
    
    // 增加帧计数
    this.frameCount++;
    
    // 测量渲染时间
    if (this.measureRenderTimeCallback) {
      const renderTime = this.measureRenderTimeCallback();
      this.renderTimeHistory.push(renderTime);
      if (this.renderTimeHistory.length > 60) {
        this.renderTimeHistory.shift();
      }
    }
    
    // 定期更新性能数据
    if (time - this.lastUpdateTime >= this.updateInterval) {
      // 计算FPS
      const fps = Math.round((this.frameCount * 1000) / (time - this.lastUpdateTime));
      this.fpsHistory.push(fps);
      if (this.fpsHistory.length > 10) {
        this.fpsHistory.shift();
      }
      
      // 计算平均帧时间
      const avgFrameTime = this.frameTimeHistory.reduce((sum, time) => sum + time, 0) / this.frameTimeHistory.length;
      
      // 计算平均渲染时间
      const avgRenderTime = this.renderTimeHistory.length > 0
        ? this.renderTimeHistory.reduce((sum, time) => sum + time, 0) / this.renderTimeHistory.length
        : 0;
      
      // 获取内存使用情况（如果可用）
      let memoryUsage = 0;
      if (window.performance && (performance as any).memory) {
        memoryUsage = Math.round(((performance as any).memory.usedJSHeapSize / 1048576) * 100) / 100;
      }
      
      // 获取音频延迟
      const audioLatency = this.measureAudioLatencyCallback ? this.measureAudioLatencyCallback() : 0;
      
      // 更新性能数据
      this.data = {
        fps,
        frameTime: avgFrameTime,
        memoryUsage,
        renderTime: avgRenderTime,
        audioLatency,
        deviceTier: this.data.deviceTier
      };
      
      // 通知更新
      this.notifyUpdate();
      
      // 如果启用了自动调整，根据性能调整设置
      if (this.config.autoAdjust) {
        this.autoAdjustSettings();
      }
      
      // 重置计数器
      this.frameCount = 0;
      this.lastUpdateTime = time;
    }
    
    // 继续帧循环
    this.rafId = requestAnimationFrame(this.update.bind(this));
  }
  
  /**
   * 自动调整设置
   */
  private autoAdjustSettings(): void {
    const { fps } = this.data;
    const targetFps = this.config.targetFps;
    let configChanged = false;
    
    // 如果帧率低于目标帧率的85%，降低设置
    if (fps < targetFps * 0.85) {
      // 首先降低粒子效果
      if (this.config.particleMultiplier > 0.5) {
        this.config.particleMultiplier = Math.max(0.5, this.config.particleMultiplier - 0.1);
        configChanged = true;
      }
      // 然后关闭后处理
      else if (this.config.postProcessing) {
        this.config.postProcessing = false;
        configChanged = true;
      }
      // 然后降低阴影质量
      else if (this.config.shadowQuality !== 'off') {
        if (this.config.shadowQuality === 'high') {
          this.config.shadowQuality = 'medium';
        } else if (this.config.shadowQuality === 'medium') {
          this.config.shadowQuality = 'low';
        } else {
          this.config.shadowQuality = 'off';
        }
        configChanged = true;
      }
      // 然后关闭抗锯齿
      else if (this.config.antialiasing) {
        this.config.antialiasing = false;
        configChanged = true;
      }
      // 然后减少可见节拍点数量
      else if (this.config.maxVisibleBeats > 15) {
        this.config.maxVisibleBeats = 15;
        configChanged = true;
      }
      // 最后关闭反射
      else if (this.config.reflections) {
        this.config.reflections = false;
        configChanged = true;
      }
    }
    // 如果帧率高于目标帧率的95%，可以尝试提高设置
    else if (fps > targetFps * 0.95) {
      // 首先启用反射
      if (!this.config.reflections) {
        this.config.reflections = true;
        configChanged = true;
      }
      // 然后增加可见节拍点数量
      else if (this.config.maxVisibleBeats < 30) {
        this.config.maxVisibleBeats = 30;
        configChanged = true;
      }
      // 然后启用抗锯齿
      else if (!this.config.antialiasing) {
        this.config.antialiasing = true;
        configChanged = true;
      }
      // 然后提高阴影质量
      else if (this.config.shadowQuality !== 'high') {
        if (this.config.shadowQuality === 'off') {
          this.config.shadowQuality = 'low';
        } else if (this.config.shadowQuality === 'low') {
          this.config.shadowQuality = 'medium';
        } else {
          this.config.shadowQuality = 'high';
        }
        configChanged = true;
      }
      // 然后启用后处理
      else if (!this.config.postProcessing) {
        this.config.postProcessing = true;
        configChanged = true;
      }
      // 最后增加粒子效果
      else if (this.config.particleMultiplier < 1.0) {
        this.config.particleMultiplier = Math.min(1.0, this.config.particleMultiplier + 0.1);
        configChanged = true;
      }
    }
    
    // 如果配置已更改，通知监听器
    if (configChanged) {
      this.notifyConfigChange();
    }
  }
  
  /**
   * 检测设备性能等级
   */
  private detectDevice(): void {
    // 检测GPU信息（如果可用）
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl') as WebGLRenderingContext | null;
    
    if (gl) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : '';
      
      // 根据GPU和设备信息估计性能等级
      const isHighEnd = /(nvidia|radeon|geforce|adreno 6|mali-g|apple gpu)/i.test(renderer);
      const isMidRange = /(intel|adreno 5|mali-t)/i.test(renderer);
      
      if (isHighEnd) {
        this.data.deviceTier = 3; // 高端设备
      } else if (isMidRange) {
        this.data.deviceTier = 2; // 中端设备
      } else {
        this.data.deviceTier = 1; // 低端设备
      }
    } else {
      // 无法获取GPU信息，使用其他方法估计
      const isLowEndDevice = 
        navigator.hardwareConcurrency <= 2 || 
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      this.data.deviceTier = isLowEndDevice ? 1 : 2;
    }
    
    // 根据设备等级设置初始配置
    this.applyDeviceTierSettings();
    
    this.deviceDetected = true;
  }
  
  /**
   * 根据设备等级应用设置
   */
  private applyDeviceTierSettings(): void {
    switch (this.data.deviceTier) {
      case 1: // 低端设备
        this.config = {
          ...this.config,
          particleMultiplier: 0.5,
          shadowQuality: 'off',
          antialiasing: false,
          postProcessing: false,
          maxVisibleBeats: 15,
          renderDistance: 10,
          reflections: false,
          textureQuality: 'low'
        };
        break;
      case 2: // 中端设备
        this.config = {
          ...this.config,
          particleMultiplier: 0.8,
          shadowQuality: 'low',
          antialiasing: true,
          postProcessing: false,
          maxVisibleBeats: 20,
          renderDistance: 15,
          reflections: true,
          textureQuality: 'medium'
        };
        break;
      case 3: // 高端设备
        this.config = {
          ...this.config,
          particleMultiplier: 1.0,
          shadowQuality: 'medium',
          antialiasing: true,
          postProcessing: true,
          maxVisibleBeats: 30,
          renderDistance: 20,
          reflections: true,
          textureQuality: 'high'
        };
        break;
    }
  }
  
  /**
   * 通知性能数据更新
   */
  private notifyUpdate(): void {
    this.onUpdateCallbacks.forEach(callback => callback({ ...this.data }));
  }
  
  /**
   * 通知配置更改
   */
  private notifyConfigChange(): void {
    this.onConfigChangeCallbacks.forEach(callback => callback({ ...this.config }));
  }
  
  /**
   * 注册性能数据更新回调
   * @param callback 回调函数
   */
  onUpdate(callback: (data: PerformanceData) => void): void {
    this.onUpdateCallbacks.push(callback);
  }
  
  /**
   * 注册配置更改回调
   * @param callback 回调函数
   */
  onConfigChange(callback: (config: PerformanceConfig) => void): void {
    this.onConfigChangeCallbacks.push(callback);
  }
  
  /**
   * 设置渲染时间测量回调
   * @param callback 回调函数
   */
  setRenderTimeCallback(callback: () => number): void {
    this.measureRenderTimeCallback = callback;
  }
  
  /**
   * 设置音频延迟测量回调
   * @param callback 回调函数
   */
  setAudioLatencyCallback(callback: () => number): void {
    this.measureAudioLatencyCallback = callback;
  }
  
  /**
   * 获取当前性能数据
   * @returns PerformanceData
   */
  getData(): PerformanceData {
    return { ...this.data };
  }
  
  /**
   * 获取当前配置
   * @returns PerformanceConfig
   */
  getConfig(): PerformanceConfig {
    return { ...this.config };
  }
  
  /**
   * 更新配置
   * @param config 新配置
   */
  updateConfig(config: Partial<PerformanceConfig>): void {
    this.config = { ...this.config, ...config };
    this.notifyConfigChange();
  }
  
  /**
   * 重置配置为默认值
   */
  resetConfig(): void {
    this.config = { ...DEFAULT_CONFIG };
    this.applyDeviceTierSettings();
    this.notifyConfigChange();
  }
}

// 创建单例实例
export const performanceMonitor = new PerformanceMonitor();