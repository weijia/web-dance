import { useState, useCallback } from 'react';
import { BeatPoint } from '../pages/editor-page';

// 编辑器剪贴板钩子
export function useEditorClipboard() {
  // 剪贴板状态
  const [clipboard, setClipboard] = useState<BeatPoint[]>([]);
  
  // 复制节拍点
  const copyBeats = useCallback((beats: BeatPoint[], selectedIndices: number[]) => {
    // 获取选中的节拍点
    const selectedBeats = selectedIndices.map(index => beats[index]);
    
    // 如果有选中的节拍点，则复制到剪贴板
    if (selectedBeats.length > 0) {
      // 深拷贝节拍点数据
      const copiedBeats = JSON.parse(JSON.stringify(selectedBeats));
      
      // 保存到剪贴板
      setClipboard(copiedBeats);
      
      return true;
    }
    
    return false;
  }, []);
  
  // 粘贴节拍点
  const pasteBeats = useCallback((currentTime: number, timeOffset: number = 0) => {
    // 如果剪贴板为空，则返回空数组
    if (clipboard.length === 0) {
      return [];
    }
    
    // 计算时间偏移
    const firstBeatTime = Math.min(...clipboard.map(beat => beat.time));
    const timeAdjustment = currentTime - firstBeatTime + timeOffset;
    
    // 创建新的节拍点，调整时间
    const pastedBeats = clipboard.map(beat => ({
      ...beat,
      time: beat.time + timeAdjustment
    }));
    
    return pastedBeats;
  }, [clipboard]);
  
  // 剪切节拍点
  const cutBeats = useCallback((beats: BeatPoint[], selectedIndices: number[]) => {
    // 先复制选中的节拍点
    const copied = copyBeats(beats, selectedIndices);
    
    // 如果复制成功，则返回删除这些节拍点后的数组
    if (copied) {
      // 创建一个新数组，排除选中的索引
      const remainingBeats = beats.filter((_, index) => !selectedIndices.includes(index));
      return remainingBeats;
    }
    
    return beats;
  }, [copyBeats]);
  
  // 检查剪贴板是否为空
  const hasClipboardContent = clipboard.length > 0;
  
  return {
    copyBeats,
    pasteBeats,
    cutBeats,
    hasClipboardContent,
    clipboardSize: clipboard.length
  };
}