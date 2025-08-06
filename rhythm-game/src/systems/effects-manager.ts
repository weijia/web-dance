import * as THREE from 'three';
import { gsap } from 'gsap';

// 特效类型
export type EffectType = 'hit' | 'perfect' | 'miss' | 'combo' | 'background';

// 特效参数
export interface EffectParams {
  position?: THREE.Vector3;
  color?: string;
  scale?: number;
  duration?: number;
  intensity?: number;
}

// 特效管理器类
export class EffectsManager {
  private scene: THREE.Scene | null = null;
  private effectsPool: Map<EffectType, THREE.Object3D[]> = new Map();
  private activeEffects: Map<string, { object: THREE.Object3D, expireTime: number }> = new Map();
  private lastCleanupTime: number = 0;
  
  /**
   * 初始化特效管理器
   * @param scene Three.js场景
   */
  initialize(scene: THREE.Scene): void {
    this.scene = scene;
    this.preloadEffects();
  }
  
  /**
   * 预加载特效
   */
  private preloadEffects(): void {
    // 预创建一些常用特效对象，放入对象池
    this.createHitEffectPool(10);
    this.createPerfectEffectPool(5);
    this.createMissEffectPool(5);
    this.createComboEffectPool(3);
  }
  
  /**
   * 创建命中特效池
   * @param count 预创建数量
   */
  private createHitEffectPool(count: number): void {
    const hitEffects: THREE.Object3D[] = [];
    
    for (let i = 0; i < count; i++) {
      // 创建粒子系统
      const particles = new THREE.Group();
      
      // 添加20个小球作为粒子
      for (let j = 0; j < 20; j++) {
        const geometry = new THREE.SphereGeometry(0.05, 8, 8);
        const material = new THREE.MeshBasicMaterial({
          color: 0x00f3ff,
          transparent: true,
          opacity: 0.8
        });
        const particle = new THREE.Mesh(geometry, material);
        particles.add(particle);
      }
      
      // 隐藏并添加到池中
      particles.visible = false;
      hitEffects.push(particles);
    }
    
    this.effectsPool.set('hit', hitEffects);
  }
  
  /**
   * 创建完美命中特效池
   * @param count 预创建数量
   */
  private createPerfectEffectPool(count: number): void {
    const perfectEffects: THREE.Object3D[] = [];
    
    for (let i = 0; i < count; i++) {
      // 创建光环
      const geometry = new THREE.RingGeometry(0.3, 0.5, 32);
      const material = new THREE.MeshBasicMaterial({
        color: 0xff00ff,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide
      });
      const ring = new THREE.Mesh(geometry, material);
      
      // 隐藏并添加到池中
      ring.visible = false;
      perfectEffects.push(ring);
    }
    
    this.effectsPool.set('perfect', perfectEffects);
  }
  
  /**
   * 创建未命中特效池
   * @param count 预创建数量
   */
  private createMissEffectPool(count: number): void {
    const missEffects: THREE.Object3D[] = [];
    
    for (let i = 0; i < count; i++) {
      // 创建叉叉
      const group = new THREE.Group();
      
      // 创建两条线
      const geometry = new THREE.BoxGeometry(0.4, 0.05, 0.05);
      const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
      
      const line1 = new THREE.Mesh(geometry, material);
      line1.rotation.z = Math.PI / 4;
      group.add(line1);
      
      const line2 = new THREE.Mesh(geometry, material);
      line2.rotation.z = -Math.PI / 4;
      group.add(line2);
      
      // 隐藏并添加到池中
      group.visible = false;
      missEffects.push(group);
    }
    
    this.effectsPool.set('miss', missEffects);
  }
  
  /**
   * 创建连击特效池
   * @param count 预创建数量
   */
  private createComboEffectPool(count: number): void {
    const comboEffects: THREE.Object3D[] = [];
    
    for (let i = 0; i < count; i++) {
      // 创建波纹
      const geometry = new THREE.RingGeometry(0.1, 0.12, 32);
      const material = new THREE.MeshBasicMaterial({
        color: 0x00ff9f,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide
      });
      const ring = new THREE.Mesh(geometry, material);
      
      // 隐藏并添加到池中
      ring.visible = false;
      comboEffects.push(ring);
    }
    
    this.effectsPool.set('combo', comboEffects);
  }
  
