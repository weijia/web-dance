import { useState, useCallback } from 'react';
import { BeatPoint } from '../pages/editor-page';

// 历史记录类型
type HistoryState = {
  beats: BeatPoint[];
};

// 编辑器历史钩子
export function useEditorHistory(initialBeats: BeatPoint[] = []) {
  // 历史记录状态
  const [history, setHistory] = useState<HistoryState[]>([{ beats: initialBeats }]);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // 添加新的历史记录
  const addHistory = useCallback((beats: BeatPoint[]) => {
    // 如果当前不是最新状态，则删除后面的历史记录
    const newHistory = history.slice(0, currentIndex + 1);
    
    // 添加新的历史记录
    newHistory.push({ beats: JSON.parse(JSON.stringify(beats)) });
    
    // 更新历史记录和当前索引
    setHistory(newHistory);
    setCurrentIndex(newHistory.length - 1);
  }, [history, currentIndex]);
  
  // 撤销操作
  const undo = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      return history[currentIndex - 1].beats;
    }
    return history[currentIndex].beats;
  }, [history, currentIndex]);
  
  // 重做操作
  const redo = useCallback(() => {
    if (currentIndex < history.length - 1) {
      setCurrentIndex(currentIndex + 1);
      return history[currentIndex + 1].beats;
    }
    return history[currentIndex].beats;
  }, [history, currentIndex]);
  
  // 清空历史记录
  const clearHistory = useCallback(() => {
    setHistory([{ beats: [] }]);
    setCurrentIndex(0);
  }, []);
  
  // 获取当前状态
  const getCurrentState = useCallback(() => {
    return history[currentIndex].beats;
  }, [history, currentIndex]);
  
  // 检查是否可以撤销/重做
  const canUndo = currentIndex > 0;
  const canRedo = currentIndex < history.length - 1;
  
  return {
    addHistory,
    undo,
    redo,
    clearHistory,
    getCurrentState,
    canUndo,
    canRedo
  };
}