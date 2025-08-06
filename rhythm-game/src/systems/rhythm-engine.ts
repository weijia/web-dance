import * as THREE from 'three';

// 节拍点类型
export interface BeatPoint {
  time: number;      // 时间点（毫秒）
  position: {        // 3D空间位置
    x: number;
    y: number;
    z: number;
  };
  type?: string;     // 节拍点类型（普通、长按、滑动等）
  duration?: number; // 持续时间（对于长按类型）
  color?: string;    // 颜色
  size?: number;     // 大小
}

// 谱面类型
export interface BeatMap {
  songId: string;
  bpm: number;
  offset: number;    // 开始偏移（毫秒）
  beats: BeatPoint[];
  difficulty: 'easy' | 'normal' | 'hard';
}

// 难度配置
interface DifficultyConfig {
  beatDensity: number;    // 节拍密度（每小节的节拍数）
  positionVariance: number; // 位置变化程度（0-1）
  specialBeatRatio: number; // 特殊节拍比例（0-1）
  speedMultiplier: number;  // 速度倍率
}

// 难度预设
const DIFFICULTY_PRESETS: Record<string, DifficultyConfig> = {
  easy: {
    beatDensity: 2,       // 每小节2拍
    positionVariance: 0.3, // 较小的位置变化
    specialBeatRatio: 0.1, // 10%的特殊节拍
    speedMultiplier: 0.8   // 较慢的速度
  },
  normal: {
    beatDensity: 4,       // 每小节4拍
    positionVariance: 0.6, // 中等的位置变化
    specialBeatRatio: 0.2, // 20%的特殊节拍
    speedMultiplier: 1.0   // 标准速度
  },
  hard: {
    beatDensity: 8,       // 每小节8拍
    positionVariance: 0.9, // 较大的位置变化
    specialBeatRatio: 0.3, // 30%的特殊节拍
    speedMultiplier: 1.2   // 较快的速度
  }
};

// 位置模式生成器
type PositionPattern = (index: number, total: number) => THREE.Vector3;

// 预定义的位置模式
const POSITION_PATTERNS: Record<string, PositionPattern> = {
  // 水平线
  horizontal: (index, total) => {
    const x = (index / (total - 1)) * 4 - 2; // -2 到 2
    return new THREE.Vector3(x, 0, -3);
  },
  
  // 垂直线
  vertical: (index, total) => {
    const y = (index / (total - 1)) * 2 - 0.5; // -0.5 到 1.5
    return new THREE.Vector3(0, y, -3);
  },
  
  // 圆形
  circle: (index, total) => {
    const angle = (index / total) * Math.PI * 2;
    const radius = 1.5;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    return new THREE.Vector3(x, y, -3);
  },
  
  // Z字形
  zigzag: (index, total) => {
    const segment = Math.floor(index / 2);
    const isEven = index % 2 === 0;
    const x = (segment / Math.floor(total / 2)) * 4 - 2;
    const y = isEven ? 1 : -0.5;
    return new THREE.Vector3(x, y, -3);
  },
  
  // 随机位置
  random: () => {
    const x = (Math.random() * 4) - 2;     // -2 到 2
    const y = (Math.random() * 2) - 0.5;   // -0.5 到 1.5
    const z = -3 - (Math.random() * 2);    // -3 到 -5
    return new THREE.Vector3(x, y, z);
  }
};

/**
 * 根据BPM生成节拍点
 * @param bpm 每分钟节拍数
 * @param duration 持续时间（毫秒）
 * @param offset 开始偏移（毫秒）
 * @param difficulty 难度级别
 * @returns 节拍点数组
 */
