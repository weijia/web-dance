import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { storageSystem, ScoreRecord } from '../systems/storage-system';

// 评级系统
const getRank = (score: number): string => {
  if (score >= 9000) return 'S';
  if (score >= 8000) return 'A';
  if (score >= 7000) return 'B';
  if (score >= 6000) return 'C';
  if (score >= 5000) return 'D';
  return 'E';
};

// 获取评级颜色
const getRankColor = (rank: string): string => {
  switch (rank) {
    case 'S': return 'text-neon-green';
    case 'A': return 'text-neon-blue';
    case 'B': return 'text-blue-400';
    case 'C': return 'text-yellow-400';
    case 'D': return 'text-orange-400';
    default: return 'text-red-400';
  }
};

// 模拟歌曲数据
const mockSongs = {
  song1: {
    id: 'song1',
    title: '电子幻境',
    artist: 'Cyber Dreams',
  },
  song2: {
    id: 'song2',
    title: '霓虹律动',
    artist: 'Neon Beats',
  },
  song3: {
    id: 'song3',
    title: '数字浪潮',
    artist: 'Digital Wave',
  }
};

interface GameResult {
  score: number;
  maxCombo: number;
  accuracy: number;
  songId: string;
  perfects?: number;
  goods?: number;
  misses?: number;
  difficulty?: string;
}

const ResultPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isLoaded, setIsLoaded] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [playerName, setPlayerName] = useState('玩家');
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [highScores, setHighScores] = useState<ScoreRecord[]>([]);
  const [playerRank, setPlayerRank] = useState(0);
  
  // 从location state获取游戏结果
  const gameResult = location.state as GameResult;
  const { 
    score = 0, 
    maxCombo = 0, 
    accuracy = 0, 
    songId = 'song1',
    perfects = 0,
    goods = 0,
    misses = 0,
    difficulty = 'normal'
  } = gameResult || {};
  
  const rank = getRank(score);
  const rankColor = getRankColor(rank);
  const songData = mockSongs[songId as keyof typeof mockSongs] || { title: '未知歌曲', artist: '未知艺术家' };
  
  // 加载玩家名称和排行榜
  useEffect(() => {
    const loadData = async () => {
      try {
        // 加载玩家设置
        const settings = await storageSystem.getSettings();
        if (settings) {
          setPlayerName(settings.playerName);
        }
        
        // 加载排行榜
        const leaderboard = await storageSystem.getLeaderboard(songId, difficulty, 10);
        
        // 如果有游戏结果，添加当前分数（但不保存）
        if (gameResult) {
          const currentScore: ScoreRecord = {
            songId,
            playerName: settings?.playerName || '玩家',
            score,
            maxCombo,
            accuracy,
            perfects: perfects || 0,
            goods: goods || 0,
            misses: misses || 0,
            date: new Date(),
            difficulty: difficulty || 'normal'
          };
          
          // 合并并排序
          const allScores = [...leaderboard, currentScore].sort((a, b) => b.score - a.score);
          setHighScores(allScores.slice(0, 10));
          
          // 计算玩家排名
          const rank = allScores.findIndex(item => 
            item.score === score && 
            item.playerName === currentScore.playerName
          ) + 1;
          setPlayerRank(rank);
        } else {
          setHighScores(leaderboard);
        }
        
        setIsLoaded(true);
        
        // 如果得分高，显示庆祝效果
        if (score >= 7000) {
          setShowConfetti(true);
        }
      } catch (error) {
        console.error('加载数据失败:', error);
        setIsLoaded(true);
      }
    };
    
    loadData();
  }, [gameResult, score, maxCombo, accuracy, songId, perfects, goods, misses, difficulty]);
  
  // 保存分数
  const saveScore = async () => {
    if (isSaved || !gameResult) return;
    
    setIsSaving(true);
    
    try {
      const scoreRecord: ScoreRecord = {
        songId,
        playerName,
        score,
        maxCombo,
        accuracy,
        perfects: perfects || 0,
        goods: goods || 0,
        misses: misses || 0,
        date: new Date(),
        difficulty: difficulty || 'normal'
      };
      
      await storageSystem.saveScore(scoreRecord);
      setIsSaved(true);
      
      // 重新加载排行榜
      const leaderboard = await storageSystem.getLeaderboard(songId, difficulty, 10);
      setHighScores(leaderboard);
      
      // 计算新的排名
      const rank = leaderboard.findIndex(item => 
        item.score === score && 
        item.playerName === playerName
      ) + 1;
      setPlayerRank(rank);
      
    } catch (error) {
      console.error('保存分数失败:', error);
    } finally {
      setIsSaving(false);
    }
  };
  
  // 如果没有游戏结果数据，重定向到歌曲选择页面
  useEffect(() => {
    if (!location.state) {
      navigate('/songs');
    }
  }, [location.state, navigate]);
  
  // 自动保存分数
  useEffect(() => {
    if (isLoaded && gameResult && !isSaved && !isSaving) {
      saveScore();
    }
  }, [isLoaded, gameResult, isSaved, isSaving]);
  
  if (!location.state) {
    return null;
  }

  return (
    <div className="relative min-h-screen w-full bg-cyber-black text-white p-4 md:p-8">
      {/* 背景网格 */}
      <div className="absolute inset-0 bg-cyber-grid opacity-20 z-0"></div>
      
      {/* 顶部导航 */}
      <motion.div 
        className="mb-8 flex justify-between items-center"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: isLoaded ? 1 : 0, y: isLoaded ? 0 : -20 }}
        transition={{ duration: 0.5 }}
      >
        <Link to="/songs" className="text-neon-blue hover:text-white transition-colors">
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m12 19-7-7 7-7"/>
              <path d="M19 12H5"/>
            </svg>
            <span>返回选曲</span>
          </div>
        </Link>
        <h1 className="text-2xl font-bold neon-text-blue">游戏结果</h1>
        <div className="w-20"></div> {/* 占位，保持标题居中 */}
      </motion.div>
      
      {/* 主内容 */}
      <div className="max-w-4xl mx-auto">
        {/* 歌曲信息 */}
        <motion.div 
          className="cyber-panel mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: isLoaded ? 1 : 0, y: isLoaded ? 0 : 20 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
              <h2 className="text-2xl font-bold">{songData.title}</h2>
              <p className="text-gray-400">{songData.artist}</p>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-sm text-gray-400">难度</div>
                <div className="flex gap-1 mt-1">
                  {difficulty === 'easy' && (
                    <>
                      <div className="w-3 h-3 rounded-full bg-neon-green"></div>
                      <div className="w-3 h-3 rounded-full bg-gray-600"></div>
                      <div className="w-3 h-3 rounded-full bg-gray-600"></div>
                    </>
                  )}
                  {difficulty === 'normal' && (
                    <>
                      <div className="w-3 h-3 rounded-full bg-neon-blue"></div>
                      <div className="w-3 h-3 rounded-full bg-neon-blue"></div>
                      <div className="w-3 h-3 rounded-full bg-gray-600"></div>
                    </>
                  )}
                  {difficulty === 'hard' && (
                    <>
                      <div className="w-3 h-3 rounded-full bg-neon-pink"></div>
                      <div className="w-3 h-3 rounded-full bg-neon-pink"></div>
                      <div className="w-3 h-3 rounded-full bg-neon-pink"></div>
                    </>
                  )}
                </div>
              </div>
              <div className={`text-5xl font-bold ${rankColor}`}>{rank}</div>
            </div>
          </div>
        </motion.div>
        
        {/* 得分详情 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <motion.div 
            className="cyber-panel"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: isLoaded ? 1 : 0, y: isLoaded ? 0 : 20 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="text-center">
              <div className="text-sm text-gray-400 mb-2">得分</div>
              <div className="text-4xl font-bold neon-text-blue">{score}</div>
            </div>
          </motion.div>
          
          <motion.div 
            className="cyber-panel"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: isLoaded ? 1 : 0, y: isLoaded ? 0 : 20 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <div className="text-center">
              <div className="text-sm text-gray-400 mb-2">最大连击</div>
              <div className="text-4xl font-bold neon-text-pink">{maxCombo}</div>
            </div>
          </motion.div>
          
          <motion.div 
            className="cyber-panel"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: isLoaded ? 1 : 0, y: isLoaded ? 0 : 20 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <div className="text-center">
              <div className="text-sm text-gray-400 mb-2">准确度</div>
              <div className="text-4xl font-bold neon-text-green">{accuracy.toFixed(1)}%</div>
            </div>
          </motion.div>
        </div>
        
        {/* 判定详情 */}
        {(perfects !== undefined || goods !== undefined || misses !== undefined) && (
          <motion.div 
            className="cyber-panel mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: isLoaded ? 1 : 0, y: isLoaded ? 0 : 20 }}
            transition={{ duration: 0.5, delay: 0.45 }}
          >
            <h3 className="text-xl font-bold mb-4">判定详情</h3>
            <div className="flex justify-around">
              <div className="text-center">
                <div className="text-sm text-gray-400 mb-1">完美</div>
                <div className="text-2xl font-bold text-neon-green">{perfects}</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-400 mb-1">良好</div>
                <div className="text-2xl font-bold text-neon-blue">{goods}</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-400 mb-1">错过</div>
                <div className="text-2xl font-bold text-neon-pink">{misses}</div>
              </div>
            </div>
          </motion.div>
        )}
        
        {/* 排行榜 */}
        <motion.div 
          className="cyber-panel mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: isLoaded ? 1 : 0, y: isLoaded ? 0 : 20 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold">排行榜</h3>
            {isSaving && (
              <div className="text-sm text-neon-blue animate-pulse">保存中...</div>
            )}
            {isSaved && (
              <div className="text-sm text-neon-green">已保存</div>
            )}
          </div>
          
          <div className="overflow-hidden">
            {highScores.length > 0 ? (
              highScores.map((item, index) => (
                <div 
                  key={index}
                  className={`flex justify-between items-center py-3 px-4 ${
                    item.playerName === playerName && item.score === score ? 'bg-cyber-gray bg-opacity-50 rounded-md' : ''
                  } ${index !== highScores.length - 1 ? 'border-b border-gray-700' : ''}`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                      index === 0 ? 'bg-yellow-500' : 
                      index === 1 ? 'bg-gray-400' : 
                      index === 2 ? 'bg-amber-700' : 'bg-cyber-gray'
                    }`}>
                      {index + 1}
                    </div>
                    <div className={item.playerName === playerName && item.score === score ? 'font-bold' : ''}>
                      {item.playerName}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div>{item.score}</div>
                    <div className={getRankColor(getRank(item.score))}>{getRank(item.score)}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-gray-400">
                暂无排行数据
              </div>
            )}
          </div>
          
          {playerRank > 0 && playerRank > 10 && (
            <div className="mt-2 text-center text-sm text-gray-400">
              你的排名: 第 {playerRank} 名
            </div>
          )}
        </motion.div>
        
        {/* 操作按钮 */}
        <motion.div 
          className="flex flex-col sm:flex-row gap-4 justify-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: isLoaded ? 1 : 0, y: isLoaded ? 0 : 20 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <Link to={`/game/${songId}`} className="cyber-button">
            再玩一次
          </Link>
          <Link to="/songs" className="cyber-button bg-cyber-dark border-neon-pink hover:bg-neon-pink hover:shadow-neon-pink">
            选择其他歌曲
          </Link>
        </motion.div>
      </div>
      
      {/* 庆祝特效 */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none">
          {/* 这里可以添加粒子效果或其他庆祝动画 */}
          <div className="absolute top-10 left-1/4 w-2 h-20 bg-neon-pink animate-pulse-slow"></div>
          <div className="absolute top-20 left-1/3 w-2 h-32 bg-neon-blue animate-pulse-slow"></div>
          <div className="absolute top-5 right-1/4 w-2 h-24 bg-neon-green animate-pulse-slow"></div>
          <div className="absolute top-15 right-1/3 w-2 h-16 bg-neon-pink animate-pulse-slow"></div>
        </div>
      )}
    </div>
  );
};

export default ResultPage;