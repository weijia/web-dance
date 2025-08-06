import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Canvas } from '@react-three/fiber';
import { motion } from 'framer-motion';
import { storageSystem } from '../systems/storage-system';
import { EditorScene } from '../components/editor-scene';
import { audioSystem } from '../systems/audio-system';
import { useEditorHistory } from '../hooks/use-editor-history';
import { useEditorShortcuts, defaultShortcuts } from '../hooks/use-editor-shortcuts';
import { useEditorClipboard } from '../hooks/use-editor-clipboard';
import { useEditorSelection } from '../hooks/use-editor-selection';

// 谱面类型
export interface BeatmapData {
  id: string;
  name: string;
  songId: string;
  songName: string;
  artist: string;
  creator: string;
  difficulty: 'easy' | 'normal' | 'hard';
  bpm: number;
  offset: number;
  beats: BeatPoint[];
  createdAt: Date;
  updatedAt: Date;
}

// 节拍点类型
export interface BeatPoint {
  time: number;
  position: {
    x: number;
    y: number;
    z: number;
  };
  color?: string;
  size?: number;
}

// 音频波形组件
const AudioWaveform: React.FC<{
  audioBuffer: AudioBuffer | null;
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
}> = ({ audioBuffer, currentTime, duration, onSeek }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // 绘制波形
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !audioBuffer) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 设置样式
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 获取音频数据
    const channelData = audioBuffer.getChannelData(0);
    const step = Math.ceil(channelData.length / canvas.width);
    
    // 绘制波形
    ctx.beginPath();
    ctx.strokeStyle = '#00f3ff';
    ctx.lineWidth = 1;
    
    for (let i = 0; i < canvas.width; i++) {
      const index = i * step;
      let sum = 0;
      
      // 计算每个点的平均振幅
      for (let j = 0; j < step; j++) {
        if (index + j < channelData.length) {
          sum += Math.abs(channelData[index + j]);
        }
      }
      
      const avg = sum / step;
      const height = avg * canvas.height * 2;
      
      // 绘制线条
      const y = (canvas.height / 2) - height;
      if (i === 0) {
        ctx.moveTo(i, y);
      } else {
        ctx.lineTo(i, y);
      }
    }
    
    ctx.stroke();
    
    // 绘制当前位置
    const currentX = (currentTime / duration) * canvas.width;
    ctx.beginPath();
    ctx.strokeStyle = '#ff00ff';
    ctx.lineWidth = 2;
    ctx.moveTo(currentX, 0);
    ctx.lineTo(currentX, canvas.height);
    ctx.stroke();
    
    // 绘制节拍线
    if (audioBuffer) {
      const bpm = 120; // 默认BPM，实际应该从谱面数据获取
      const secondsPerBeat = 60 / bpm;
      const pixelsPerSecond = canvas.width / duration;
      
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1;
      
      for (let time = 0; time < duration; time += secondsPerBeat) {
        const x = time * pixelsPerSecond;
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
      }
      
      ctx.stroke();
    }
  }, [audioBuffer, currentTime, duration]);
  
  // 处理点击事件
  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const ratio = x / canvasRef.current.width;
    const seekTime = ratio * duration;
    
    onSeek(seekTime);
  };
  
  return (
    <canvas 
      ref={canvasRef} 
      width={1000} 
      height={100} 
      className="w-full h-24 cursor-pointer"
      onClick={handleClick}
    />
  );
};