  /**
   * 从对象池获取特效
   * @param type 特效类型
   * @returns THREE.Object3D | null
   */
  private getEffectFromPool(type: EffectType): THREE.Object3D | null {
    const pool = this.effectsPool.get(type);
    if (!pool || pool.length === 0) return null;
    
    // 查找未使用的特效
    for (const effect of pool) {
      if (!effect.visible) {
        return effect;
      }
    }
    
    // 如果没有可用的特效，创建新的
    return this.createNewEffect(type);
  }
  
  /**
   * 创建新特效
   * @param type 特效类型
   * @returns THREE.Object3D | null
   */
  private createNewEffect(type: EffectType): THREE.Object3D | null {
    switch (type) {
      case 'hit':
        const particles = new THREE.Group();
        for (let j = 0; j < 20; j++) {
          const geometry = new THREE.SphereGeometry(0.05, 8, 8);
          const material = new THREE.MeshBasicMaterial({
            color: 0x00f3ff,
            transparent: true,
            opacity: 0.8
          });
          const particle = new THREE.Mesh(geometry, material);
          particles.add(particle);
        }
        
        // 添加到池中
        const hitPool = this.effectsPool.get('hit') || [];
        hitPool.push(particles);
        this.effectsPool.set('hit', hitPool);
        
        return particles;
        
      case 'perfect':
        const geometry = new THREE.RingGeometry(0.3, 0.5, 32);
        const material = new THREE.MeshBasicMaterial({
          color: 0xff00ff,
          transparent: true,
          opacity: 0.8,
          side: THREE.DoubleSide
        });
        const ring = new THREE.Mesh(geometry, material);
        
        // 添加到池中
        const perfectPool = this.effectsPool.get('perfect') || [];
        perfectPool.push(ring);
        this.effectsPool.set('perfect', perfectPool);
        
        return ring;
        
      default:
        return null;
    }
  }
  
  /**
   * 播放命中特效
   * @param position 位置
   * @param color 颜色
   * @returns string 特效ID
   */
  playHitEffect(position: THREE.Vector3, color: string = '#00f3ff'): string {
    if (!this.scene) return '';
    
    // 获取特效对象
    const effect = this.getEffectFromPool('hit');
    if (!effect) return '';
    
    // 设置位置和可见性
    effect.position.copy(position);
    effect.visible = true;
    
    // 如果不在场景中，添加到场景
    if (!this.scene.children.includes(effect)) {
      this.scene.add(effect);
    }
    
    // 设置颜色
    effect.children.forEach((child: any) => {
      if (child.material) {
        child.material.color.set(color);
      }
    });
    
    // 应用动画
    effect.children.forEach((particle: THREE.Object3D, index: number) => {
      // 随机方向
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const radius = 0.5 + Math.random() * 0.5;
      
      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);
      
      // 重置位置
      particle.position.set(0, 0, 0);
      
      // 动画
      gsap.to(particle.position, {
        x,
        y,
        z,
        duration: 0.5 + Math.random() * 0.5,
        ease: 'power2.out'
      });
      
      // 缩放和透明度
      if ((particle as any).material) {
        (particle as any).material.opacity = 0.8;
        gsap.to((particle as any).material, {
          opacity: 0,
          duration: 0.8 + Math.random() * 0.4,
          ease: 'power2.out'
        });
      }
    });
    
