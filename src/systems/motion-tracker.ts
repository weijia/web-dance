import * as THREE from 'three';
import { Camera } from '@mediapipe/camera_utils';
import { Hands, Results, HAND_CONNECTIONS } from '@mediapipe/hands';

// 手部关键点类型
export interface HandLandmark {
  x: number;
  y: number;
  z: number;
}

// 手部追踪结果类型
export interface HandTrackingResult {
  landmarks: HandLandmark[];
  handedness: 'Left' | 'Right';
  score: number;
}

// 追踪状态类型
export interface TrackingState {
  isTracking: boolean;
  confidence: number;
  error: string | null;
  handPosition: THREE.Vector3 | null;
  rawLandmarks: HandLandmark[] | null;
}

// 动作追踪系统类
export class MotionTracker {
  private video: HTMLVideoElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private mediaStream: MediaStream | null = null;
  private hands: Hands | null = null;
  private camera: Camera | null = null;
  private isInitialized: boolean = false;
  private isProcessing: boolean = false;
  private lastProcessTime: number = 0;
  private processingInterval: number = 30; // 每30ms处理一次（约33fps）
  private useSimulation: boolean = false; // 是否使用模拟数据（当MediaPipe加载失败时）
  private simulationInterval: any = null;
  
  // 追踪状态
  private state: TrackingState = {
    isTracking: false,
    confidence: 0,
    error: null,
    handPosition: null,
    rawLandmarks: null
  };
  
  // 回调函数
  private onUpdateCallbacks: ((state: TrackingState) => void)[] = [];
  
