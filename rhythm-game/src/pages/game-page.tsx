import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';

// 导入系统组件
import { GameScene } from '../components/game-scene';
import { motionTracker } from '../systems/motion-tracker';
import { audioSystem } from '../systems/audio-system';
import { gameManager, JudgementResult } from '../systems/game-manager';
import { PRESET_BEATMAPS, generateBeatsFromBPM } from '../systems/rhythm-engine';

// 模拟歌曲数据
const mockSongs = {
  song1: {
    id: 'song1',
    title: '电子幻境',
    artist: 'Cyber Dreams',
    bpm: 128,
    audioUrl: '/songs/song1.mp3',
    difficulty: 'normal',
    duration: 60000, // 60秒
    coverImage: '/images/covers/song1.jpg'
  },
  song2: {
    id: 'song2',
    title: '霓虹律动',
    artist: 'Neon Beats',
    bpm: 140,
    audioUrl: '/songs/song2.mp3',
    difficulty: 'hard',
    duration: 90000, // 90秒
    coverImage: '/images/covers/song2.jpg'
  },
  song3: {
    id: 'song3',
    title: '数字浪潮',
    artist: 'Digital Wave',
    bpm: 110,
    audioUrl: '/songs/song3.mp3',
    difficulty: 'easy',
    duration: 75000, // 75秒
    coverImage: '/images/covers/song3.jpg'
  }
};

// 游戏状态类型
type GameStatus = 'loading' | 'countdown' | 'playing' | 'paused' | 'finished';

// 判定结果显示组件
const JudgementDisplay: React.FC<{
  result: JudgementResult;
  position: { x: number; y: number };
}> = ({ result, position }) => {
  // 根据判定结果设置颜色和文本
  let color = '';
  let text = '';
  
  switch (result) {
    case 'perfect':
      color = 'text-neon-green';
      text = '完美!';
      break;
    case 'good':
      color = 'text-neon-blue';
      text = '不错!';
      break;
    case 'miss':
      color = 'text-neon-pink';
      text = '错过!';
      break;
    default:
      return null;
  }
  
  return (
    <motion.div
      className={`absolute ${color} font-bold text-xl`}
      style={{ left: position.x, top: position.y }}
      initial={{ opacity: 0, y: 0, scale: 0.5 }}
      animate={{ opacity: 1, y: -50, scale: 1.2 }}
      exit={{ opacity: 0, y: -100, scale: 0.8 }}
      transition={{ duration: 0.8 }}
    >
      {text}
    </motion.div>
  );
};