export function generateBeatsFromBPM(
  bpm: number,
  duration: number,
  offset: number = 0,
  difficulty: 'easy' | 'normal' | 'hard' = 'normal'
): BeatPoint[] {
  const config = DIFFICULTY_PRESETS[difficulty];
  const beatInterval = 60000 / bpm; // 每拍间隔（毫秒）
  const totalBeats = Math.floor(duration / beatInterval);
  const beats: BeatPoint[] = [];
  
  // 选择位置模式
  const patternKeys = Object.keys(POSITION_PATTERNS);
  const selectedPatterns = [
    patternKeys[Math.floor(Math.random() * patternKeys.length)],
    patternKeys[Math.floor(Math.random() * patternKeys.length)]
  ];
  
  // 生成节拍点
  for (let i = 0; i < totalBeats; i++) {
    // 根据难度控制节拍密度
    if (i % Math.floor(4 / config.beatDensity) !== 0) continue;
    
    // 计算时间点
    const time = offset + i * beatInterval;
    
    // 选择位置模式
    const patternIndex = Math.floor(i / 16) % selectedPatterns.length;
    const pattern = POSITION_PATTERNS[selectedPatterns[patternIndex]];
    
    // 生成位置
    const basePosition = pattern(i % 16, 16);
    
    // 添加随机变化
    const variance = config.positionVariance;
    const position = {
      x: basePosition.x + (Math.random() - 0.5) * variance,
      y: basePosition.y + (Math.random() - 0.5) * variance,
      z: basePosition.z
    };
    
    // 确定节拍点类型
    const isSpecialBeat = Math.random() < config.specialBeatRatio;
    const type = isSpecialBeat ? 
      (Math.random() > 0.5 ? 'hold' : 'slide') : 
      'normal';
    
    // 确定颜色
    const colors = ['#00f3ff', '#ff00ff', '#00ff9f', '#ffff00'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    
    // 添加节拍点
    beats.push({
      time,
      position,
      type,
      color,
      size: isSpecialBeat ? 0.4 : 0.3,
      duration: type === 'hold' ? beatInterval * 2 : undefined
    });
  }
  
  return beats;
}

/**
 * 根据音频分析生成节拍点
 * 注意：这个函数需要Web Audio API支持
 * @param audioUrl 音频URL
 * @param duration 持续时间（毫秒）
 * @param difficulty 难度级别
 * @returns Promise<BeatPoint[]>
 */
export async function generateBeatsFromAudio(
  audioUrl: string,
  difficulty: 'easy' | 'normal' | 'hard' = 'normal'
): Promise<BeatPoint[]> {
  return new Promise((resolve, reject) => {
    // 创建音频上下文
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // 加载音频
    fetch(audioUrl)
      .then(response => response.arrayBuffer())
      .then(arrayBuffer => audioContext.decodeAudioData(arrayBuffer))
      .then(audioBuffer => {
        // 获取音频数据
        const channelData = audioBuffer.getChannelData(0);
        const sampleRate = audioBuffer.sampleRate;
        const duration = audioBuffer.duration * 1000; // 转换为毫秒
        
        // 分析音频能量
        const energyMap = analyzeAudioEnergy(channelData, sampleRate);
        
        // 检测峰值（节拍点）
        const peaks = detectPeaks(energyMap, DIFFICULTY_PRESETS[difficulty]);
        
        // 转换为节拍点
        const beats = peaks.map(peak => {
          // 生成随机位置
          const position = POSITION_PATTERNS.random();
          
          return {
            time: peak.time,
            position: {
              x: position.x,
              y: position.y,
              z: position.z
            },
            type: 'normal',
            color: '#00f3ff',
            size: 0.3
          };
        });
        
        resolve(beats);
      })
      .catch(error => {
        console.error('音频分析失败:', error);
        reject(error);
      });
  });
}

// 分析音频能量
function analyzeAudioEnergy(channelData: Float32Array, sampleRate: number) {
  const energyMap: { time: number, energy: number }[] = [];
  const frameSize = 1024;
  const hopSize = 512;
  
  for (let i = 0; i < channelData.length - frameSize; i += hopSize) {
    let energy = 0;
    
    // 计算帧能量
    for (let j = 0; j < frameSize; j++) {
      energy += channelData[i + j] * channelData[i + j];
    }
    
    // 归一化能量
    energy = energy / frameSize;
    
    // 记录时间点和能量
    const time = (i / sampleRate) * 1000; // 转换为毫秒
    energyMap.push({ time, energy });
  }
  
  return energyMap;
}

// 检测峰值
function detectPeaks(
  energyMap: { time: number, energy: number }[],
  config: DifficultyConfig
) {
  const peaks: { time: number, energy: number }[] = [];
  const windowSize = 10;
  const threshold = 0.01;
  
  for (let i = windowSize; i < energyMap.length - windowSize; i++) {
    const current = energyMap[i];
    
    // 检查是否是局部最大值
    let isPeak = true;
    for (let j = i - windowSize; j < i + windowSize; j++) {
      if (j !== i && energyMap[j].energy > current.energy) {
        isPeak = false;
        break;
      }
    }
    
    // 检查是否超过阈值
    if (isPeak && current.energy > threshold) {
      peaks.push(current);
    }
  }
  
  // 根据难度过滤峰值
  const filteredPeaks = peaks.filter((_, index) => {
    return index % Math.floor(4 / config.beatDensity) === 0;
  });
  
  return filteredPeaks;
}

/**
 * 创建预设谱面
 * @param songId 歌曲ID
 * @param bpm BPM
 * @param duration 持续时间（毫秒）
 * @param difficulty 难度
 * @returns BeatMap
 */
export function createPresetBeatMap(
  songId: string,
  bpm: number,
  duration: number,
  difficulty: 'easy' | 'normal' | 'hard' = 'normal'
): BeatMap {
  return {
    songId,
    bpm,
    offset: 0,
    beats: generateBeatsFromBPM(bpm, duration, 0, difficulty),
    difficulty
  };
}

// 预设谱面数据
export const PRESET_BEATMAPS: Record<string, BeatMap> = {
  song1: createPresetBeatMap('song1', 128, 60000, 'normal'),
  song2: createPresetBeatMap('song2', 140, 60000, 'normal'),
  song3: createPresetBeatMap('song3', 110, 60000, 'normal')
};