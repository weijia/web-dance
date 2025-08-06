import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useHandTracking } from '../hooks/use-hand-tracking';
import { motionTracker } from '../systems/motion-tracker';

const CalibrationPage: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibrationStep, setCalibrationStep] = useState(0);
  const [calibrationProgress, setCalibrationProgress] = useState(0);
  const [handDetected, setHandDetected] = useState(false);
  const navigate = useNavigate();
  
  // 使用手部追踪钩子
  const { 
    handPosition, 
    isTracking, 
    confidence, 
    error, 
    gesture,
    landmarks,
    calibrateTracking
  } = useHandTracking(videoRef.current);

  // 初始化摄像头
  useEffect(() => {
    let mounted = true;
    let videoStream: MediaStream | null = null;
    let initTimeout: NodeJS.Timeout;
    const initRef = useRef(false);
    
    const initCamera = async () => {
      try {
        console.log('开始初始化摄像头...');
        
        // 等待DOM渲染完成，确保videoRef.current存在
        if (!videoRef.current) {
          console.log('等待视频元素渲染...');
          // 使用setTimeout等待DOM渲染
          setTimeout(initCamera, 100);
          return;
        }
        
        // 获取摄像头流
        console.log('请求摄像头权限...');
        videoStream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480 }
        });
        console.log('摄像头权限已获取');
        
        // 确保组件仍然挂载
        if (!mounted || !videoRef.current) return;
        
        // 设置视频源
        videoRef.current.srcObject = videoStream;
        console.log('视频源已设置');
        
        // 等待元数据加载完成后播放视频
        videoRef.current.onloadedmetadata = async () => {
          if (!mounted || !videoRef.current) return;
          
          try {
            console.log('视频元数据已加载，尝试播放...');
            await videoRef.current.play();
            console.log('视频播放成功');
            
            // 初始化手部追踪
            if (mounted) {
              console.log('开始初始化手部追踪...');
              try {
                await motionTracker.initialize(videoRef.current);
                console.log('手部追踪初始化成功');
                
                // 强制结束加载状态
                if (mounted) {
                  console.log('设置加载状态为完成');
                  setIsLoading(false);
                }
              } catch (trackError) {
                console.error('手部追踪初始化失败:', trackError);
                if (mounted) {
                  setIsLoading(false); // 即使失败也结束加载状态
                  setError('手部追踪初始化失败，请刷新页面重试');
                }
              }
            }
          } catch (e) {
            console.error('视频播放失败:', e);
            if (mounted) {
              setIsLoading(false);
              setError('视频播放失败，请检查摄像头权限');
            }
          }
        };
        
        // 设置超时，防止永久加载
        initTimeout = setTimeout(() => {
          if (mounted && isLoading) {
            console.log('初始化超时，强制结束加载状态');
            setIsLoading(false);
            setError('初始化超时，请刷新页面重试');
          }
        }, 10000); // 10秒超时
        
      } catch (error) {
        console.error('无法访问摄像头:', error);
        if (mounted) {
          setIsLoading(false);
          setError('无法访问摄像头，请检查浏览器权限设置');
        }
      }
    };
    
    initCamera();
    
    return () => {
      console.log('组件卸载，清理资源');
      mounted = false;
      clearTimeout(initTimeout);
      
      // 清理摄像头资源
      if (videoStream) {
        videoStream.getTracks().forEach(track => {
          console.log('停止摄像头轨道');
          track.stop();
        });
      }
      
      // 清理手部追踪资源
      console.log('释放手部追踪资源');
      motionTracker.dispose();
    };
  }, [isLoading]);

  // 监听手部检测状态
  useEffect(() => {
    setHandDetected(handPosition !== null && confidence > 0.3); // 降低阈值，与motion-tracker.ts中的设置保持一致
  }, [handPosition, confidence]);

  // 绘制手部关键点
  useEffect(() => {
    if (!canvasRef.current || !landmarks) return;
    
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    
    // 清除画布
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    
    // 如果没有检测到手，直接返回
    if (!handDetected) return;
    
    // 绘制手部关键点
    ctx.fillStyle = '#00f3ff';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    
    // 绘制关键点
    landmarks.forEach((landmark: any) => {
      const x = landmark.x * canvasRef.current!.width;
      const y = landmark.y * canvasRef.current!.height;
      
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, 2 * Math.PI);
      ctx.fill();
    });
    
    // 连接关键点（简化版）
    // 连接拇指
    for (let i = 1; i < 5; i++) {
      connectPoints(ctx, landmarks[i-1], landmarks[i]);
    }
    
    // 连接食指
    for (let i = 5; i < 9; i++) {
      connectPoints(ctx, landmarks[i], landmarks[i+1]);
    }
    
    // 连接中指
    for (let i = 9; i < 13; i++) {
      connectPoints(ctx, landmarks[i], landmarks[i+1]);
    }
    
    // 连接无名指
    for (let i = 13; i < 17; i++) {
      connectPoints(ctx, landmarks[i], landmarks[i+1]);
    }
    
    // 连接小指
    for (let i = 17; i < 21; i++) {
      connectPoints(ctx, landmarks[i], landmarks[i+1]);
    }
    
    // 连接手掌
    connectPoints(ctx, landmarks[0], landmarks[5]);
    connectPoints(ctx, landmarks[5], landmarks[9]);
    connectPoints(ctx, landmarks[9], landmarks[13]);
    connectPoints(ctx, landmarks[13], landmarks[17]);
    connectPoints(ctx, landmarks[0], landmarks[17]);
    
  }, [landmarks, handDetected]);

  // 连接两个点的辅助函数
  const connectPoints = (ctx: CanvasRenderingContext2D, point1: any, point2: any) => {
    if (!point1 || !point2 || !canvasRef.current) return;
    
    const x1 = point1.x * canvasRef.current.width;
    const y1 = point1.y * canvasRef.current.height;
    const x2 = point2.x * canvasRef.current.width;
    const y2 = point2.y * canvasRef.current.height;
    
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  };

  // 校准过程
  useEffect(() => {
    if (!isCalibrating) return;
    
    let progressInterval: NodeJS.Timeout;
    
    // 模拟校准进度
    if (calibrationStep > 0) {
      progressInterval = setInterval(() => {
        setCalibrationProgress(prev => {
          const newProgress = prev + 1;
          if (newProgress >= 100) {
            clearInterval(progressInterval);
            
            // 完成当前步骤
            if (calibrationStep < 3) {
              setTimeout(() => {
                setCalibrationStep(calibrationStep + 1);
                setCalibrationProgress(0);
                
                // 在步骤2开始时执行校准
                if (calibrationStep === 1) {
                  calibrateTracking();
                }
              }, 500);
            } else {
              // 校准完成
              setIsCalibrating(false);
              setTimeout(() => {
                navigate('/songs');
              }, 1000);
            }
          }
          return newProgress;
        });
      }, 30);
    }
    
    return () => {
      clearInterval(progressInterval);
    };
  }, [isCalibrating, calibrationStep, navigate, calibrateTracking]);

  // 开始校准
  const startCalibration = () => {
    setIsCalibrating(true);
    setCalibrationStep(1);
    setCalibrationProgress(0);
  };

  // 渲染校准步骤说明
  const renderStepInstructions = () => {
    switch (calibrationStep) {
      case 1:
        return "请将右手掌心对准摄像头";
      case 2:
        return "请在空中画一个圆圈";
      case 3:
        return "请做出抓取动作";
      default:
        return "";
    }
  };

  // 渲染当前检测到的手势
  const renderGestureInfo = () => {
    if (!gesture) return null;
    
    let gestureText = '';
    let gestureClass = 'text-neon-blue';
    
    switch (gesture) {
      case 'point':
        gestureText = '指点手势';
        gestureClass = 'text-neon-green';
        break;
      case 'peace':
        gestureText = '剪刀手势';
        gestureClass = 'text-neon-blue';
        break;
      case 'open':
        gestureText = '张开手掌';
        gestureClass = 'text-neon-pink';
        break;
      case 'fist':
        gestureText = '握拳手势';
        gestureClass = 'text-neon-orange';
        break;
      case 'four':
        gestureText = '四指手势';
        gestureClass = 'text-neon-purple';
        break;
      default:
        gestureText = '未知手势';
    }
    
    return (
      <div className={`text-lg font-bold ${gestureClass}`}>
        {gestureText}
      </div>
    );
  };

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
        <h1 className="text-2xl font-bold neon-text-blue">动作校准</h1>
        <div className="w-20"></div> {/* 占位，保持标题居中 */}
      </motion.div>
      
      {/* 主内容区 */}
      <div className="max-w-4xl mx-auto">
        <div className="cyber-panel mb-6">
          <p className="mb-4">
            为了获得最佳游戏体验，请先进行动作校准。这将帮助系统更准确地识别您的手部动作。
          </p>
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-1 text-neon-green">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
              <span>良好的光线条件</span>
            </div>
            <div className="flex items-center gap-1 text-neon-green">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
              <span>面对摄像头</span>
            </div>
            <div className="flex items-center gap-1 text-neon-pink">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
              <span>避免复杂背景</span>
            </div>
          </div>
        </div>
        
        {/* 摄像头预览 */}
        <div className="relative w-full aspect-video mb-6 overflow-hidden rounded-lg border border-neon-blue">
          {isLoading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-cyber-dark">
              <div className="text-neon-blue text-xl animate-pulse mb-4">加载摄像头...</div>
              <button 
                className="cyber-button bg-cyber-dark border-neon-pink"
                onClick={() => {
                  console.log('手动结束加载状态');
                  setIsLoading(false);
                }}
              >
                跳过等待
              </button>
            </div>
          ) : (
            <>
              <video 
                ref={videoRef}
                autoPlay 
                playsInline 
                muted
                className="absolute inset-0 w-full h-full object-cover opacity-50"
              />
              <canvas 
                ref={canvasRef}
                width={640}
                height={480}
                className="absolute inset-0 w-full h-full object-cover"
              />
              
              {isCalibrating && (
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="absolute top-4 left-4 right-4 flex items-center gap-4">
                    <div className="text-lg font-bold">步骤 {calibrationStep}/3</div>
                    <div className="flex-1 h-2 bg-cyber-gray rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-neon-blue"
                        style={{ width: `${calibrationProgress}%` }}
                      />
                    </div>
                  </div>
                  
                  <div className="text-2xl font-bold mb-4 neon-text-blue">
                    {renderStepInstructions()}
                  </div>
                  
                  <div className={`text-lg ${handDetected ? 'text-neon-green' : 'text-neon-pink'}`}>
                    {handDetected ? '已检测到手' : '未检测到手'}
                  </div>
                  
                  {renderGestureInfo()}
                </div>
              )}
              
              {!isCalibrating && (
                <div className="absolute bottom-4 left-4 right-4 bg-cyber-dark bg-opacity-70 p-2 rounded">
                  <div className="flex justify-between items-center">
                    <div className="text-sm">
                      <div className="flex items-center gap-2">
                        <span>手部检测:</span>
                        <span className={handDetected ? 'text-neon-green' : 'text-neon-pink'}>
                          {handDetected ? '已检测' : '未检测'}
                        </span>
                      </div>
                      {handDetected && (
                        <div className="flex items-center gap-2">
                          <span>置信度:</span>
                          <span className="text-neon-blue">{(confidence * 100).toFixed(0)}%</span>
                        </div>
                      )}
                    </div>
                    {renderGestureInfo()}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        
        {/* 控制按钮 */}
        <div className="flex justify-center">
          {!isCalibrating ? (
            <div 
              className={`cyber-button ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              onClick={() => {
                if (!isLoading) {
                  console.log('开始校准按钮被点击');
                  startCalibration();
                }
              }}
              style={{ zIndex: 100 }}
            >
              {isLoading ? '正在初始化...' : '开始校准'}
            </div>
          ) : (
            <div 
              className="cyber-button bg-cyber-dark border-neon-pink hover:bg-neon-pink hover:shadow-neon-pink cursor-pointer"
              onClick={() => {
                console.log('取消校准按钮被点击');
                setIsCalibrating(false);
                setCalibrationStep(0);
                setCalibrationProgress(0);
              }}
              style={{ zIndex: 100 }}
            >
              取消校准
            </div>
          )}
        </div>
        
        {/* 错误提示 */}
        {error && (
          <div className="mt-4 p-3 bg-cyber-dark border border-neon-pink rounded-md text-neon-pink text-center">
            <div className="mb-2">{error}</div>
            <button 
              className="cyber-button bg-cyber-dark border-neon-pink hover:bg-neon-pink hover:text-cyber-black mt-2"
              onClick={() => window.location.reload()}
            >
              刷新页面
            </button>
          </div>
        )}
        
        {/* 调试信息 */}
        <div className="mt-4 p-3 bg-cyber-dark border border-neon-blue rounded-md text-sm opacity-70">
          <div className="font-bold mb-2">调试信息:</div>
          <div>摄像头状态: {videoRef.current?.readyState === 4 ? '就绪' : '未就绪'}</div>
          <div>视频尺寸: {videoRef.current?.videoWidth || 0} x {videoRef.current?.videoHeight || 0}</div>
          <div>手部追踪: {isTracking ? '活跃' : '未活跃'}</div>
          <div>置信度: {(confidence * 100).toFixed(1)}%</div>
          <div>检测到的手势: {gesture || '无'}</div>
        </div>
      </div>
    </div>
  );
};

export default CalibrationPage;