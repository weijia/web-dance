import React, { useRef, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Text, Sparkles, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { gsap } from 'gsap';

// 导入系统
import { BeatPoint } from '../systems/rhythm-engine';
import { gameManager, JudgementResult } from '../systems/game-manager';
import { effectsManager } from '../systems/effects-manager';

// 游戏场景属性
interface GameSceneProps {
  beatMap: BeatPoint[];
  handPosition: THREE.Vector3 | null;
  isPaused: boolean;
  onScoreUpdate?: (score: number, combo: number, accuracy: number) => void;
  onJudgement?: (result: JudgementResult, position: THREE.Vector3) => void;
}

// 目标点组件
const TargetSphere: React.FC<{
  beat: BeatPoint;
  gameTime: number;
  onHit?: () => void;
}> = ({ beat, gameTime, onHit }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const [hit, setHit] = useState(false);
  
  // 计算目标点的缩放和透明度（基于时间差）
  const calculateScale = () => {
    // 目标点出现时间窗口：提前1000ms出现，持续到判定时间后500ms
    const appearTime = beat.time - 1000;
    const disappearTime = beat.time + 500;
    const totalDuration = disappearTime - appearTime;
    
    // 计算当前进度
    const progress = Math.max(0, Math.min(1, (gameTime - appearTime) / totalDuration));
    
    // 缩放曲线：从0.5到1.2，然后回到0.8
    let scale = 0.5;
    if (progress < 0.5) {
      // 前半段：从0.5到1.2
      scale = 0.5 + progress * 1.4;
    } else {
      // 后半段：从1.2到0.8
      scale = 1.2 - (progress - 0.5) * 0.8;
    }
    
    // 透明度曲线：从0到1，然后回到0
    let opacity = 0;
    if (progress < 0.2) {
      // 淡入
      opacity = progress * 5;
    } else if (progress > 0.8) {
      // 淡出
      opacity = (1 - progress) * 5;
    } else {
      // 保持完全不透明
      opacity = 1;
    }
    
    return { scale, opacity };
  };
  
  // 处理命中效果
  useEffect(() => {
    if (hit && meshRef.current) {
      // 命中动画
      gsap.to(meshRef.current.scale, {
        x: 0.1,
        y: 0.1,
        z: 0.1,
        duration: 0.3,
        onComplete: () => {
          if (onHit) onHit();
        }
      });
      
      // 透明度动画
      if (meshRef.current.material instanceof THREE.Material) {
        gsap.to(meshRef.current.material, {
          opacity: 0,
          duration: 0.3
        });
      }
    }
  }, [hit, onHit]);
  
  // 悬停效果
  useEffect(() => {
    if (meshRef.current && !hit) {
      document.body.style.cursor = hovered ? 'pointer' : 'auto';
      
      if (hovered) {
        gsap.to(meshRef.current.scale, {
          x: 1.2,
          y: 1.2,
          z: 1.2,
          duration: 0.3
        });
      } else {
        // 恢复到基于时间的缩放
        const { scale } = calculateScale();
        gsap.to(meshRef.current.scale, {
          x: scale,
          y: scale,
          z: scale,
          duration: 0.3
        });
      }
    }
  }, [hovered, hit, gameTime]);
  
  // 脉动动画和时间相关的缩放
  useFrame(() => {
    if (meshRef.current && !hit) {
      // 获取基于时间的缩放和透明度
      const { scale, opacity } = calculateScale();
      
      // 应用缩放（如果没有悬停）
      if (!hovered) {
        meshRef.current.scale.set(scale, scale, scale);
      }
      
      // 应用透明度
      if (meshRef.current.material instanceof THREE.Material) {
        meshRef.current.material.opacity = opacity;
      }
      
      // 脉动旋转
      meshRef.current.rotation.x = Math.sin(gameTime * 0.002) * 0.2;
      meshRef.current.rotation.y = Math.sin(gameTime * 0.001) * 0.2;
    }
  });
  
  // 获取目标点颜色
  const color = beat.color || '#00f3ff';
  
  return (
    <mesh
      ref={meshRef}
      position={[beat.position.x, beat.position.y, beat.position.z]}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
      onClick={() => !hit && setHit(true)}
    >
      <sphereGeometry args={[beat.size || 0.3, 32, 32]} />
      <meshStandardMaterial 
        color={color} 
        emissive={color}
        emissiveIntensity={hovered ? 2 : 1}
        toneMapped={false}
        transparent
        opacity={1}
      />
      <Sparkles 
        count={10} 
        scale={0.5} 
        size={1.5} 
        speed={0.3} 
        color={color} 
      />
    </mesh>
  );
};

// 手部指示器组件
const HandIndicator: React.FC<{ position: THREE.Vector3 }> = ({ position }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const trailRef = useRef<THREE.Vector3[]>([]);
  const maxTrailLength = 10;
  
  useFrame(() => {
    if (meshRef.current) {
      // 平滑过渡到新位置
      meshRef.current.position.lerp(position, 0.3);
      
      // 更新轨迹
      trailRef.current.unshift(meshRef.current.position.clone());
      if (trailRef.current.length > maxTrailLength) {
        trailRef.current.pop();
      }
    }
  });
  
  return (
    <>
      {/* 手部指示器 */}
      <mesh ref={meshRef} position={position}>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshBasicMaterial color="#ff00ff" transparent opacity={0.7} />
        <Sparkles count={20} scale={0.4} size={2} speed={0.3} color="#ff00ff" />
      </mesh>
      
      {/* 轨迹 */}
      {trailRef.current.map((pos, index) => (
        <mesh 
          key={`trail-${index}`} 
          position={pos}
          scale={[0.08 * (1 - index / maxTrailLength), 0.08 * (1 - index / maxTrailLength), 0.08 * (1 - index / maxTrailLength)]}
        >
          <sphereGeometry args={[1, 8, 8]} />
          <meshBasicMaterial 
            color="#ff00ff" 
            transparent 
            opacity={0.5 * (1 - index / maxTrailLength)} 
          />
        </mesh>
      ))}
    </>
  );
};

// 判定效果组件
const JudgementEffect: React.FC<{
  result: JudgementResult;
  position: THREE.Vector3;
  onComplete: () => void;
}> = ({ result, position, onComplete }) => {
  const textRef = useRef<any>(null);
  
  useEffect(() => {
    if (textRef.current) {
      // 初始状态
      textRef.current.scale.set(0.5, 0.5, 0.5);
      textRef.current.material.opacity = 1;
      
      // 动画
      gsap.to(textRef.current.scale, {
        x: 2,
        y: 2,
        z: 2,
        duration: 0.5,
        ease: 'back.out'
      });
      
      gsap.to(textRef.current.material, {
        opacity: 0,
        duration: 0.8,
        delay: 0.2,
        onComplete
      });
      
      // 上升动画
      gsap.to(textRef.current.position, {
        y: position.y + 1,
        duration: 1,
        ease: 'power1.out'
      });
    }
  }, []);
  
  // 根据判定结果设置颜色和文本
  let color = '#ffffff';
  let text = '';
  
  switch (result) {
    case 'perfect':
      color = '#00ff9f';
      text = '完美!';
      break;
    case 'good':
      color = '#00f3ff';
      text = '不错!';
      break;
    case 'miss':
      color = '#ff0055';
      text = '错过!';
      break;
    default:
      return null;
  }
  
  return (
    <Text
      ref={textRef}
      position={position}
      color={color}
      fontSize={0.2}
      font="/fonts/Orbitron-Bold.ttf"
      anchorX="center"
      anchorY="middle"
      material-transparent={true}
    >
      {text}
    </Text>
  );
};

// 背景网格组件
const BackgroundGrid: React.FC = () => {
  const { scene } = useThree();
  
  useEffect(() => {
    // 创建网格材质
    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        color1: { value: new THREE.Color('#000000') },
        color2: { value: new THREE.Color('#00f3ff') }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3 color1;
        uniform vec3 color2;
        varying vec2 vUv;
        
        float grid(vec2 uv, float size) {
          vec2 grid = fract(uv * size);
          return (step(0.95, grid.x) + step(0.95, grid.y)) * 0.5;
        }
        
        void main() {
          // 基础网格
          float baseGrid = grid(vUv, 20.0);
          
          // 动态波纹
          float dist = length(vUv - 0.5);
          float wave = sin(dist * 10.0 - time * 0.5) * 0.5 + 0.5;
          
          // 混合颜色
          vec3 color = mix(color1, color2, baseGrid * wave * 0.8);
          
          // 边缘发光
          float edge = max(
            smoothstep(0.0, 0.05, vUv.x) * smoothstep(1.0, 0.95, vUv.x),
            smoothstep(0.0, 0.05, vUv.y) * smoothstep(1.0, 0.95, vUv.y)
          );
          
          color = mix(color, color2, edge * 0.5);
          
          gl_FragColor = vec4(color, baseGrid * 0.4 + edge * 0.2);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide
    });
    
    // 动画更新
    const animate = () => {
      if (material.uniforms.time) {
        material.uniforms.time.value += 0.01;
      }
      requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      material.dispose();
    };
  }, [scene]);
  
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]} receiveShadow>
      <planeGeometry args={[100, 100, 32, 32]} />
      <shaderMaterial
        uniforms={{
          time: { value: 0 },
          color1: { value: new THREE.Color('#000000') },
          color2: { value: new THREE.Color('#00f3ff') }
        }}
        vertexShader={`
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          uniform float time;
          uniform vec3 color1;
          uniform vec3 color2;
          varying vec2 vUv;
          
          float grid(vec2 uv, float size) {
            vec2 grid = fract(uv * size);
            return (step(0.95, grid.x) + step(0.95, grid.y)) * 0.5;
          }
          
          void main() {
            // 基础网格
            float baseGrid = grid(vUv, 20.0);
            
            // 动态波纹
            float dist = length(vUv - 0.5);
            float wave = sin(dist * 10.0 - time * 0.5) * 0.5 + 0.5;
            
            // 混合颜色
            vec3 color = mix(color1, color2, baseGrid * wave * 0.8);
            
            // 边缘发光
            float edge = max(
              smoothstep(0.0, 0.05, vUv.x) * smoothstep(1.0, 0.95, vUv.x),
              smoothstep(0.0, 0.05, vUv.y) * smoothstep(1.0, 0.95, vUv.y)
            );
            
            color = mix(color, color2, edge * 0.5);
            
            gl_FragColor = vec4(color, baseGrid * 0.4 + edge * 0.2);
          }
        `}
        transparent={true}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
};