// 工具栏组件
const EditorToolbar: React.FC<{
  isPlaying: boolean;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onSave: () => void;
  onTest: () => void;
  currentTool: string;
  setCurrentTool: (tool: string) => void;
  currentColor: string;
  setCurrentColor: (color: string) => void;
  currentSize: number;
  setCurrentSize: (size: number) => void;
  snapToGrid: boolean;
  setSnapToGrid: (snap: boolean) => void;
  showGrid: boolean;
  setShowGrid: (show: boolean) => void;
}> = ({
  isPlaying,
  onPlay,
  onPause,
  onStop,
  onSave,
  onTest,
  currentTool,
  setCurrentTool,
  currentColor,
  setCurrentColor,
  currentSize,
  setCurrentSize,
  snapToGrid,
  setSnapToGrid,
  showGrid,
  setShowGrid
}) => {
  // 可用颜色
  const colors = ['#00f3ff', '#ff00ff', '#00ff9f', '#ffff00', '#ff5500'];
  
  return (
    <div className="cyber-panel p-2 flex flex-col gap-2">
      {/* 播放控制 */}
      <div className="flex gap-2">
        {!isPlaying ? (
          <button className="cyber-button-sm flex-1" onClick={onPlay}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
            <span>播放</span>
          </button>
        ) : (
          <button className="cyber-button-sm flex-1" onClick={onPause}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="6" y="4" width="4" height="16"/>
              <rect x="14" y="4" width="4" height="16"/>
            </svg>
            <span>暂停</span>
          </button>
        )}
        <button className="cyber-button-sm flex-1" onClick={onStop}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="4" y="4" width="16" height="16"/>
          </svg>
          <span>停止</span>
        </button>
      </div>
      
      {/* 工具选择 */}
      <div className="border-t border-gray-700 pt-2">
        <div className="text-sm mb-1">工具</div>
        <div className="flex gap-2">
          <button 
            className={`cyber-button-sm flex-1 ${currentTool === 'add' ? 'bg-neon-blue bg-opacity-30' : ''}`}
            onClick={() => setCurrentTool('add')}
            title="添加节拍点 (2)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="16"/>
              <line x1="8" y1="12" x2="16" y2="12"/>
            </svg>
            <span>添加</span>
          </button>
          <button 
            className={`cyber-button-sm flex-1 ${currentTool === 'select' ? 'bg-neon-blue bg-opacity-30' : ''}`}
            onClick={() => setCurrentTool('select')}
            title="选择节拍点 (1)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/>
            </svg>
            <span>选择</span>
          </button>
          <button 
            className={`cyber-button-sm flex-1 ${currentTool === 'delete' ? 'bg-neon-blue bg-opacity-30' : ''}`}
            onClick={() => setCurrentTool('delete')}
            title="删除节拍点 (3)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18"/>
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
            </svg>
            <span>删除</span>
          </button>
        </div>
      </div>
      
      {/* 编辑操作 */}
      <div className="border-t border-gray-700 pt-2">
        <div className="text-sm mb-1">编辑</div>
        <div className="flex gap-2 mb-2">
          <button 
            className={`cyber-button-sm flex-1 ${!canUndo ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={handleUndo}
            disabled={!canUndo}
            title="撤销 (Ctrl+Z)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 7v6h6"/>
              <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>
            </svg>
            <span>撤销</span>
          </button>
          <button 
            className={`cyber-button-sm flex-1 ${!canRedo ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={handleRedo}
            disabled={!canRedo}
            title="重做 (Ctrl+Y)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 7v6h-6"/>
              <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13"/>
            </svg>
            <span>重做</span>
          </button>
        </div>
        <div className="flex gap-2">
          <button 
            className={`cyber-button-sm flex-1 ${selectedIndices.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={handleCopy}
            disabled={selectedIndices.length === 0}
            title="复制 (Ctrl+C)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
            <span>复制</span>
          </button>
          <button 
            className={`cyber-button-sm flex-1 ${!hasClipboardContent ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={handlePaste}
            disabled={!hasClipboardContent}
            title="粘贴 (Ctrl+V)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
              <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
            </svg>
            <span>粘贴{clipboardSize > 0 ? ` (${clipboardSize})` : ''}</span>
          </button>
        </div>
      </div>
      
      {/* 颜色选择 */}
      <div className="border-t border-gray-700 pt-2">
        <div className="text-sm mb-1">颜色</div>
        <div className="flex gap-2">
          {colors.map(color => (
            <button 
              key={color}
              className={`w-8 h-8 rounded-full ${currentColor === color ? 'ring-2 ring-white' : ''}`}
              style={{ backgroundColor: color }}
              onClick={() => setCurrentColor(color)}
            />
          ))}
        </div>
      </div>
      
      {/* 大小选择 */}
      <div className="border-t border-gray-700 pt-2">
        <div className="text-sm mb-1">大小: {currentSize.toFixed(1)}</div>
        <input 
          type="range" 
          min="0.1" 
          max="0.5" 
          step="0.1" 
          value={currentSize}
          onChange={(e) => setCurrentSize(parseFloat(e.target.value))}
          className="w-full"
        />
      </div>
      
      {/* 网格设置 */}
      <div className="border-t border-gray-700 pt-2">
        <div className="flex items-center gap-2">
          <input 
            type="checkbox" 
            id="snapToGrid" 
            checked={snapToGrid}
            onChange={(e) => setSnapToGrid(e.target.checked)}
          />
          <label htmlFor="snapToGrid" className="text-sm">吸附到网格</label>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <input 
            type="checkbox" 
            id="showGrid" 
            checked={showGrid}
            onChange={(e) => setShowGrid(e.target.checked)}
          />
          <label htmlFor="showGrid" className="text-sm">显示网格</label>
        </div>
      </div>
      
      {/* 保存和测试 */}
      <div className="border-t border-gray-700 pt-2 flex gap-2">
        <button className="cyber-button-sm flex-1" onClick={onSave}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
            <polyline points="17 21 17 13 7 13 7 21"/>
            <polyline points="7 3 7 8 15 8"/>
          </svg>
          <span>保存</span>
        </button>
        <button className="cyber-button-sm flex-1" onClick={onTest}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M13 19l9-7-9-7v14z"/>
            <path d="M2 19l9-7-9-7v14z"/>
          </svg>
          <span>测试</span>
        </button>
      </div>
    </div>
  );
};

// 谱面信息表单
const BeatmapInfoForm: React.FC<{
  beatmap: Partial<BeatmapData>;
  onChange: (field: string, value: any) => void;
  onClose: () => void;
  onSave: () => void;
}> = ({ beatmap, onChange, onClose, onSave }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
      <div className="cyber-panel p-6 w-96 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold neon-text-blue">谱面信息</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">谱面名称</label>
            <input 
              type="text" 
              value={beatmap.name || ''} 
              onChange={(e) => onChange('name', e.target.value)}
              className="cyber-input w-full"
              placeholder="输入谱面名称"
            />
          </div>
          
          <div>
            <label className="block text-sm text-gray-400 mb-1">歌曲名称</label>
            <input 
              type="text" 
              value={beatmap.songName || ''} 
              onChange={(e) => onChange('songName', e.target.value)}
              className="cyber-input w-full"
              placeholder="输入歌曲名称"
            />
          </div>
          
          <div>
            <label className="block text-sm text-gray-400 mb-1">艺术家</label>
            <input 
              type="text" 
              value={beatmap.artist || ''} 
              onChange={(e) => onChange('artist', e.target.value)}
              className="cyber-input w-full"
              placeholder="输入艺术家名称"
            />
          </div>
          
          <div>
            <label className="block text-sm text-gray-400 mb-1">创作者</label>
            <input 
              type="text" 
              value={beatmap.creator || ''} 
              onChange={(e) => onChange('creator', e.target.value)}
              className="cyber-input w-full"
              placeholder="输入创作者名称"
            />
          </div>
          
          <div>
            <label className="block text-sm text-gray-400 mb-1">难度</label>
            <select 
              value={beatmap.difficulty || 'normal'} 
              onChange={(e) => onChange('difficulty', e.target.value)}
              className="cyber-input w-full"
            >
              <option value="easy">简单</option>
              <option value="normal">普通</option>
              <option value="hard">困难</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm text-gray-400 mb-1">BPM</label>
            <input 
              type="number" 
              value={beatmap.bpm || 120} 
              onChange={(e) => onChange('bpm', parseInt(e.target.value))}
              className="cyber-input w-full"
              min="60"
              max="200"
            />
          </div>
          
          <div>
            <label className="block text-sm text-gray-400 mb-1">偏移量 (毫秒)</label>
            <input 
              type="number" 
              value={beatmap.offset || 0} 
              onChange={(e) => onChange('offset', parseInt(e.target.value))}
              className="cyber-input w-full"
              step="10"
            />
          </div>
          
          <div className="pt-4 flex justify-end">
            <button className="cyber-button" onClick={onSave}>保存谱面</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// 谱面编辑器页面
const EditorPage: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [beats, setBeats] = useState<BeatPoint[]>([]);
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  
  // 使用编辑器功能钩子
  const { 
    selectedIndices, 
    selectBeat, 
    selectBeats, 
    clearSelection,
    startBoxSelection,
    updateBoxSelection,
    endBoxSelection,
    getSelectionBox,
    isSelecting
  } = useEditorSelection();
  
  const {
    addHistory,
    undo,
    redo,
    canUndo,
    canRedo
  } = useEditorHistory(beats);
  
  const {
    copyBeats,
    pasteBeats,
    cutBeats,
    hasClipboardContent,
    clipboardSize
  } = useEditorClipboard();
  const [currentTool, setCurrentTool] = useState('add');
  const [currentColor, setCurrentColor] = useState('#00f3ff');
  const [currentSize, setCurrentSize] = useState(0.3);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [showBeatmapInfo, setShowBeatmapInfo] = useState(false);
  const [beatmap, setBeatmap] = useState<Partial<BeatmapData>>({
    id: `beatmap-${Date.now()}`,
    name: '新谱面',
    songId: 'custom',
    songName: '自定义歌曲',
    artist: '未知艺术家',
    creator: '玩家',
    difficulty: 'normal',
    bpm: 120,
    offset: 0,
    beats: [],
    createdAt: new Date(),
    updatedAt: new Date()
  });
  
  // 加载音频文件
  useEffect(() => {
    const loadAudio = async () => {
      setIsLoading(true);
      
      try {
        // 这里应该有一个文件选择器，但为了演示，我们使用一个固定的音频文件
        const audioUrl = '/songs/song1.mp3';
        
        // 加载音频
        await audioSystem.load('editor-song', audioUrl);
        
        // 获取音频缓冲区
        const buffer = await audioSystem.getAudioBuffer();
        setAudioBuffer(buffer);
        
        // 获取音频时长
        if (buffer) {
          setDuration(buffer.duration);
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error('加载音频失败:', error);
        setIsLoading(false);
      }
    };
    
    loadAudio();
    
    return () => {
      audioSystem.stop();
    };
  }, []);
  
  // 更新当前时间
  useEffect(() => {
    if (!isPlaying) return;
    
    const interval = setInterval(() => {
      const time = audioSystem.getCurrentTime();
      setCurrentTime(time);
    }, 16);
    
    return () => {
      clearInterval(interval);
    };
  }, [isPlaying]);
  
  // 播放音频
  const handlePlay = () => {
    audioSystem.play();
    setIsPlaying(true);
  };
  
  // 暂停音频
  const handlePause = () => {
    audioSystem.pause();
    setIsPlaying(false);
  };
  
  // 停止音频
  const handleStop = () => {
    audioSystem.stop();
    setIsPlaying(false);
    setCurrentTime(0);
  };
  
  // 跳转到指定时间
  const handleSeek = (time: number) => {
    audioSystem.seek(time);
    setCurrentTime(time);
  };
  
  // 添加节拍点
  const handleAddBeat = (position: { x: number, y: number, z: number }) => {
    const newBeat: BeatPoint = {
      time: currentTime * 1000, // 转换为毫秒
      position,
      color: currentColor,
      size: currentSize
    };
    
    const updatedBeats = [...beats, newBeat];
    setBeats(updatedBeats);
    addHistory(updatedBeats);
    
    // 选择新添加的节拍点
    selectBeat(updatedBeats.length - 1);
  };
  
  // 选择节拍点
  const handleSelectBeat = (index: number, addToSelection: boolean = false) => {
    selectBeat(index, addToSelection);
  };
  
  // 删除节拍点
  const handleDeleteBeat = (index: number) => {
    const updatedBeats = beats.filter((_, i) => i !== index);
    setBeats(updatedBeats);
    addHistory(updatedBeats);
    clearSelection();
  };
  
  // 更新节拍点位置
  const handleUpdateBeatPosition = (index: number, position: { x: number, y: number, z: number }) => {
    const updatedBeats = beats.map((beat, i) => {
      if (selectedIndices.includes(i)) {
        // 如果是选中的节拍点，计算相对移动
        const selectedBeat = beats[index];
        const dx = position.x - selectedBeat.position.x;
        const dy = position.y - selectedBeat.position.y;
        const dz = position.z - selectedBeat.position.z;
        
        return {
          ...beat,
          position: {
            x: beat.position.x + dx,
            y: beat.position.y + dy,
            z: beat.position.z + dz
          }
        };
      }
      return beat;
    });
    
    setBeats(updatedBeats);
    // 不要在拖动过程中添加历史记录，而是在拖动结束时添加
  };
  
  // 拖动结束时添加历史记录
  const handleDragEnd = () => {
    addHistory([...beats]);
  };
  
  // 更新谱面信息
  const handleBeatmapChange = (field: string, value: any) => {
    setBeatmap(prev => ({ ...prev, [field]: value }));
  };
  
  // 保存谱面
  const handleSaveBeatmap = async () => {
    try {
      // 更新节拍点
      const updatedBeatmap = {
        ...beatmap,
        beats,
        updatedAt: new Date()
      };
      
      // 保存到本地存储
      await storageSystem.saveBeatmap(updatedBeatmap as BeatmapData);
      
      alert('谱面保存成功！');
    } catch (error) {
      console.error('保存谱面失败:', error);
      alert('保存谱面失败，请重试。');
    }
  };
  
  // 测试谱面
  const handleTestBeatmap = () => {
    // 保存当前谱面到临时存储
    const testBeatmap = {
      ...beatmap,
      beats,
      id: 'test-beatmap',
      updatedAt: new Date()
    };
    
    // 导航到游戏页面进行测试
    navigate('/game/test-beatmap', { state: { testBeatmap } });
  };
  
  // 撤销操作
  const handleUndo = () => {
    if (canUndo) {
      const previousBeats = undo();
      setBeats(previousBeats);
    }
  };
  
  // 重做操作
  const handleRedo = () => {
    if (canRedo) {
      const nextBeats = redo();
      setBeats(nextBeats);
    }
  };
  
  // 复制操作
  const handleCopy = () => {
    if (selectedIndices.length > 0) {
      copyBeats(beats, selectedIndices);
    }
  };
  
  // 粘贴操作
  const handlePaste = () => {
    if (hasClipboardContent) {
      const newBeats = pasteBeats(currentTime * 1000);
      if (newBeats.length > 0) {
        const updatedBeats = [...beats, ...newBeats];
        setBeats(updatedBeats);
        addHistory(updatedBeats);
        
        // 选择新粘贴的节拍点
        const newIndices = Array.from(
          { length: newBeats.length }, 
          (_, i) => beats.length + i
        );
        selectBeats(newIndices);
      }
    }
  };
  
  // 剪切操作
  const handleCut = () => {
    if (selectedIndices.length > 0) {
      const updatedBeats = cutBeats(beats, selectedIndices);
      setBeats(updatedBeats);
      addHistory(updatedBeats);
      clearSelection();
    }
  };
  
  // 删除操作
  const handleDelete = () => {
    if (selectedIndices.length > 0) {
      const updatedBeats = beats.filter((_, index) => !selectedIndices.includes(index));
      setBeats(updatedBeats);
      addHistory(updatedBeats);
      clearSelection();
    }
  };
  
  // 全选操作
  const handleSelectAll = () => {
    const allIndices = Array.from({ length: beats.length }, (_, i) => i);
    selectBeats(allIndices);
  };
  
  // 注册键盘快捷键
  useEditorShortcuts([
    { key: 'z', ctrl: true, action: handleUndo },
    { key: 'y', ctrl: true, action: handleRedo },
    { key: 'c', ctrl: true, action: handleCopy },
    { key: 'v', ctrl: true, action: handlePaste },
    { key: 'x', ctrl: true, action: handleCut },
    { key: 'Delete', action: handleDelete },
    { key: 'a', ctrl: true, action: handleSelectAll },
    { key: 's', ctrl: true, action: () => setShowBeatmapInfo(true) },
    { key: ' ', action: () => isPlaying ? handlePause() : handlePlay() },
    { key: 'Escape', action: handleStop },
    { key: 'g', action: () => setShowGrid(!showGrid) },
    { key: 's', action: () => setSnapToGrid(!snapToGrid) },
    { key: '1', action: () => setCurrentTool('select') },
    { key: '2', action: () => setCurrentTool('add') },
    { key: '3', action: () => setCurrentTool('delete') },
  ]);
  
  return (
    <div className="relative min-h-screen w-full bg-cyber-black overflow-hidden">
      {/* 顶部导航 */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-10">
        <button 
          className="cyber-button-sm"
          onClick={() => navigate('/songs')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m12 19-7-7 7-7"/>
            <path d="M19 12H5"/>
          </svg>
          <span>返回</span>
        </button>
        
        <h1 className="text-xl font-bold neon-text-blue">谱面编辑器</h1>
        
        <button 
          className="cyber-button-sm"
          onClick={() => setShowBeatmapInfo(true)}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 16v-4"/>
            <path d="M12 8h.01"/>
          </svg>
          <span>谱面信息</span>
        </button>
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
      
      {/* 主编辑区域 */}
      <div className="pt-16 pb-32 px-4 flex flex-col h-screen">
      {/* 3D场景 */}
      <div className="flex-1 cyber-panel overflow-hidden">
        <Canvas shadows camera={{ position: [0, 1, 2], fov: 75 }}>
          <EditorScene 
            beats={beats}
            currentTime={currentTime * 1000} // 转换为毫秒
            selectedIndices={selectedIndices}
            currentTool={currentTool}
            isSelecting={isSelecting}
            onAddBeat={handleAddBeat}
            onSelectBeat={handleSelectBeat}
            onDeleteBeat={handleDeleteBeat}
            onUpdateBeatPosition={handleUpdateBeatPosition}
            onDragEnd={handleDragEnd}
            onStartBoxSelection={startBoxSelection}
            onUpdateBoxSelection={updateBoxSelection}
            onEndBoxSelection={(camera, addToSelection) => endBoxSelection(beats, camera, addToSelection)}
            getSelectionBox={getSelectionBox}
            snapToGrid={snapToGrid}
            showGrid={showGrid}
          />
        </Canvas>
      </div>
        
        {/* 波形和时间线 */}
        <div className="h-32 mt-4 cyber-panel p-2">
          <AudioWaveform 
            audioBuffer={audioBuffer}
            currentTime={currentTime}
            duration={duration}
            onSeek={handleSeek}
          />
        </div>
      </div>
      
      {/* 工具栏 */}
      <div className="absolute right-4 top-16 bottom-32 w-48">
        <EditorToolbar 
          isPlaying={isPlaying}
          onPlay={handlePlay}
          onPause={handlePause}
          onStop={handleStop}
          onSave={() => setShowBeatmapInfo(true)}
          onTest={handleTestBeatmap}
          currentTool={currentTool}
          setCurrentTool={setCurrentTool}
          currentColor={currentColor}
          setCurrentColor={setCurrentColor}
          currentSize={currentSize}
          setCurrentSize={setCurrentSize}
          snapToGrid={snapToGrid}
          setSnapToGrid={setSnapToGrid}
          showGrid={showGrid}
          setShowGrid={setShowGrid}
        />
      </div>
      
      {/* 谱面信息表单 */}
      {showBeatmapInfo && (
        <BeatmapInfoForm 
          beatmap={beatmap}
          onChange={handleBeatmapChange}
          onClose={() => setShowBeatmapInfo(false)}
          onSave={() => {
            handleSaveBeatmap();
            setShowBeatmapInfo(false);
          }}
        />
      )}
      
      {/* 底部状态栏 */}
      <div className="absolute bottom-0 left-0 right-0 h-8 bg-cyber-dark border-t border-gray-700 flex items-center px-4 text-sm">
        <div className="flex-1">
          当前时间: {currentTime.toFixed(2)}s / {duration.toFixed(2)}s
        </div>
        <div className="flex-1 text-center">
          节拍点: {beats.length}
        </div>
        <div className="flex-1 text-right">
          工具: {
            currentTool === 'add' ? '添加' : 
            currentTool === 'select' ? '选择' : 
            currentTool === 'delete' ? '删除' : ''
          }
        </div>
      </div>
    </div>
  );
};

export default EditorPage;
