import React, { useRef, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Text, Grid } from '@react-three/drei';
import * as THREE from 'three';
import { BeatPoint } from '../pages/editor-page';

// 编辑器场景属性
interface EditorSceneProps {
  beats: BeatPoint[];
  currentTime: number;
  selectedIndices: number[];
  currentTool: string;
  isSelecting: boolean;
  onAddBeat: (position: { x: number, y: number, z: number }) => void;
  onSelectBeat: (index: number, addToSelection?: boolean) => void;
  onDeleteBeat: (index: number) => void;
  onUpdateBeatPosition: (index: number, position: { x: number, y: number, z: number }) => void;
  onDragEnd: () => void;
  onStartBoxSelection: (position: THREE.Vector2) => void;
  onUpdateBoxSelection: (position: THREE.Vector2) => void;
  onEndBoxSelection: (camera: THREE.Camera, addToSelection?: boolean) => void;
  getSelectionBox: () => any;
  snapToGrid: boolean;
  showGrid: boolean;
}

// 编辑器目标点组件
const EditorBeat: React.FC<{
  beat: BeatPoint;
  index: number;
  isSelected: boolean;
  isActive: boolean;
  currentTool: string;
  onSelect: (addToSelection?: boolean) => void;
  onDelete: () => void;
  onUpdatePosition: (position: { x: number, y: number, z: number }) => void;
  onDragEnd: () => void;
  snapToGrid: boolean;
}> = ({
  beat,
  index,
  isSelected,
  isActive,
  currentTool,
  onSelect,
  onDelete,
  onUpdatePosition,
  onDragEnd,
  snapToGrid
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const [isDragging, setIsDragging] = useState(false);
  const { camera, raycaster, mouse, scene } = useThree();
  const dragPlane = useRef<THREE.Plane>(new THREE.Plane(new THREE.Vector3(0, 0, 1), -5));
  const dragOffset = useRef<THREE.Vector3>(new THREE.Vector3());
  const dragStart = useRef<THREE.Vector3>(new THREE.Vector3());
  
  // 处理点击事件
  const handleClick = (e: any) => {
    e.stopPropagation();
    
    if (currentTool === 'select') {
      onSelect();
    } else if (currentTool === 'delete') {
      onDelete();
    }
  };
  
  // 处理拖动开始
  const handlePointerDown = (e: any) => {
    if (currentTool !== 'select' || !isSelected) return;
    
    e.stopPropagation();
    setIsDragging(true);
    
    if (meshRef.current) {
      // 记录拖动起始位置
      dragStart.current.copy(meshRef.current.position);
      
      // 计算鼠标与物体的偏移量
      const intersection = new THREE.Vector3();
      raycaster.setFromCamera(mouse, camera);
      raycaster.ray.intersectPlane(dragPlane.current, intersection);
      dragOffset.current.copy(intersection).sub(meshRef.current.position);
    }
    
    // 捕获指针
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  
  // 处理拖动移动
  const handlePointerMove = (e: any) => {
    if (!isDragging) return;
    
    e.stopPropagation();
    
    // 计算新位置
    const intersection = new THREE.Vector3();
    raycaster.setFromCamera(mouse, camera);
    raycaster.ray.intersectPlane(dragPlane.current, intersection);
    
    // 应用偏移量
    const newPosition = intersection.sub(dragOffset.current);
    
    // 吸附到网格
    if (snapToGrid) {
      newPosition.x = Math.round(newPosition.x * 2) / 2; // 吸附到0.5的倍数
      newPosition.y = Math.round(newPosition.y * 2) / 2;
    }
    
    // 限制范围
    newPosition.x = Math.max(-5, Math.min(5, newPosition.x));
    newPosition.y = Math.max(0, Math.min(5, newPosition.y));
    newPosition.z = -5; // 固定Z坐标
    
    // 更新位置
    if (meshRef.current) {
      meshRef.current.position.copy(newPosition);
    }
  };
  
  // 处理拖动结束
  const handlePointerUp = (e: any) => {
    if (!isDragging) return;
    
    e.stopPropagation();
    setIsDragging(false);
    
    // 释放指针
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    
    // 如果位置有变化，通知更新
    if (meshRef.current && !meshRef.current.position.equals(dragStart.current)) {
      onUpdatePosition({
        x: meshRef.current.position.x,
        y: meshRef.current.position.y,
        z: meshRef.current.position.z
      });
      
      // 通知拖动结束
      onDragEnd();
    }
  };
  
  // 获取目标点颜色
  const color = beat.color || '#00f3ff';
  
  return (
    <mesh
      ref={meshRef}
      position={[beat.position.x, beat.position.y, beat.position.z]}
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <sphereGeometry args={[beat.size || 0.3, 32, 32]} />
      <meshStandardMaterial 
        color={color} 
        emissive={color}
        emissiveIntensity={isSelected ? 2 : isActive ? 1.5 : 1}
        toneMapped={false}
        transparent
        opacity={isActive ? 1 : 0.7}
        wireframe={isDragging}
      />
      
      {/* 选中状态指示器 */}
      {isSelected && (
        <mesh position={[0, 0, 0]}>
          <ringGeometry args={[beat.size! * 1.2, beat.size! * 1.3, 32]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.5} side={THREE.DoubleSide} />
        </mesh>
      )}
      
      {/* 时间标签 */}
      <Text
        position={[0, beat.size! * 1.5, 0]}
        color="#ffffff"
        fontSize={0.15}
        anchorX="center"
        anchorY="bottom"
      >
        {(beat.time / 1000).toFixed(2)}s
      </Text>
    </mesh>
  );
};

// 时间指示器组件
const TimeIndicator: React.FC<{
  currentTime: number;
}> = ({ currentTime }) => {
  return (
    <mesh position={[0, 0, -5]}>
      <planeGeometry args={[10, 10]} />
      <meshBasicMaterial color="#ff00ff" transparent opacity={0.1} side={THREE.DoubleSide} />
      
      <Text
        position={[0, 2.5, 0.1]}
        color="#ff00ff"
        fontSize={0.2}
        anchorX="center"
        anchorY="bottom"
      >
        {(currentTime / 1000).toFixed(2)}s
      </Text>
      
      {/* 垂直线 */}
      <mesh position={[0, 0, 0.1]}>
        <planeGeometry args={[0.05, 10]} />
        <meshBasicMaterial color="#ff00ff" transparent opacity={0.5} />
      </mesh>
      
      {/* 水平线 */}
      <mesh position={[0, 0, 0.1]}>
        <planeGeometry args={[10, 0.05]} />
        <meshBasicMaterial color="#ff00ff" transparent opacity={0.5} />
      </mesh>
    </mesh>
  );
};

// 选择框组件
const SelectionBox: React.FC<{
  selectionBox: any;
}> = ({ selectionBox }) => {
  if (!selectionBox) return null;
  
  // 将屏幕坐标转换为世界坐标
  const { left, top, width, height } = selectionBox;
  
  return (
    <mesh position={[0, 0, -4.9]}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial color="#00f3ff" transparent opacity={0.2} />
      <lineSegments>
        <edgesGeometry attach="geometry">
          <boxGeometry args={[width, height, 0.01]} />
        </edgesGeometry>
        <lineBasicMaterial attach="material" color="#00f3ff" />
      </lineSegments>
    </mesh>
  );
};

// 编辑器场景组件
export const EditorScene: React.FC<EditorSceneProps> = ({
  beats,
  currentTime,
  selectedIndices,
  currentTool,
  isSelecting,
  onAddBeat,
  onSelectBeat,
  onDeleteBeat,
  onUpdateBeatPosition,
  onDragEnd,
  onStartBoxSelection,
  onUpdateBoxSelection,
  onEndBoxSelection,
  getSelectionBox,
  snapToGrid,
  showGrid
}) => {
  const { scene, camera, raycaster, mouse, gl } = useThree();
  const planeRef = useRef<THREE.Mesh>(null);
  
  // 处理场景点击
  const handleSceneClick = (e: any) => {
    if (currentTool === 'add') {
      // 计算点击位置
      const intersection = new THREE.Vector3();
      raycaster.setFromCamera(mouse, camera);
      
      // 创建一个平面，用于计算交点
      const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 5);
      raycaster.ray.intersectPlane(plane, intersection);
      
      // 吸附到网格
      if (snapToGrid) {
        intersection.x = Math.round(intersection.x * 2) / 2; // 吸附到0.5的倍数
        intersection.y = Math.round(intersection.y * 2) / 2;
      }
      
      // 限制范围
      intersection.x = Math.max(-5, Math.min(5, intersection.x));
      intersection.y = Math.max(0, Math.min(5, intersection.y));
      intersection.z = -5; // 固定Z坐标
      
      // 添加节拍点
      onAddBeat({
        x: intersection.x,
        y: intersection.y,
        z: intersection.z
      });
    } else if (currentTool === 'select') {
      // 开始框选
      onStartBoxSelection(new THREE.Vector2(mouse.x, mouse.y));
    }
  };
  
  // 处理场景指针移动
  const handleScenePointerMove = (e: any) => {
    if (isSelecting) {
      onUpdateBoxSelection(new THREE.Vector2(mouse.x, mouse.y));
    }
  };
  
  // 处理场景指针抬起
  const handleScenePointerUp = (e: any) => {
    if (isSelecting) {
      onEndBoxSelection(camera, e.shiftKey);
    }
  };
  
  return (
    <>
      {/* 环境 */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} />
      
      {/* 网格 */}
      {showGrid && (
        <Grid
          position={[0, 0, -5]}
          args={[10, 10]}
          cellSize={snapToGrid ? 0.5 : 0.25}
          cellThickness={0.5}
          cellColor="#00f3ff"
          sectionSize={1}
          sectionThickness={1}
          sectionColor="#ff00ff"
          fadeDistance={30}
          fadeStrength={1}
        />
      )}
      
      {/* 背景平面 - 用于捕获点击事件 */}
      <mesh 
        ref={planeRef}
        position={[0, 0, -5.1]}
        onClick={handleSceneClick}
        onPointerMove={handleScenePointerMove}
        onPointerUp={handleScenePointerUp}
      >
        <planeGeometry args={[20, 20]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.01} />
      </mesh>
      
      {/* 时间指示器 */}
      <TimeIndicator currentTime={currentTime} />
      
      {/* 选择框 */}
      {isSelecting && <SelectionBox selectionBox={getSelectionBox()} />}
      
      {/* 节拍点 */}
      {beats.map((beat, index) => (
        <EditorBeat
          key={`beat-${index}`}
          beat={beat}
          index={index}
          isSelected={selectedIndices.includes(index)}
          isActive={Math.abs(beat.time - currentTime) < 500} // 当前时间前后500ms内的节拍点高亮
          currentTool={currentTool}
          onSelect={(addToSelection) => onSelectBeat(index, addToSelection)}
          onDelete={() => onDeleteBeat(index)}
          onUpdatePosition={(position) => onUpdateBeatPosition(index, position)}
          onDragEnd={onDragEnd}
          snapToGrid={snapToGrid}
        />
      ))}
      
      {/* 工具提示 */}
      <Text
        position={[-4.5, 2.5, -5]}
        color="#ffffff"
        fontSize={0.15}
        anchorX="left"
        anchorY="top"
      >
        {currentTool === 'add' ? '点击添加节拍点' : 
         currentTool === 'select' ? '点击选择节拍点，拖动移动，Shift+点击多选' : 
         currentTool === 'delete' ? '点击删除节拍点' : ''}
      </Text>
      
      {/* 多选提示 */}
      {selectedIndices.length > 1 && (
        <Text
          position={[-4.5, 2.2, -5]}
          color="#00f3ff"
          fontSize={0.15}
          anchorX="left"
          anchorY="top"
        >
          已选择 {selectedIndices.length} 个节拍点
        </Text>
      )}
    </>
  );
};