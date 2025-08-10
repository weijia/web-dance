import { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { motionTracker, TrackingState } from '../systems/motion-tracker';

// 手部追踪钩子函数
export const useHandTracking = (videoElement: HTMLVideoElement | null = null) => {
  const [handPosition, setHandPosition] = useState<THREE.Vector3 | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [confidence, setConfidence] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [gesture, setGesture] = useState<string | null>(null);
  const [landmarks, setLandmarks] = useState<any[] | null>(null);
  const trackerInitialized = useRef(false);
  
  // 初始化手部追踪
  useEffect(() => {
    let isActive = true;
    
    // 如果没有视频元素，则不初始化
    if (!videoElement) {
      console.log('useHandTracking: 视频元素不存在，等待视频元素...');
      return;
    }
    
    const initHandTracking = async () => {
      try {
        console.log('useHandTracking: 开始初始化手部追踪');
        
        // 重置初始化状态，允许在视频元素变化时重新初始化
        trackerInitialized.current = false;
        
        // 初始化动作追踪系统
        console.log('useHandTracking: 调用motionTracker.initialize');
        await motionTracker.initialize(videoElement, { debugMode: false });
        trackerInitialized.current = true;
        
        // 注册状态更新回调
        console.log('useHandTracking: 注册状态更新回调');
        motionTracker.onUpdate((state: TrackingState) => {
          if (!isActive) return;
          
          // 不使用模拟数据，只使用真实的手部追踪数据
          
          setHandPosition(state.handPosition);
          setIsTracking(state.isTracking);
          setConfidence(state.confidence);
          setError(state.error);
          setLandmarks(state.rawLandmarks);
          
          // 检测手势
          const detectedGesture = motionTracker.detectGesture();
          if (detectedGesture) {
            setGesture(detectedGesture);
          }
          
          // 调试输出
          if (state.handPosition) {
            console.log(`手部位置: x=${state.handPosition.x.toFixed(2)}, y=${state.handPosition.y.toFixed(2)}, z=${state.handPosition.z.toFixed(2)}, 置信度: ${(state.confidence * 100).toFixed(1)}%`);
          } else {
            console.log('未检测到手部位置');
          }
        });
        
      } catch (err) {
        console.error('手部追踪初始化失败:', err);
        setError('无法初始化手部追踪系统');
        setIsTracking(false);
      }
    };
    
    initHandTracking();
    
    // 清理函数
    return () => {
      console.log('useHandTracking: 清理资源');
      isActive = false;
      
      // 避免重复调用dispose
      if (trackerInitialized.current) {
        try {
          motionTracker.dispose();
          trackerInitialized.current = false;
        } catch (e) {
          console.error('清理手部追踪资源时出错:', e);
        }
      }
    };
  }, [videoElement]);
  
  // 暂停追踪
  const pauseTracking = () => {
    motionTracker.pause();
  };
  
  // 恢复追踪
  const resumeTracking = () => {
    motionTracker.resume();
  };
  
  // 校准追踪
  const calibrateTracking = () => {
    motionTracker.calibrate();
  };
  
  // 获取特定关键点
  const getLandmark = (index: number) => {
    return motionTracker.getLandmark(index);
  };
  
  // 计算两个关键点之间的距离
  const getLandmarkDistance = (index1: number, index2: number) => {
    return motionTracker.getLandmarkDistance(index1, index2);
  };
  
  return {
    handPosition,
    isTracking,
    confidence,
    error,
    gesture,
    landmarks,
    pauseTracking,
    resumeTracking,
    calibrateTracking,
    getLandmark,
    getLandmarkDistance
  };
};