    // 生成唯一ID
    const id = `hit-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    // 添加到活跃特效列表
    this.activeEffects.set(id, {
      object: effect,
      expireTime: Date.now() + 1500 // 1.5秒后过期
    });
    
    // 清理过期特效
    this.cleanupExpiredEffects();
    
    return id;
  }
  
  /**
   * 播放完美命中特效
   * @param position 位置
   * @param color 颜色
   * @returns string 特效ID
   */
  playPerfectEffect(position: THREE.Vector3, color: string = '#ff00ff'): string {
    if (!this.scene) return '';
    
    // 获取特效对象
    const effect = this.getEffectFromPool('perfect');
    if (!effect) return '';
    
    // 设置位置和可见性
    effect.position.copy(position);
    effect.visible = true;
    
    // 如果不在场景中，添加到场景
    if (!this.scene.children.includes(effect)) {
      this.scene.add(effect);
    }
    
    // 设置颜色
    if ((effect as any).material) {
      (effect as any).material.color.set(color);
      (effect as any).material.opacity = 0.8;
    }
    
    // 重置缩放
    effect.scale.set(0.5, 0.5, 0.5);
    
    // 应用动画
    gsap.to(effect.scale, {
      x: 2,
      y: 2,
      z: 2,
      duration: 0.8,
      ease: 'power2.out'
    });
    
    if ((effect as any).material) {
      gsap.to((effect as any).material, {
        opacity: 0,
        duration: 0.8,
        ease: 'power2.out'
      });
    }
    
    // 生成唯一ID
    const id = `perfect-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    // 添加到活跃特效列表
    this.activeEffects.set(id, {
      object: effect,
      expireTime: Date.now() + 1000 // 1秒后过期
    });
    
    // 清理过期特效
    this.cleanupExpiredEffects();
    
