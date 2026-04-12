import { useState, useEffect, useRef } from 'react';
import { Howl } from 'howler';

interface BeatPoint {
  time: number;
  position: {
    x: number;
    y: number;
    z: number;
  };
}

interface AudioSyncOptions {
  audioUrl: string;
  beatMap: BeatPoint[];
  onBeat?: (beat: BeatPoint) => void;
  onComplete?: () => void;
}

export const useAudioSync = (options?: AudioSyncOptions) => {
  const audioUrl = options?.audioUrl;
  const beatMap = options?.beatMap || [];
  const onBeat = options?.onBeat;
  const onComplete = options?.onComplete;
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [audioDelay, setAudioDelay] = useState(0);
  
  // 音频实例引用
  const soundRef = useRef<Howl | null>(null);
  // 定时器引用
  const timerRef = useRef<number | null>(null);
  // 开始时间引用
  const startTimeRef = useRef<number>(0);
  // 已触发的节拍点
  const triggeredBeatsRef = useRef<Set<number>>(new Set());
  
  // 初始化音频
  useEffect(() => {
    // 如果没有音频URL，则不创建Howl实例
    if (!audioUrl) {
      return;
    }
    
    // 创建Howler音频实例
    const sound = new Howl({
      src: [audioUrl],
      html5: true,
      preload: true,
      onload: () => {
        setIsLoaded(true);
        setDuration(sound.duration() * 1000); // 转换为毫秒
      },
      onplay: () => {
        setIsPlaying(true);
        startTimeRef.current = performance.now() - audioDelay;
        
        // 开始时间更新循环
        const updateTime = () => {
          if (!soundRef.current) return;
          
          const now = performance.now();
          const elapsed = now - startTimeRef.current;
          setCurrentTime(elapsed);
          
          // 检查是否有需要触发的节拍点
          beatMap.forEach(beat => {
            if (!triggeredBeatsRef.current.has(beat.time) && 
                elapsed >= beat.time - 50 && elapsed <= beat.time + 50) {
              // 触发节拍回调
              if (onBeat) onBeat(beat);
              triggeredBeatsRef.current.add(beat.time);
            }
          });
          
          // 继续循环
          timerRef.current = requestAnimationFrame(updateTime);
        };
        
        timerRef.current = requestAnimationFrame(updateTime);
      },
      onpause: () => {
        setIsPlaying(false);
        if (timerRef.current) {
          cancelAnimationFrame(timerRef.current);
          timerRef.current = null;
        }
      },
      onstop: () => {
        setIsPlaying(false);
        setCurrentTime(0);
        triggeredBeatsRef.current.clear();
        if (timerRef.current) {
          cancelAnimationFrame(timerRef.current);
          timerRef.current = null;
        }
      },
      onend: () => {
        setIsPlaying(false);
        if (timerRef.current) {
          cancelAnimationFrame(timerRef.current);
          timerRef.current = null;
        }
        if (onComplete) onComplete();
      }
    });
    
    soundRef.current = sound;
    
    // 清理函数
    return () => {
      if (soundRef.current) {
        soundRef.current.stop();
        soundRef.current.unload();
      }
      if (timerRef.current) {
        cancelAnimationFrame(timerRef.current);
      }
    };
  }, [audioUrl, beatMap, onBeat, onComplete, audioDelay]);
  
  // 播放控制函数
  const play = (newAudioUrl?: string) => {
    // 如果提供了新的音频URL，则创建新的Howl实例
    if (newAudioUrl && newAudioUrl !== audioUrl) {
      // 停止当前音频（如果有）
      if (soundRef.current) {
        soundRef.current.stop();
        soundRef.current.unload();
      }
      
      // 创建新的Howl实例
      const sound = new Howl({
        src: [newAudioUrl],
        html5: true,
        preload: true,
        onload: () => {
          setIsLoaded(true);
          setDuration(sound.duration() * 1000); // 转换为毫秒
          
          // 加载完成后立即播放
          triggeredBeatsRef.current.clear();
          sound.play();
        },
        onplay: () => {
          setIsPlaying(true);
          startTimeRef.current = performance.now() - audioDelay;
          
          // 开始时间更新循环
          const updateTime = () => {
            if (!soundRef.current) return;
            
            const now = performance.now();
            const elapsed = now - startTimeRef.current;
            setCurrentTime(elapsed);
            
            // 检查是否有需要触发的节拍点
            beatMap.forEach(beat => {
              if (!triggeredBeatsRef.current.has(beat.time) && 
                  elapsed >= beat.time - 50 && elapsed <= beat.time + 50) {
                // 触发节拍回调
                if (onBeat) onBeat(beat);
                triggeredBeatsRef.current.add(beat.time);
              }
            });
            
            // 继续循环
            timerRef.current = requestAnimationFrame(updateTime);
          };
          
          timerRef.current = requestAnimationFrame(updateTime);
        },
        onpause: () => {
          setIsPlaying(false);
          if (timerRef.current) {
            cancelAnimationFrame(timerRef.current);
            timerRef.current = null;
          }
        },
        onstop: () => {
          setIsPlaying(false);
          setCurrentTime(0);
          triggeredBeatsRef.current.clear();
          if (timerRef.current) {
            cancelAnimationFrame(timerRef.current);
            timerRef.current = null;
          }
        },
        onend: () => {
          setIsPlaying(false);
          if (timerRef.current) {
            cancelAnimationFrame(timerRef.current);
            timerRef.current = null;
          }
          if (onComplete) onComplete();
        }
      });
      
      soundRef.current = sound;
    }
    // 否则，播放当前音频（如果已加载）
    else if (soundRef.current && isLoaded) {
      triggeredBeatsRef.current.clear();
      soundRef.current.play();
    }
  };
  
  const pause = () => {
    if (soundRef.current && isPlaying) {
      soundRef.current.pause();
    }
  };
  
  const stop = () => {
    if (soundRef.current) {
      soundRef.current.stop();
    }
  };
  
  // 校准音频延迟
  const calibrateDelay = (testAudioUrl?: string) => {
    // 如果没有音频URL，则不执行校准
    if (!testAudioUrl && !audioUrl) {
      console.warn('无法校准延迟：未提供音频URL');
      return;
    }
    
    // 简单的延迟测试
    const startTime = performance.now();
    const testSound = new Howl({
      src: [testAudioUrl || audioUrl as string],
      volume: 0,
      onplay: () => {
        const delay = performance.now() - startTime;
        setAudioDelay(delay);
        testSound.stop();
        testSound.unload();
      }
    });
    testSound.play();
  };
  
  return {
    play,
    pause,
    stop,
    calibrateDelay,
    isPlaying,
    isLoaded,
    currentTime,
    duration,
    audioDelay
  };
};