// 游戏场景组件
export const GameScene: React.FC<GameSceneProps> = ({ 
  beatMap, 
  handPosition,
  isPaused,
  onScoreUpdate,
  onJudgement
}) => {
  const { scene } = useThree();
  const [gameTime, setGameTime] = useState(0);
  const [judgementEffects, setJudgementEffects] = useState<{
    id: string;
    result: JudgementResult;
    position: THREE.Vector3;
  }[]>([]);
  const lastTimeRef = useRef(0);
  
  // 初始化游戏管理器
  useEffect(() => {
    // 初始化游戏管理器
    gameManager.initialize(scene, {
      difficulty: 'normal',
      visualEffects: 'medium',
      judgementVisibility: true
    }, {
      onScoreUpdate: (stats) => {
        if (onScoreUpdate) {
          onScoreUpdate(stats.score, stats.combo, stats.accuracy);
        }
      },
      onJudgement: (result, position) => {
        if (result) {
          // 添加判定效果
          setJudgementEffects(prev => [
            ...prev,
            {
              id: `judgement-${Date.now()}-${Math.random()}`,
              result,
              position
            }
          ]);
          
          // 调用回调
          if (onJudgement) {
            onJudgement(result, position);
          }
        }
      }
    });
    
    // 加载谱面
    if (beatMap.length > 0) {
      gameManager.loadBeatMap({
        songId: 'current-song',
        bpm: 120,
        offset: 0,
        beats: beatMap,
        difficulty: 'normal'
      });
    }
    
    // 初始化特效管理器
    effectsManager.initialize(scene);
    
    return () => {
      // 清理资源
      gameManager.dispose();
      effectsManager.dispose();
    };
  }, [scene]);
  
  // 游戏时间更新
  useFrame((state) => {
    if (isPaused) return;
    
    const deltaTime = state.clock.getElapsedTime() - lastTimeRef.current;
    lastTimeRef.current = state.clock.getElapsedTime();
    
    // 更新游戏时间
    setGameTime(prev => prev + deltaTime * 1000); // 转换为毫秒
    
    // 更新游戏管理器
    gameManager.update();
  });
  
  // 暂停/恢复游戏
  useEffect(() => {
    if (isPaused) {
      gameManager.pauseGame();
    } else {
      if (gameManager.getState() === 'paused') {
        gameManager.resumeGame();
      }
    }
  }, [isPaused]);
  
  // 检测手部与目标的碰撞
  useEffect(() => {
    // 手部位置更新时，更新到动作追踪系统
    // 实际项目中，这部分会由动作追踪系统自己处理
    if (handPosition && !isPaused) {
      // 这里只是模拟，实际项目中不需要这样做
    }
  }, [handPosition, isPaused]);
  
  // 移除过期的判定效果
  const removeJudgementEffect = (id: string) => {
    setJudgementEffects(prev => prev.filter(effect => effect.id !== id));
  };
  
  return (
    <>
      {/* 环境 */}
      <fog attach="fog" args={['#000', 5, 15]} />
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} castShadow />
      <pointLight position={[0, 2, 0]} intensity={0.5} color="#ff00ff" />
      
      {/* 背景 */}
      <BackgroundGrid />
      
      {/* 活跃目标点 */}
      {gameManager.getActiveBeats().map((beat, index) => (
        <TargetSphere 
          key={`target-${beat.time}-${index}`}
          beat={beat}
          gameTime={gameTime}
          onHit={() => {
            // 实际的命中处理由游戏管理器负责
          }}
        />
      ))}
      
      {/* 手部指示器 */}
      {handPosition && (
        <HandIndicator position={handPosition} />
      )}
      
      {/* 判定效果 */}
      {judgementEffects.map(effect => (
        <JudgementEffect
          key={effect.id}
          result={effect.result}
          position={effect.position}
          onComplete={() => removeJudgementEffect(effect.id)}
        />
      ))}
      
      {/* 游戏暂停提示 */}
      {isPaused && (
        <Text
          position={[0, 0, -2]}
          color="#ff00ff"
          fontSize={0.5}
          font="/fonts/Orbitron-Bold.ttf"
          anchorX="center"
          anchorY="middle"
        >
          已暂停
        </Text>
      )}
    </>
  );
};