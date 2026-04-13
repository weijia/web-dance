import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const NotFoundPage: React.FC = () => {
  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center bg-cyber-black text-white p-4">
      {/* 背景网格 */}
      <div className="absolute inset-0 bg-cyber-grid opacity-20"></div>
      
      {/* 动态光效 */}
      <div className="absolute top-1/4 -left-20 w-40 h-40 rounded-full bg-neon-pink opacity-20 blur-3xl"></div>
      <div className="absolute bottom-1/4 -right-20 w-40 h-40 rounded-full bg-neon-blue opacity-20 blur-3xl"></div>
      
      {/* 主内容 */}
      <motion.div 
        className="z-10 text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <motion.h1 
          className="text-8xl font-bold mb-4 neon-text-pink"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          404
        </motion.h1>
        
        <motion.div 
          className="text-xl md:text-2xl mb-8 text-gray-300"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          <p className="mb-2">页面不存在或已被移除</p>
          <p className="text-sm text-gray-500">系统错误代码: 0xE80074AB</p>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          <Link to="/" className="cyber-button">
            返回首页
          </Link>
        </motion.div>
      </motion.div>
      
      {/* 故障效果 */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/3 left-0 right-0 h-px bg-neon-blue opacity-70"></div>
        <div className="absolute top-2/3 left-0 right-0 h-px bg-neon-pink opacity-70"></div>
        
        {/* 随机故障线 */}
        {Array.from({ length: 5 }).map((_, i) => (
          <div 
            key={i}
            className="absolute h-px bg-neon-blue opacity-50"
            style={{
              top: `${Math.random() * 100}%`,
              left: 0,
              right: 0,
              animation: `glitch ${Math.random() * 2 + 1}s ease-in-out infinite alternate`
            }}
          ></div>
        ))}
      </div>
    </div>
  );
};

export default NotFoundPage;