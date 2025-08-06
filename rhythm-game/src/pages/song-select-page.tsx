import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

// 歌曲数据类型
interface Song {
  id: string;
  title: string;
  artist: string;
  bpm: number;
  duration: number;
  difficulty: 1 | 2 | 3; // 1-简单, 2-中等, 3-困难
  cover: string;
}

// 模拟歌曲数据
const mockSongs: Song[] = [
  {
    id: 'song1',
    title: '电子幻境',
    artist: 'Cyber Dreams',
    bpm: 128,
    duration: 210, // 秒
    difficulty: 2,
    cover: 'https://images.unsplash.com/photo-1614149162883-504ce4d13909?q=80&w=300&h=300&auto=format&fit=crop'
  },
  {
    id: 'song2',
    title: '霓虹律动',
    artist: 'Neon Beats',
    bpm: 140,
    duration: 195,
    difficulty: 3,
    cover: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=300&h=300&auto=format&fit=crop'
  },
  {
    id: 'song3',
    title: '数字浪潮',
    artist: 'Digital Wave',
    bpm: 110,
    duration: 240,
    difficulty: 1,
    cover: 'https://images.unsplash.com/photo-1557672172-298e090bd0f1?q=80&w=300&h=300&auto=format&fit=crop'
  },
];

const SongSelectPage: React.FC = () => {
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // 模拟资源加载
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  const handleSongSelect = (song: Song) => {
    setSelectedSong(song);
  };

  const handleStartGame = () => {
    if (selectedSong) {
      navigate(`/game/${selectedSong.id}`);
    }
  };

  // 渲染难度等级
  const renderDifficulty = (level: number) => {
    const dots = [];
    for (let i = 0; i < 3; i++) {
      dots.push(
        <div 
          key={i} 
          className={`w-3 h-3 rounded-full ${i < level ? 'bg-neon-pink' : 'bg-gray-600'}`}
        />
      );
    }
    return <div className="flex gap-1">{dots}</div>;
  };

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
        <Link to="/" className="text-neon-blue hover:text-white transition-colors">
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m12 19-7-7 7-7"/>
              <path d="M19 12H5"/>
            </svg>
            <span>返回</span>
          </div>
        </Link>
        <h1 className="text-2xl font-bold neon-text-blue">选择歌曲</h1>
        <div className="w-20"></div> {/* 占位，保持标题居中 */}
      </motion.div>
      
      {/* 歌曲列表 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {mockSongs.map((song, index) => (
          <motion.div
            key={song.id}
            className={`cyber-panel cursor-pointer transition-all ${
              selectedSong?.id === song.id ? 'border-neon-pink shadow-neon-pink' : ''
            }`}
            onClick={() => handleSongSelect(song)}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: isLoaded ? 1 : 0, y: isLoaded ? 0 : 20 }}
            transition={{ duration: 0.5, delay: 0.1 * index }}
          >
            <div className="flex gap-4">
              <img 
                src={song.cover} 
                alt={song.title} 
                className="w-24 h-24 object-cover rounded-md"
              />
              <div className="flex flex-col justify-between">
                <div>
                  <h3 className="text-xl font-bold">{song.title}</h3>
                  <p className="text-gray-400">{song.artist}</p>
                </div>
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-400">
                    BPM: {song.bpm}
                  </div>
                  {renderDifficulty(song.difficulty)}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
      
      {/* 底部控制区 */}
      <motion.div 
        className="fixed bottom-0 left-0 right-0 p-4 bg-cyber-dark bg-opacity-90 backdrop-blur-md border-t border-neon-blue"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: isLoaded ? 1 : 0, y: isLoaded ? 0 : 20 }}
        transition={{ duration: 0.5, delay: 0.5 }}
      >
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            {selectedSong && (
              <div>
                <p className="text-lg font-bold">{selectedSong.title}</p>
                <p className="text-sm text-gray-400">
                  {Math.floor(selectedSong.duration / 60)}:{(selectedSong.duration % 60).toString().padStart(2, '0')}
                </p>
              </div>
            )}
            <Link to="/editor" className="cyber-button-sm bg-cyber-dark border-neon-blue hover:bg-neon-blue hover:shadow-neon-blue">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9"/>
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
              </svg>
              <span>谱面编辑器</span>
            </Link>
          </div>
          <button 
            className={`cyber-button ${!selectedSong ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={handleStartGame}
            disabled={!selectedSong}
          >
            开始游戏
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default SongSelectPage;