const GamePage: React.FC = () => {
  const { songId } = useParams<{ songId: string }>();
  const navigate = useNavigate();
  const [gameStatus, setGameStatus] = useState<GameStatus>('loading');
  const [countdown, setCountdown] = useState(3);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [accuracy, setAccuracy] = useState(100);
  const [songData, setSongData] = useState<any>(null);
  const [handPosition, setHandPosition] = useState<THREE.Vector3 | null>(null);
  const [beatMap, setBeatMap] = useState<any[]>([]);
  const [judgements, setJudgements] = useState<{
    id: string;
    result: JudgementResult;
    position: { x: number; y: number };
  }[]>([]);
  
  // 视频引用（用于手部追踪）
  const videoRef = useRef<HTMLVideoElement>(null);
  // 游戏容器引用
  const gameContainerRef = useRef<HTMLDivElement>(null);
  // 倒计时间隔引用
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // 初始化游戏数据
  useEffect(() => {
    if (!songId || !mockSongs[songId as keyof typeof mockSongs]) {
      navigate('/songs');
      return;
    }
    
    // 加载歌曲数据
    const song = mockSongs[songId as keyof typeof mockSongs];
    setSongData(song);
    
    // 生成或加载谱面
    let songBeatMap;
    if (PRESET_BEATMAPS[songId]) {
      songBeatMap = PRESET_BEATMAPS[songId].beats;
    } else {
      // 根据BPM生成谱面
      songBeatMap = generateBeatsFromBPM(
        song.bpm,
        song.duration,
        0,
        song.difficulty as any
      );
    }
    
    setBeatMap(songBeatMap);
    
    // 模拟资源加载
    const loadingTimer = setTimeout(() => {
      setGameStatus('countdown');
      
      // 开始倒计时
      countdownIntervalRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            if (countdownIntervalRef.current) {
              clearInterval(countdownIntervalRef.current);
            }
            setGameStatus('playing');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
    }, 2000);
    
    return () => {
      clearTimeout(loadingTimer);
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, [songId, navigate]);
  
  // 初始化手部追踪
  useEffect(() => {
    const initHandTracking = async () => {
      try {
        if (!videoRef.current) return;
        
        // 初始化手部追踪
        await motionTracker.initialize(videoRef.current);
        
        // 监听手部位置更新
        motionTracker.onUpdate((state) => {
          if (state.handPosition) {
            setHandPosition(state.handPosition);
          }
        });
        
      } catch (error) {
        console.error('无法初始化手部追踪:', error);
      }
    };
    
    if (gameStatus === 'countdown' || gameStatus === 'playing') {
      initHandTracking();
    }
    
    return () => {
      // 清理手部追踪资源
      motionTracker.dispose();
    };
  }, [gameStatus]);
  
  // 处理游戏状态变化
  useEffect(() => {
    if (gameStatus === 'playing' && songData) {
      // 加载并播放音频
      audioSystem.load(songData.audioUrl)
        .then(() => {
          audioSystem.play();
        })
        .catch(error => {
          console.error('音频加载失败:', error);
        });
      
      // 注册游戏结束回调
      audioSystem.onEnd(() => {
        // 游戏结束
        setGameStatus('finished');
        
        // 延迟导航到结果页面
        setTimeout(() => {
          navigate('/result', { 
            state: { 
              score, 
              maxCombo, 
              accuracy, 
              songId 
            } 
          });
        }, 3000);
      });
    } else if (gameStatus === 'paused') {
      // 暂停音频
      audioSystem.pause();
    } else if (gameStatus === 'finished') {
      // 停止音频
      audioSystem.stop();
    }
    
    return () => {
      // 清理音频资源
      if (gameStatus === 'finished') {
        audioSystem.dispose();
      }
    };
  }, [gameStatus, songData, navigate, score, maxCombo, accuracy, songId]);
  
  // 处理判定结果
  const handleJudgement = (result: JudgementResult, position: THREE.Vector3) => {
    if (!result || !gameContainerRef.current) return;
    
    // 将3D位置转换为屏幕位置
    const containerRect = gameContainerRef.current.getBoundingClientRect();
    const screenX = containerRect.width / 2 + position.x * 100;
    const screenY = containerRect.height / 2 - position.y * 100;
    
    // 添加判定显示
    const judgementId = `judgement-${Date.now()}-${Math.random()}`;
    setJudgements(prev => [
      ...prev,
      {
        id: judgementId,
        result,
        position: { x: screenX, y: screenY }
      }
    ]);
    
    // 2秒后移除判定显示
    setTimeout(() => {
      setJudgements(prev => prev.filter(j => j.id !== judgementId));
    }, 2000);
  };
  
  // 处理分数更新
  const handleScoreUpdate = (newScore: number, newCombo: number, newAccuracy: number) => {
    setScore(newScore);
    setCombo(newCombo);
    setAccuracy(newAccuracy);
    
    // 更新最大连击
    if (newCombo > maxCombo) {
      setMaxCombo(newCombo);
    }
  };
  
  // 暂停游戏
  const handlePause = () => {
    if (gameStatus === 'playing') {
      setGameStatus('paused');
    } else if (gameStatus === 'paused') {
      setGameStatus('playing');
    }
  };
  
  // 退出游戏
  const handleExit = () => {
    // 清理资源
    audioSystem.dispose();
    motionTracker.dispose();
    
    // 导航回歌曲选择页面
    navigate('/songs');
  };
  
  // 渲染加载状态
  if (gameStatus === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cyber-black">
        <div className="text-center">
          <div className="text-neon-blue text-2xl animate-pulse mb-4">加载中...</div>
          <div className="text-gray-400">正在准备 {songData?.title || '游戏'}</div>
        </div>
      </div>
    );
  }
  
  // 渲染倒计时
  if (gameStatus === 'countdown') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cyber-black">
        <div className="text-center">
          <div className="text-8xl font-bold neon-text-pink mb-8 animate-pulse">
            {countdown}
          </div>
          <div className="text-2xl text-neon-blue">准备开始</div>
        </div>
      </div>
    );
  }
  
  // 渲染游戏结束
  if (gameStatus === 'finished') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cyber-black">
        <div className="text-center">
          <div className="text-4xl font-bold neon-text-green mb-4">游戏结束</div>
          <div className="text-2xl mb-8">最终得分: {score}</div>
          <div className="text-xl text-gray-300 animate-pulse">正在计算结果...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full bg-cyber-black" ref={gameContainerRef}>
      {/* 隐藏的视频元素（用于手部追踪） */}
      <video 
        ref={videoRef}
        autoPlay 
        playsInline 
        muted
        className="hidden"
      />
      
      {/* 3D游戏场景 */}
      <div className="absolute inset-0">
        <Canvas shadows>
          <PerspectiveCamera makeDefault position={[0, 1, 3]} fov={75} />
          
          {/* 游戏场景组件 */}
          <GameScene 
            beatMap={beatMap}
            handPosition={handPosition}
            isPaused={gameStatus === 'paused'}
            onScoreUpdate={handleScoreUpdate}
            onJudgement={handleJudgement}
          />
          
          {/* 开发模式下的控制器 */}
          {process.env.NODE_ENV === 'development' && <OrbitControls />}
        </Canvas>
      </div>
      
      {/* 游戏UI覆盖层 */}
      <div className="absolute inset-0 pointer-events-none">
        {/* 顶部信息栏 */}
        <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center bg-gradient-to-b from-cyber-dark to-transparent">
          <div>
            <div className="text-lg font-bold">{songData?.title}</div>
            <div className="text-sm text-gray-400">{songData?.artist}</div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold neon-text-blue">{score}</div>
            <div className="text-sm text-gray-400">得分</div>
          </div>
        </div>
        
        {/* 连击计数 */}
        <div className="absolute top-1/4 left-1/2 transform -translate-x-1/2 text-center">
          {combo > 0 && (
            <motion.div
              key={combo}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.2 }}
            >
              <div className="text-4xl font-bold neon-text-pink">{combo}</div>
              <div className="text-sm text-neon-pink">COMBO</div>
            </motion.div>
          )}
        </div>
        
        {/* 判定结果显示 */}
        {judgements.map(judgement => (
          <JudgementDisplay
            key={judgement.id}
            result={judgement.result}
            position={judgement.position}
          />
        ))}
        
        {/* 准确度指示器 */}
        <div className="absolute bottom-4 left-4">
          <div className="text-sm text-gray-400 mb-1">准确度</div>
          <div className="w-32 h-2 bg-cyber-gray rounded-full overflow-hidden">
            <div 
              className="h-full bg-neon-green"
              style={{ width: `${accuracy}%` }}
            />
          </div>
          <div className="text-sm text-right text-neon-green">{accuracy.toFixed(1)}%</div>
        </div>
        
        {/* 控制按钮 */}
        <div className="absolute bottom-4 right-4 pointer-events-auto">
          <div className="flex gap-2">
            <button 
              className="cyber-button py-2 px-4 text-sm"
              onClick={handlePause}
            >
              {gameStatus === 'paused' ? '继续' : '暂停'}
            </button>
            <button 
              className="cyber-button py-2 px-4 text-sm bg-cyber-dark border-neon-pink hover:bg-neon-pink hover:shadow-neon-pink"
              onClick={handleExit}
            >
              退出
            </button>
          </div>
        </div>
      </div>
      
      {/* 暂停菜单 */}
      {gameStatus === 'paused' && (
        <div className="absolute inset-0 bg-cyber-black bg-opacity-80 flex items-center justify-center">
          <div className="cyber-panel w-80">
            <h2 className="text-2xl font-bold mb-6 neon-text-blue text-center">游戏暂停</h2>
            <div className="flex flex-col gap-4">
              <button 
                className="cyber-button"
                onClick={handlePause}
              >
                继续游戏
              </button>
              <button 
                className="cyber-button bg-cyber-dark border-neon-pink hover:bg-neon-pink hover:shadow-neon-pink"
                onClick={handleExit}
              >
                退出游戏
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* 性能监控（仅开发模式） */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute top-4 right-4 bg-cyber-dark bg-opacity-70 p-2 rounded text-xs">
          <div>FPS: {Math.round(1000 / 16)}</div>
          <div>手部置信度: {(handPosition ? 0.85 : 0) * 100}%</div>
          <div>音频延迟: {audioSystem.getState().currentTime.toFixed(0)}ms</div>
        </div>
      )}
    </div>
  );
};

export default GamePage;