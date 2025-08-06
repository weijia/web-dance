import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Canvas } from '@react-three/fiber';
import { motion } from 'framer-motion';
import { GameScene } from '../components/game-scene';
import { useHandTracking } from '../hooks/use-hand-tracking';
import { useAudioSync } from '../hooks/use-audio-sync';
import { gameManager } from '../systems/game-manager';
import { performanceMonitor } from '../systems/performance-monitor';

// 模拟歌曲数据
const mockSongs = {
  song1: {
    id: 'song1',
    title: '电子幻境',
    artist: 'Cyber Dreams',
    bpm: 120,
    duration: 180, // 秒
    difficulty: 'normal',
    audioUrl: '/songs/song1.mp3'
  },
  song2: {
    id: 'song2',
    title: '霓虹律动',
    artist: 'Neon Beats',
    bpm: 140,
    duration: 210,
    difficulty: 'hard',
    audioUrl: '/songs/song2.mp3'
  },
  song3: {
    id: 'song3',
    title: '数字浪潮',
    artist: 'Digital Wave',
    bpm: 100,
    duration: 240,
    difficulty: 'easy',
    audioUrl: '/songs/song3.mp3'
  }
};

// 模拟生成节拍点
const generateBeatPoints = (songId: string) => {
  const song = mockSongs[songId as keyof typeof mockSongs];
  if (!song) return [];
  
  const bpm = song.bpm;
  const beatInterval = 60000 / bpm; // 毫秒
  const duration = song.duration * 1000; // 毫秒
  const totalBeats = Math.floor(duration / beatInterval);
  
  const beatPoints = [];
  
  for (let i = 0; i < totalBeats; i++) {
    // 只生成部分节拍点（约1/3），使游戏更有挑战性
    if (Math.random() > 0.3) continue;
    
    // 生成随机位置
    const x = (Math.random() - 0.5) * 4; // -2 到 2
    const y = Math.random() * 2 + 0.5;   // 0.5 到 2.5
    const z = -5;
    
    // 随机颜色
    const colors = ['#00f3ff', '#ff00ff', '#00ff9f'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    
    // 随机大小
    const size = 0.2 + Math.random() * 0.2; // 0.2 到 0.4
    
    beatPoints.push({
      time: i * beatInterval,
      position: { x, y, z },
      color,
      size
    });
  }
  
  return beatPoints;
};

const GamePage: React.FC = () => {
  const { songId = 'song1' } = useParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(3);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [accuracy, setAccuracy] = useState(100);
  const [beatPoints, setBeatPoints] = useState<any[]>([]);
  const [showControls, setShowControls] = useState(false);
  const [showPerformanceInfo, setShowPerformanceInfo] = useState(false);
  const [fps, setFps] = useState(60);
  const [deviceTier, setDeviceTier] = useState(2);
  const [autoAdjust, setAutoAdjust] = useState(true);
  
  // 使用手部追踪钩子
  const { handPosition, isTracking, confidence } = useHandTracking();
  
  // 使用音频同步钩子
  const { 
    isPlaying, 
    currentTime, 
    duration, 
    play, 
    pause, 
    stop 
  } = useAudioSync();
  
  // 游戏结束时间引用
  const gameEndTimeRef = useRef<number | null>(null);
  
  // 加载歌曲和生成节拍点
  useEffect(() => {
    const loadSong = async () => {
      setIsLoading(true);
      
      try {
        // 获取歌曲数据
        const song = mockSongs[songId as keyof typeof mockSongs];
        if (!song) {
          navigate('/songs');
          return;
        }
        
        // 生成节拍点
        const beats = generateBeatPoints(songId);
        setBeatPoints(beats);
        
        // 模拟加载时间
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        setIsLoading(false);
        
        // 开始倒计时
        setCountdown(3);
        const countdownInterval = setInterval(() => {
          setCountdown(prev => {
            if (prev === null || prev <= 1) {
              clearInterval(countdownInterval);
              return null;
            }
            return prev - 1;
          });
        }, 1000);
        
        // 倒计时结束后开始游戏
        setTimeout(() => {
          play(song.audioUrl);
          
          // 设置游戏结束时间
          gameEndTimeRef.current = Date.now() + song.duration * 1000;
        }, 3000);
        
      } catch (error) {
        console.error('加载歌曲失败:', error);
        navigate('/songs');
      }
    };
    
    loadSong();
    
    // 清理函数
    return () => {
      stop();
    };
  }, [songId, navigate]);
  
  // 监听键盘事件
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          togglePause();
          break;
        case 'p':
          togglePerformanceInfo();
          break;
        case 'c':
          setShowControls(prev => !prev);
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isPaused]);
  
  // 监听游戏结束
  useEffect(() => {
    if (!isLoading && !isPaused && gameEndTimeRef.current) {
      const checkGameEnd = setInterval(() => {
        if (Date.now() >= gameEndTimeRef.current!) {
          clearInterval(checkGameEnd);
          endGame();
        }
      }, 1000);
      
      return () => {
        clearInterval(checkGameEnd);
      };
    }
  }, [isLoading, isPaused]);
  
  // 切换暂停状态
  const togglePause = () => {
    if (countdown !== null) return;
    
    setIsPaused(prev => {
      if (prev) {
        play();
      } else {
        pause();
      }
      return !prev;
    });
  };
  
  // 切换性能信息显示
  const togglePerformanceInfo = () => {
    setShowPerformanceInfo(prev => !prev);
  };
  
  // 切换自动调整性能
  const toggleAutoAdjust = () => {
    setAutoAdjust(prev => {
      const newValue = !prev;
      performanceMonitor.updateConfig({ autoAdjust: newValue });
      return newValue;
    });
  };
  
  // 结束游戏
  const endGame = () => {
    stop();
    
    // 导航到结果页面
    navigate('/result', {
      state: {
        score,
        maxCombo: combo,
        accuracy,
        songId,
        perfects: Math.floor(score / 100),
        goods: Math.floor(score / 200),
        misses: Math.floor(score / 300),
        difficulty: mockSongs[songId as keyof typeof mockSongs]?.difficulty || 'normal'
      }
    });
  };
  
  // 处理分数更新
  const handleScoreUpdate = (newScore: number, newCombo: number, newAccuracy: number) => {
    setScore(newScore);
    setCombo(newCombo);
    setAccuracy(newAccuracy);
  };
  
  // 处理判定结果
  const handleJudgement = (result: any, position: any) => {
    // 可以在这里添加额外的视觉或音频反馈
  };
  
  // 处理性能更新
  const handlePerformanceUpdate = (newFps: number, newDeviceTier: number) => {
    setFps(newFps);
    setDeviceTier(newDeviceTier);
  };
  
  return (
    <div className="relative min-h-screen w-full bg-cyber-black overflow-hidden">
      {/* 3D场景 */}
      <div className="absolute inset-0">
        <Canvas shadows camera={{ position: [0, 1, 2], fov: 75 }}>
          {!isLoading && (
            <GameScene 
              beatMap={beatPoints}
              handPosition={handPosition}
              isPaused={isPaused || countdown !== null}
              onScoreUpdate={handleScoreUpdate}
              onJudgement={handleJudgement}
              onPerformanceUpdate={handlePerformanceUpdate}
            />
          )}
        </Canvas>
      </div>
      
      {/* 加载界面 */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-cyber-black bg-opacity-80 z-50">
          <div className="text-center">
            <div className="text-neon-blue text-2xl mb-4">加载中...</div>
            <div className="w-48 h-2 bg-cyber-gray rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-neon-blue"
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                transition={{ duration: 1.5, ease: "easeInOut" }}
              />
            </div>
          </div>
        </div>
      )}
      
      {/* 倒计时 */}
      {!isLoading && countdown !== null && (
        <div className="absolute inset-0 flex items-center justify-center bg-cyber-black bg-opacity-50 z-40">
          <motion.div 
            className="text-neon-pink text-8xl font-bold"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.5, opacity: 0 }}
            key={countdown}
          >
            {countdown}
          </motion.div>
        </div>
      )}
      
      {/* 游戏UI */}
      {!isLoading && (
        <div className="absolute inset-0 pointer-events-none">
          {/* 顶部信息栏 */}
          <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center">
            <div className="cyber-panel p-2 px-4">
              <div className="text-sm text-gray-400">分数</div>
              <div className="text-2xl font-bold neon-text-blue">{score}</div>
            </div>
            
            <div className="cyber-panel p-2 px-4">
              <div className="text-sm text-gray-400">连击</div>
              <div className="text-2xl font-bold neon-text-pink">{combo}</div>
            </div>
            
            <div className="cyber-panel p-2 px-4">
              <div className="text-sm text-gray-400">准确度</div>
              <div className="text-2xl font-bold neon-text-green">{accuracy.toFixed(1)}%</div>
            </div>
          </div>
          
          {/* 暂停按钮 */}
          <button 
            className="absolute top-4 right-4 cyber-button-sm pointer-events-auto"
            onClick={togglePause}
          >
            {isPaused ? '继续' : '暂停'}
          </button>
          
          {/* 性能信息 */}
          {showPerformanceInfo && (
            <div className="absolute bottom-4 left-4 cyber-panel p-2">
              <div className="text-sm mb-1">性能监控</div>
              <div className={`text-sm ${fps >= 55 ? 'text-neon-green' : fps >= 30 ? 'text-neon-blue' : 'text-neon-pink'}`}>
                FPS: {fps}
              </div>
              <div className="text-sm">
                设备等级: {deviceTier === 3 ? '高' : deviceTier === 2 ? '中' : '低'}
              </div>
              <div className="flex items-center mt-2">
                <input 
                  type="checkbox" 
                  id="autoAdjust" 
                  checked={autoAdjust} 
                  onChange={toggleAutoAdjust}
                  className="mr-2 pointer-events-auto"
                />
                <label htmlFor="autoAdjust" className="text-sm">自动调整质量</label>
              </div>
            </div>
          )}
          
          {/* 控制提示 */}
          {showControls && (
            <div className="absolute bottom-4 right-4 cyber-panel p-2">
              <div className="text-sm mb-1">控制提示</div>
              <div className="text-xs">ESC: 暂停/继续</div>
              <div className="text-xs">P: 显示/隐藏性能</div>
              <div className="text-xs">C: 显示/隐藏控制提示</div>
            </div>
          )}
          
          {/* 暂停菜单 */}
          {isPaused && (
            <div className="absolute inset-0 flex items-center justify-center bg-cyber-black bg-opacity-70 z-30">
              <div className="cyber-panel p-6 w-80">
                <h2 className="text-2xl font-bold mb-4 neon-text-blue text-center">已暂停</h2>
                
                <div className="space-y-4">
                  <button 
                    className="cyber-button w-full pointer-events-auto"
                    onClick={togglePause}
                  >
                    继续游戏
                  </button>
                  
                  <button 
                    className="cyber-button w-full pointer-events-auto"
                    onClick={togglePerformanceInfo}
                  >
                    {showPerformanceInfo ? '隐藏性能信息' : '显示性能信息'}
                  </button>
                  
                  <button 
                    className="cyber-button w-full pointer-events-auto"
                    onClick={() => navigate('/songs')}
                  >
                    返回选曲
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GamePage;