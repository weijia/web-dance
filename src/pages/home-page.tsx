import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

const HomePage = () => {
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    // 模拟资源加载
    const timer = setTimeout(() => {
      setIsLoaded(true)
    }, 1000)

    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center bg-cyber-black overflow-hidden">
      {/* 背景网格 */}
      <div className="absolute inset-0 bg-cyber-grid opacity-20"></div>
      
      {/* 动态光效 */}
      <div className="absolute top-1/4 -left-20 w-40 h-40 rounded-full bg-neon-blue opacity-20 blur-3xl"></div>
      <div className="absolute bottom-1/4 -right-20 w-40 h-40 rounded-full bg-neon-pink opacity-20 blur-3xl"></div>
      
      {/* 主内容 */}
      <motion.div 
        className="z-10 text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: isLoaded ? 1 : 0, y: isLoaded ? 0 : 20 }}
        transition={{ duration: 0.8, delay: 0.2 }}
      >
        <motion.h1 
          className="text-5xl md:text-7xl font-bold mb-4 neon-text-blue"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: isLoaded ? 1 : 0, y: isLoaded ? 0 : -20 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          节奏光影
        </motion.h1>
        
        <motion.p 
          className="text-xl md:text-2xl mb-8 text-gray-300"
          initial={{ opacity: 0 }}
          animate={{ opacity: isLoaded ? 1 : 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          用你的双手，感受音乐的律动
        </motion.p>
        
        <motion.div 
          className="flex flex-col md:flex-row gap-4 justify-center mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: isLoaded ? 1 : 0, y: isLoaded ? 0 : 20 }}
          transition={{ duration: 0.8, delay: 0.8 }}
        >
          <Link to="/songs" className="cyber-button">
            开始游戏
          </Link>
          <Link to="/calibration" className="cyber-button bg-cyber-dark border-neon-pink hover:bg-neon-pink hover:shadow-neon-pink">
            动作校准
          </Link>
        </motion.div>
        
        <motion.div
          className="flex justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: isLoaded ? 1 : 0 }}
          transition={{ duration: 0.8, delay: 1 }}
        >
          <Link to="/settings" className="text-neon-blue hover:text-white transition-colors flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
            <span>游戏设置</span>
          </Link>
        </motion.div>
      </motion.div>
      
      {/* 底部信息 */}
      <motion.div 
        className="absolute bottom-8 text-sm text-gray-500"
        initial={{ opacity: 0 }}
        animate={{ opacity: isLoaded ? 0.7 : 0 }}
        transition={{ duration: 0.8, delay: 1 }}
      >
        <p>需要摄像头权限 | 推荐使用Chrome浏览器</p>
      </motion.div>
    </div>
  )
}

export default HomePage