    return id;
  }
  
  /**
   * 播放未命中特效
   * @param position 位置
   * @returns string 特效ID
   */
  playMissEffect(position: THREE.Vector3): string {
    if (!this.scene) return '';
    
    // 获取特效对象
    const effect = this.getEffectFromPool('miss');
    if (!effect) return '';
    
    // 设置位置和可见性
    effect.position.copy(position);
    effect.visible = true;
    
    // 如果不在场景中，添加到场景
    if (!this.scene.children.includes(effect)) {
      this.scene.add(effect);
    }
    
    // 重置缩放和旋转
    effect.scale.set(0.5, 0.5, 0.5);
    effect.rotation.z = 0;
    
    // 应用动画
    gsap.to(effect.scale, {
      x: 1.5,
      y: 1.5,
      z: 1.5,
      duration: 0.3,
      ease: 'back.out'
    });
    
    gsap.to(effect.rotation, {
      z: Math.PI * 2,
      duration: 0.8,
      ease: 'power2.out'
    });
    
    // 透明度动画
    effect.children.forEach((child: any) => {
      if (child.material) {
        child.material.opacity = 1;
        gsap.to(child.material, {
          opacity: 0,
          duration: 0.8,
          ease: 'power2.out'
        });
      }
    });
    
    // 生成唯一ID
    const id = `miss-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    // 添加到活跃特效列表
    this.activeEffects.set(id, {
      object: effect,
      expireTime: Date.now() + 1000 // 1秒后过期
    });
    
    // 清理过期特效
    this.cleanupExpiredEffects();
    
    return id;
  }
  
  /**
   * 播放连击特效
   * @param position 位置
   * @param count 连击数
   * @returns string 特效ID
   */
  playComboEffect(position: THREE.Vector3, count: number): string {
    if (!this.scene || count < 5) return ''; // 只有连击数>=5才显示特效
    
    // 获取特效对象
    const effect = this.getEffectFromPool('combo');
    if (!effect) return '';
    
    // 设置位置和可见性
    effect.position.copy(position);
    effect.visible = true;
    
    // 如果不在场景中，添加到场景
    if (!this.scene.children.includes(effect)) {
      this.scene.add(effect);
    }
    
    // 设置颜色和大小（根据连击数调整）
    const intensity = Math.min(1, 0.5 + count / 100); // 连击越高，颜色越亮
    const scale = Math.min(3, 1 + count / 20); // 连击越高，特效越大
    
    if ((effect as any).material) {
      (effect as any).material.color.setHSL(0.3, 1, intensity);
      (effect as any).material.opacity = 0.8;
    }
    
    // 重置缩放
    effect.scale.set(0.1, 0.1, 0.1);
    
    // 应用动画
    gsap.to(effect.scale, {
      x: scale,
      y: scale,
      z: scale,
      duration: 1,
      ease: 'elastic.out(1, 0.3)'
    });
    
    if ((effect as any).material) {
      gsap.to((effect as any).material, {
        opacity: 0,
        duration: 1.2,
        ease: 'power2.out'
      });
    }
    
    // 生成唯一ID
    const id = `combo-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    // 添加到活跃特效列表
    this.activeEffects.set(id, {
      object: effect,
      expireTime: Date.now() + 1500 // 1.5秒后过期
    });
    
    // 清理过期特效
    this.cleanupExpiredEffects();
    
    return id;
  }
  
  /**
   * 播放背景特效
   * @param params 特效参数
   * @returns string 特效ID
   */
  playBackgroundEffect(params: EffectParams = {}): string {
    if (!this.scene) return '';
    
    // 创建背景波纹
    const geometry = new THREE.PlaneGeometry(10, 10, 32, 32);
    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        color: { value: new THREE.Color(params.color || '#00f3ff') },
        intensity: { value: params.intensity || 0.5 }
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
        uniform vec3 color;
        uniform float intensity;
        varying vec2 vUv;
        
        void main() {
          vec2 p = vUv * 2.0 - 1.0;
          float dist = length(p);
          float wave = sin(dist * 10.0 - time * 2.0) * 0.5 + 0.5;
          float alpha = smoothstep(0.8, 0.0, dist) * wave * intensity;
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide
    });
    
    const plane = new THREE.Mesh(geometry, material);
    plane.position.z = -5;
    plane.rotation.x = Math.PI / 6;
    
    // 添加到场景
    this.scene.add(plane);
    
    // 生成唯一ID
    const id = `bg-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    // 动画更新
    const duration = params.duration || 5000; // 默认5秒
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = elapsed / duration;
      
      if (progress < 1) {
        (material.uniforms.time as any).value = elapsed * 0.001;
        requestAnimationFrame(animate);
      } else {
        // 动画结束，移除对象
        this.scene?.remove(plane);
        material.dispose();
        geometry.dispose();
        this.activeEffects.delete(id);
      }
    };
    
    animate();
    
    // 添加到活跃特效列表
    this.activeEffects.set(id, {
      object: plane,
      expireTime: Date.now() + duration
    });
    
    return id;
  }
  
  /**
   * 停止特效
   * @param id 特效ID
   */
  stopEffect(id: string): void {
    const effect = this.activeEffects.get(id);
    if (!effect) return;
    
    // 隐藏对象
    effect.object.visible = false;
    
    // 从活跃列表中移除
    this.activeEffects.delete(id);
  }
  
  /**
   * 清理过期特效
   */
  private cleanupExpiredEffects(): void {
    const now = Date.now();
    
    // 每500ms执行一次清理，避免频繁操作
    if (now - this.lastCleanupTime < 500) return;
    this.lastCleanupTime = now;
    
    for (const [id, effect] of this.activeEffects.entries()) {
      if (now > effect.expireTime) {
        // 隐藏对象
        effect.object.visible = false;
        
        // 从活跃列表中移除
        this.activeEffects.delete(id);
      }
    }
  }
  
  /**
   * 更新特效
   * @param deltaTime 时间增量
   */
  update(deltaTime: number): void {
    // 这里可以添加需要每帧更新的特效逻辑
  }
  
  /**
   * 清理所有特效
   */
  dispose(): void {
    // 隐藏所有活跃特效
    for (const [_, effect] of this.activeEffects) {
      effect.object.visible = false;
    }
    
    this.activeEffects.clear();
    
    // 清理对象池
    for (const [_, pool] of this.effectsPool) {
      for (const effect of pool) {
        effect.visible = false;
        this.scene?.remove(effect);
      }
    }
    
    this.effectsPool.clear();
    this.scene = null;
  }
}

// 创建单例实例
export const effectsManager = new EffectsManager();