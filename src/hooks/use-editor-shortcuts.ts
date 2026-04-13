import { useEffect, useCallback } from 'react';

// 快捷键配置类型
interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: () => void;
  preventDefault?: boolean;
}

// 编辑器快捷键钩子
export function useEditorShortcuts(shortcuts: ShortcutConfig[]) {
  // 处理键盘事件
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // 检查是否匹配任何快捷键
    for (const shortcut of shortcuts) {
      const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
      const ctrlMatch = shortcut.ctrl ? event.ctrlKey : !event.ctrlKey;
      const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
      const altMatch = shortcut.alt ? event.altKey : !event.altKey;
      
      // 如果所有条件都匹配
      if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
        // 阻止默认行为（如果需要）
        if (shortcut.preventDefault !== false) {
          event.preventDefault();
        }
        
        // 执行操作
        shortcut.action();
        break;
      }
    }
  }, [shortcuts]);
  
  // 添加和移除事件监听器
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
}

// 预定义的快捷键配置
export const defaultShortcuts = {
  // 文件操作
  save: { key: 's', ctrl: true, shift: false, alt: false },
  new: { key: 'n', ctrl: true, shift: false, alt: false },
  
  // 编辑操作
  undo: { key: 'z', ctrl: true, shift: false, alt: false },
  redo: { key: 'y', ctrl: true, shift: false, alt: false },
  redoAlternative: { key: 'z', ctrl: true, shift: true, alt: false },
  delete: { key: 'Delete', ctrl: false, shift: false, alt: false },
  
  // 工具选择
  selectTool: { key: 'v', ctrl: false, shift: false, alt: false },
  addTool: { key: 'a', ctrl: false, shift: false, alt: false },
  deleteTool: { key: 'd', ctrl: false, shift: false, alt: false },
  
  // 播放控制
  play: { key: ' ', ctrl: false, shift: false, alt: false }, // 空格键
  stop: { key: 'Escape', ctrl: false, shift: false, alt: false },
  
  // 视图控制
  toggleGrid: { key: 'g', ctrl: false, shift: false, alt: false },
  toggleSnap: { key: 's', ctrl: false, shift: false, alt: false },
};