  /**
   * 初始化追踪系统
   * @param videoElement 视频元素（可选）
   * @returns Promise<void>
   */
  async initialize(videoElement?: HTMLVideoElement): Promise<void> {
    if (this.isInitialized) return;
    
    try {
      console.log('MotionTracker.initialize: 开始初始化');
      
      // 创建视频元素
      if (videoElement) {
        console.log('MotionTracker.initialize: 使用提供的视频元素');
        this.video = videoElement;
      } else {
        console.log('MotionTracker.initialize: 创建新的视频元素');
        this.video = document.createElement('video');
        this.video.setAttribute('playsinline', 'true');
        this.video.style.position = 'absolute';
        this.video.style.top = '0';
        this.video.style.left = '0';
        this.video.style.width = '160px';
        this.video.style.height = '120px';
        this.video.style.transform = 'scaleX(-1)';
        this.video.style.visibility = 'hidden';
        document.body.appendChild(this.video);
      }
      
      // 创建画布（用于处理视频帧）
      this.canvas = document.createElement('canvas');
      this.canvas.width = 640;
      this.canvas.height = 480;
      this.ctx = this.canvas.getContext('2d');
      
      // 请求摄像头权限
      console.log('MotionTracker.initialize: 请求摄像头权限');
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        }
      });
      
      // 设置视频源
      if (this.video) {
        console.log('MotionTracker.initialize: 设置视频源');
        this.video.srcObject = this.mediaStream;
        await this.video.play();
      } else {
        console.error('MotionTracker.initialize: 视频元素不存在，无法设置源');
        throw new Error('视频元素不存在');
      }
      
      // 初始化MediaPipe Hands
      await this.initializeMediaPipe();
      
      this.isInitialized = true;
      this.state.isTracking = true;
      
    } catch (error) {
      console.error('动作追踪初始化失败:', error);
      this.state.error = '无法初始化摄像头或模型';
      this.state.isTracking = false;
      
      // 如果MediaPipe初始化失败，使用模拟数据
      console.warn('使用模拟手部追踪数据');
      this.useSimulation = true;
      this.initializeSimulation();
      
      throw error;
    }
  }
  
  /**
   * 初始化MediaPipe Hands
   */
  private async initializeMediaPipe(): Promise<void> {
    if (!this.video) return;
    
    try {
      // 创建Hands实例
      this.hands = new Hands({
        locateFile: (file) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
        }
      });
      
      // 配置Hands
      await this.hands.setOptions({
        maxNumHands: 1, // 只追踪一只手
        modelComplexity: 0, // 使用轻量模型
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });
      
      // 设置结果回调
      this.hands.onResults((results: Results) => {
        this.processResults(results);
      });
      
      // 创建相机实例
      this.camera = new Camera(this.video, {
        onFrame: async () => {
          if (!this.hands || !this.video || !this.state.isTracking) return;
          
          const now = performance.now();
          if (now - this.lastProcessTime >= this.processingInterval && !this.isProcessing) {
            this.isProcessing = true;
            this.lastProcessTime = now;
            
            await this.hands.send({ image: this.video });
            
            this.isProcessing = false;
          }
        },
        width: 640,
        height: 480
      });
      
      // 启动相机
      this.camera.start();
      
    } catch (error) {
      console.error('MediaPipe Hands初始化失败:', error);
      throw error;
    }
  }
  
  /**
   * 初始化模拟数据
   */
  private initializeSimulation(): void {
    console.log('初始化手部追踪模拟数据...');
    
    // 模拟Worker处理
    this.simulationInterval = setInterval(() => {
      if (this.state.isTracking) {
        // 生成随机手部位置
        const x = (Math.random() - 0.5) * 2; // -1 到 1
        const y = Math.random() * 1.5;       // 0 到 1.5
        const z = -2;                        // 固定深度
        
        this.state.handPosition = new THREE.Vector3(x, y, z);
        this.state.confidence = 0.7 + Math.random() * 0.3; // 70%-100%的置信度
        
        // 生成模拟的关键点数据
        const landmarks: HandLandmark[] = [];
        for (let i = 0; i < 21; i++) {
          landmarks.push({
            x: x + (Math.random() - 0.5) * 0.2,
            y: y + (Math.random() - 0.5) * 0.2,
            z: z + (Math.random() - 0.5) * 0.2
          });
        }
        this.state.rawLandmarks = landmarks;
        
        // 通知更新
        this.notifyUpdate();
      }
    }, 100);
  }
  
  /**
   * 处理MediaPipe结果
   * @param results MediaPipe结果
   */
  private processResults(results: Results): void {
    if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
      // 没有检测到手
      console.log("no hand detected");
      this.state.handPosition = null;
      this.state.confidence = 0;
      this.state.rawLandmarks = null;
      this.notifyUpdate();
      return;
    }
    
    // 获取第一只手的关键点
    const landmarks = results.multiHandLandmarks[0];
    const handedness = results.multiHandedness[0].label;
    const score = results.multiHandedness[0].score;
    
    // 转换为我们的数据格式
    const rawLandmarks: HandLandmark[] = landmarks.map(landmark => ({
      x: landmark.x,
      y: landmark.y,
      z: landmark.z
    }));
    
    // 计算手腕位置（关键点0）
    const wristPosition = new THREE.Vector3(
      (landmarks[0].x * 2 - 1) * 2, // 转换到Three.js坐标系（-2到2）
      -(landmarks[0].y * 2 - 1) * 1.5, // Y轴反转，范围-1.5到1.5
      -2 - landmarks[0].z * 2 // Z轴深度，-2到-4
    );
    
    // 更新状态
    this.state.handPosition = wristPosition;
    this.state.confidence = score;
    this.state.rawLandmarks = rawLandmarks;
    
    // 通知更新
    this.notifyUpdate();
    
    // 在画布上绘制手部关键点（调试用）
    this.drawHandLandmarks(landmarks, handedness);
  }
  
  /**
   * 在画布上绘制手部关键点
   * @param landmarks 关键点数据
   * @param handedness 手的类型（左/右）
   */
  private drawHandLandmarks(landmarks: any[], handedness: string): void {
    if (!this.ctx || !this.canvas) return;
    
    // 清除画布
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // 设置绘制样式
    this.ctx.fillStyle = handedness === 'Left' ? '#ff00ff' : '#00f3ff';
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 2;
    
    // 绘制关键点
    landmarks.forEach(landmark => {
      const x = landmark.x * this.canvas!.width;
      const y = landmark.y * this.canvas!.height;
      
      this.ctx!.beginPath();
      this.ctx!.arc(x, y, 5, 0, 2 * Math.PI);
      this.ctx!.fill();
    });
    
    // 绘制连接线
    this.ctx.beginPath();
    HAND_CONNECTIONS.forEach(([start, end]) => {
      const startPoint = landmarks[start];
      const endPoint = landmarks[end];
      
      if (startPoint && endPoint) {
        const startX = startPoint.x * this.canvas!.width;
        const startY = startPoint.y * this.canvas!.height;
        const endX = endPoint.x * this.canvas!.width;
        const endY = endPoint.y * this.canvas!.height;
        
        this.ctx!.moveTo(startX, startY);
        this.ctx!.lineTo(endX, endY);
      }
    });
    this.ctx.stroke();
  }
  
  /**
   * 通知状态更新
   */
  private notifyUpdate(): void {
    this.onUpdateCallbacks.forEach(callback => callback({ ...this.state }));
  }
  
  /**
   * 注册更新回调
   * @param callback 回调函数
   */
  onUpdate(callback: (state: TrackingState) => void): void {
    this.onUpdateCallbacks.push(callback);
  }
  
  /**
   * 获取当前状态
   * @returns TrackingState
   */
  getState(): TrackingState {
    return { ...this.state };
  }
  
  /**
   * 暂停追踪
   */
  pause(): void {
    this.state.isTracking = false;
    if (this.camera && !this.useSimulation) {
      this.camera.stop();
    }
  }
  
  /**
   * 恢复追踪
   */
  resume(): void {
    if (this.isInitialized) {
      this.state.isTracking = true;
      if (this.camera && !this.useSimulation) {
        this.camera.start();
      }
    }
  }
  
  /**
   * 清理资源
   */
  dispose(): void {
    console.log('MotionTracker.dispose: 开始清理资源');
    this.state.isTracking = false;
    
    // 停止媒体流
    if (this.mediaStream) {
      console.log('MotionTracker.dispose: 停止媒体流');
      try {
        this.mediaStream.getTracks().forEach(track => track.stop());
      } catch (e) {
        console.error('停止媒体流时出错:', e);
      }
      this.mediaStream = null;
    }
    
    // 停止相机
    if (this.camera) {
      console.log('MotionTracker.dispose: 停止相机');
      try {
        this.camera.stop();
      } catch (e) {
        console.error('停止相机时出错:', e);
      }
      this.camera = null;
    }
    
    // 清理Hands
    if (this.hands) {
      console.log('MotionTracker.dispose: 清理Hands');
      try {
        this.hands.close();
      } catch (e) {
        console.error('关闭Hands时出错:', e);
      }
      this.hands = null;
    }
    
    // 清理模拟数据
    if (this.simulationInterval) {
      console.log('MotionTracker.dispose: 清理模拟数据');
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }
    
    // 移除视频元素 - 只有当视频元素是由我们创建的才移除
    if (this.video) {
      console.log('MotionTracker.dispose: 处理视频元素');
      
      // 清除视频源
      try {
        if (this.video.srcObject) {
          this.video.srcObject = null;
        }
      } catch (e) {
        console.error('清除视频源时出错:', e);
      }
      
      // 只有当视频元素是由我们创建的才尝试移除
      if (!this.video.hasAttribute('id')) {
        try {
          // 检查视频元素是否在DOM中
          if (this.video.parentNode) {
            console.log('MotionTracker.dispose: 从父节点移除视频元素');
            this.video.parentNode.removeChild(this.video);
          } else {
            console.log('MotionTracker.dispose: 视频元素没有父节点，无需移除');
          }
        } catch (e) {
          console.error('移除视频元素时出错:', e);
        }
      } else {
        console.log('MotionTracker.dispose: 视频元素有ID属性，不移除');
      }
    }
    
    this.video = null;
    this.canvas = null;
    this.ctx = null;
    this.isInitialized = false;
    this.onUpdateCallbacks = [];
    console.log('MotionTracker.dispose: 资源清理完成');
  }
  
  /**
   * 设置处理间隔
   * @param interval 间隔时间（毫秒）
   */
  setProcessingInterval(interval: number): void {
    this.processingInterval = Math.max(16, interval); // 最小16ms（约60fps）
  }
  
  /**
   * 校准追踪
   * 在实际项目中，这里可以进行手部位置的校准
   */
  calibrate(): void {
    console.log('校准手部追踪...');
    // 实际项目中可以在这里实现校准逻辑
  }
  
  /**
   * 获取所有手部关键点
   * @returns HandLandmark[] | null
   */
  getAllLandmarks(): HandLandmark[] | null {
    return this.state.rawLandmarks;
  }
  
  /**
   * 获取特定关键点
   * @param index 关键点索引（0-20）
   * @returns HandLandmark | null
   */
  getLandmark(index: number): HandLandmark | null {
    if (!this.state.rawLandmarks || index < 0 || index >= this.state.rawLandmarks.length) {
      return null;
    }
    return this.state.rawLandmarks[index];
  }
  
  /**
   * 计算两个关键点之间的距离
   * @param index1 第一个关键点索引
   * @param index2 第二个关键点索引
   * @returns number | null
   */
  getLandmarkDistance(index1: number, index2: number): number | null {
    const landmark1 = this.getLandmark(index1);
    const landmark2 = this.getLandmark(index2);
    
    if (!landmark1 || !landmark2) return null;
    
    const dx = landmark1.x - landmark2.x;
    const dy = landmark1.y - landmark2.y;
    const dz = landmark1.z - landmark2.z;
    
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
  
  /**
   * 检测手势
   * @returns string | null 手势名称
   */
  detectGesture(): string | null {
    if (!this.state.rawLandmarks) return null;
    
    const landmarks = this.state.rawLandmarks;
    
    // 检测手指是否伸展
    const isFingerExtended = (fingerTip: number, fingerPIP: number, fingerMCP: number): boolean => {
      const tipPos = landmarks[fingerTip];
      const pipPos = landmarks[fingerPIP];
      const mcpPos = landmarks[fingerMCP];
      
      // 计算指尖到PIP的距离
      const tipToPIP = Math.sqrt(
        Math.pow(tipPos.x - pipPos.x, 2) +
        Math.pow(tipPos.y - pipPos.y, 2)
      );
      
      // 计算PIP到MCP的距离
      const PIPToMCP = Math.sqrt(
        Math.pow(pipPos.x - mcpPos.x, 2) +
        Math.pow(pipPos.y - mcpPos.y, 2)
      );
      
      // 如果指尖到PIP的距离大于PIP到MCP的距离，则认为手指伸展
      return tipToPIP > PIPToMCP * 0.7;
    };
    
    // 检测各手指是否伸展
    const isThumbExtended = isFingerExtended(4, 3, 2);
    const isIndexExtended = isFingerExtended(8, 7, 6);
    const isMiddleExtended = isFingerExtended(12, 11, 10);
    const isRingExtended = isFingerExtended(16, 15, 14);
    const isPinkyExtended = isFingerExtended(20, 19, 18);
    
    // 识别手势
    if (isIndexExtended && !isMiddleExtended && !isRingExtended && !isPinkyExtended) {
      return 'point'; // 食指指点
    } else if (isIndexExtended && isMiddleExtended && !isRingExtended && !isPinkyExtended) {
      return 'peace'; // 剪刀手
    } else if (isThumbExtended && isIndexExtended && isMiddleExtended && isRingExtended && isPinkyExtended) {
      return 'open'; // 张开手掌
    } else if (!isThumbExtended && !isIndexExtended && !isMiddleExtended && !isRingExtended && !isPinkyExtended) {
      return 'fist'; // 握拳
    } else if (!isThumbExtended && isIndexExtended && isMiddleExtended && isRingExtended && isPinkyExtended) {
      return 'four'; // 四指张开
    }
    
    return null; // 无法识别的手势
  }
}

// 创建单例实例
export const motionTracker = new MotionTracker();