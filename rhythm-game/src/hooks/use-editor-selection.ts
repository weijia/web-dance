import { useState, useCallback } from 'react';
import { BeatPoint } from '../pages/editor-page';
import * as THREE from 'three';

// 编辑器选择钩子
export function useEditorSelection() {
  // 选择状态
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<THREE.Vector2 | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<THREE.Vector2 | null>(null);
  
  // 选择单个节拍点
  const selectBeat = useCallback((index: number, addToSelection: boolean = false) => {
    setSelectedIndices(prev => {
      // 如果已经选中，并且是添加模式，则取消选择
      if (prev.includes(index) && addToSelection) {
        return prev.filter(i => i !== index);
      }
      
      // 如果是添加模式，则添加到现有选择
      if (addToSelection) {
        return [...prev, index];
      }
      
      // 否则，只选择当前节拍点
      return [index];
    });
  }, []);
  
  // 选择多个节拍点
  const selectBeats = useCallback((indices: number[], addToSelection: boolean = false) => {
    setSelectedIndices(prev => {
      if (addToSelection) {
        // 合并现有选择和新选择，去重
        const combined = [...prev, ...indices];
        return [...new Set(combined)];
      }
      return [...indices];
    });
  }, []);
  
  // 取消选择所有节拍点
  const clearSelection = useCallback(() => {
    setSelectedIndices([]);
  }, []);
  
  // 开始框选
  const startBoxSelection = useCallback((position: THREE.Vector2) => {
    setIsSelecting(true);
    setSelectionStart(position.clone());
    setSelectionEnd(position.clone());
  }, []);
  
  // 更新框选
  const updateBoxSelection = useCallback((position: THREE.Vector2) => {
    if (isSelecting) {
      setSelectionEnd(position.clone());
    }
  }, [isSelecting]);
  
  // 结束框选
  const endBoxSelection = useCallback((beats: BeatPoint[], camera: THREE.Camera, addToSelection: boolean = false) => {
    if (!isSelecting || !selectionStart || !selectionEnd) {
      setIsSelecting(false);
      return;
    }
    
    // 计算选择框
    const minX = Math.min(selectionStart.x, selectionEnd.x);
    const maxX = Math.max(selectionStart.x, selectionEnd.x);
    const minY = Math.min(selectionStart.y, selectionEnd.y);
    const maxY = Math.max(selectionStart.y, selectionEnd.y);
    
    // 找出在选择框内的节拍点
    const selectedBeats: number[] = [];
    
    beats.forEach((beat, index) => {
      // 将3D位置转换为屏幕坐标
      const position = new THREE.Vector3(beat.position.x, beat.position.y, beat.position.z);
      const screenPosition = position.clone().project(camera);
      
      // 检查是否在选择框内
      if (
        screenPosition.x >= minX && 
        screenPosition.x <= maxX && 
        screenPosition.y >= minY && 
        screenPosition.y <= maxY
      ) {
        selectedBeats.push(index);
      }
    });
    
    // 更新选择
    selectBeats(selectedBeats, addToSelection);
    
    // 重置框选状态
    setIsSelecting(false);
    setSelectionStart(null);
    setSelectionEnd(null);
  }, [isSelecting, selectionStart, selectionEnd, selectBeats]);
  
  // 获取选择框
  const getSelectionBox = useCallback(() => {
    if (!isSelecting || !selectionStart || !selectionEnd) {
      return null;
    }
    
    return {
      start: selectionStart,
      end: selectionEnd,
      width: Math.abs(selectionEnd.x - selectionStart.x),
      height: Math.abs(selectionEnd.y - selectionStart.y),
      left: Math.min(selectionStart.x, selectionEnd.x),
      top: Math.min(selectionStart.y, selectionEnd.y)
    };
  }, [isSelecting, selectionStart, selectionEnd]);
  
  return {
    selectedIndices,
    isSelecting,
    selectBeat,
    selectBeats,
    clearSelection,
    startBoxSelection,
    updateBoxSelection,
    endBoxSelection,
    getSelectionBox
  };
}