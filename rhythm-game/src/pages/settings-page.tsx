import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { storageSystem, GameSettings } from '../systems/storage-system';
import { audioSystem } from '../systems/audio-system';

const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<GameSettings>({
    playerName: '玩家',
    volume: 0.8,
    effectsVolume: 0.5,
    visualEffects: 'medium',
    handCalibration: null,
    lastPlayed: null
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  // 加载设置
  useEffect(() => {
    const loadSettings = async () => {
      try {
        // 确保存储系统已初始化
        await storageSystem.initialize();
        
        const savedSettings = await storageSystem.getSettings();
        if (savedSettings) {
          setSettings(savedSettings);
          
          // 应用音量设置
          audioSystem.setVolume(savedSettings.volume);
          audioSystem.setEffectsVolume(savedSettings.effectsVolume);
        }
        setIsLoading(false);
      } catch (error) {
        console.error('加载设置失败:', error);
        setIsLoading(false);
      }
    };
    
    loadSettings();
  }, []);
  
  // 保存设置
  const handleSave = async () => {
    console.log('开始保存设置...');
    setIsSaving(true);
    setSaveMessage('');
    
    try {
      // 确保存储系统已初始化
      console.log('正在初始化存储系统...');
      const initialized = await storageSystem.initialize();
      console.log('存储系统初始化状态:', initialized);
      
      // 保存设置
      console.log('正在保存设置:', settings);
      const settingId = await storageSystem.saveSettings(settings);
      console.log('设置已保存，ID:', settingId);
      
      // 应用音量设置
      console.log('应用音量设置...');
      audioSystem.setVolume(settings.volume);
      audioSystem.setEffectsVolume(settings.effectsVolume);
      
      setSaveMessage('设置已保存');
      console.log('设置已成功保存并应用');
      
      // 3秒后清除消息
      setTimeout(() => {
        setSaveMessage('');
      }, 3000);
    } catch (error) {
      console.error('保存设置失败:', error);
      setSaveMessage(`保存失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setIsSaving(false);
    }
  };
  
  // 重置设置
  const handleReset = () => {
    setSettings({
      playerName: '玩家',
      volume: 0.8,
      effectsVolume: 0.5,
      visualEffects: 'medium',
      handCalibration: null,
      lastPlayed: null
    });
  };
  
  // 清除所有数据
  const handleClearData = async () => {
    if (window.confirm('确定要清除所有游戏数据吗？这将删除所有分数记录、设置和自定义谱面。')) {
      try {
        await storageSystem.clearDatabase();
        setSaveMessage('所有数据已清除');
        handleReset();
      } catch (error) {
        console.error('清除数据失败:', error);
        setSaveMessage('清除数据失败，请重试');
      }
    }
  };
  
  // 处理输入变化
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    
    // 处理不同类型的输入
    if (type === 'range') {
      setSettings({
        ...settings,
        [name]: parseFloat(value)
      });
    } else {
      setSettings({
        ...settings,
        [name]: value
      });
    }
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cyber-black">
        <div className="text-neon-blue text-2xl animate-pulse">加载设置中...</div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full bg-cyber-black text-white p-4 md:p-8">
      {/* 背景网格 */}
      <div className="absolute inset-0 bg-cyber-grid opacity-20 z-0"></div>
      
      {/* 顶部导航 */}
      <motion.div 
        className="mb-8 flex justify-between items-center"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div 
          onClick={() => {
            console.log('返回按钮被点击');
            window.location.href = '/';
          }}
          className="text-neon-blue hover:text-white transition-colors cursor-pointer"
          style={{ zIndex: 100 }}
        >
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m12 19-7-7 7-7"/>
              <path d="M19 12H5"/>
            </svg>
            <span>返回</span>
          </div>
        </div>
        <h1 className="text-2xl font-bold neon-text-blue">游戏设置</h1>
        <div className="w-20"></div> {/* 占位，保持标题居中 */}
      </motion.div>
      
      {/* 设置表单 */}
      <div className="max-w-2xl mx-auto">
        <div className="cyber-panel mb-8">
          <h2 className="text-xl font-bold mb-4 neon-text-green">玩家设置</h2>
          
          <div className="mb-4">
            <label className="block mb-2">玩家名称</label>
            <input
              type="text"
              name="playerName"
              value={settings.playerName}
              onChange={handleInputChange}
              className="w-full bg-cyber-dark border border-neon-blue p-2 rounded focus:outline-none focus:ring-2 focus:ring-neon-blue"
              maxLength={20}
            />
          </div>
        </div>
        
        <div className="cyber-panel mb-8">
          <h2 className="text-xl font-bold mb-4 neon-text-green">音频设置</h2>
          
          <div className="mb-4">
            <label className="block mb-2">
              音乐音量: {Math.round(settings.volume * 100)}%
            </label>
            <input
              type="range"
              name="volume"
              min="0"
              max="1"
              step="0.01"
              value={settings.volume}
              onChange={handleInputChange}
              className="w-full"
            />
          </div>
          
          <div className="mb-4">
            <label className="block mb-2">
              音效音量: {Math.round(settings.effectsVolume * 100)}%
            </label>
            <input
              type="range"
              name="effectsVolume"
              min="0"
              max="1"
              step="0.01"
              value={settings.effectsVolume}
              onChange={handleInputChange}
              className="w-full"
            />
          </div>
        </div>
        
        <div className="cyber-panel mb-8">
          <h2 className="text-xl font-bold mb-4 neon-text-green">视觉设置</h2>
          
          <div className="mb-4">
            <label className="block mb-2">视觉效果</label>
            <select
              name="visualEffects"
              value={settings.visualEffects}
              onChange={handleInputChange}
              className="w-full bg-cyber-dark border border-neon-blue p-2 rounded focus:outline-none focus:ring-2 focus:ring-neon-blue"
            >
              <option value="low">低 (适合低性能设备)</option>
              <option value="medium">中 (推荐)</option>
              <option value="high">高 (需要高性能设备)</option>
            </select>
            <p className="text-sm text-gray-400 mt-1">
              {settings.visualEffects === 'low' && '减少粒子效果和光照，提高性能'}
              {settings.visualEffects === 'medium' && '平衡视觉效果和性能'}
              {settings.visualEffects === 'high' && '启用所有视觉效果，可能影响性能'}
            </p>
          </div>
        </div>
        
        <div className="cyber-panel mb-8">
          <h2 className="text-xl font-bold mb-4 neon-text-pink">数据管理</h2>
          
          <div className="mb-4">
            <button
              className="cyber-button bg-cyber-dark border-neon-pink hover:bg-neon-pink hover:shadow-neon-pink"
              onClick={handleClearData}
            >
              清除所有游戏数据
            </button>
            <p className="text-sm text-gray-400 mt-1">
              这将删除所有分数记录、设置和自定义谱面
            </p>
          </div>
        </div>
        
        {/* 保存按钮 */}
        <div className="flex justify-between items-center">
          <button
            className="cyber-button bg-cyber-dark border-neon-pink hover:bg-neon-pink hover:shadow-neon-pink"
            onClick={handleReset}
            type="button"
          >
            重置设置
          </button>
          
          <div className="flex items-center gap-4">
            {saveMessage && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={saveMessage.includes('失败') ? 'text-neon-pink' : 'text-neon-green'}
              >
                {saveMessage}
              </motion.div>
            )}
            
            <div 
              className="cyber-button bg-cyber-dark border-neon-blue hover:bg-neon-blue hover:text-cyber-black cursor-pointer p-4 text-center"
              onClick={() => {
                console.log('保存按钮被点击');
                handleSave();
              }}
              style={{ zIndex: 100 }}
            >
              {isSaving ? '保存中...' : '保存设置'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;