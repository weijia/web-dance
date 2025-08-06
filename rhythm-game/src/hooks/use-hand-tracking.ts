import { useState, useEffect } from 'react';
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
  
  // 初始化手部追踪
  useEffect(() => {
    let isActive = true;
    
    const initHandTracking = async () => {
      try {
        // 初始化动作追踪系统
        await motionTracker.initialize(videoElement || undefined);
        
        // 注册状态更新回调
        motionTracker.onUpdate((state: TrackingState) => {
          if (!isActive) return;
          
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
      isActive = false;
      motionTracker.dispose();
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