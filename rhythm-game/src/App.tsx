import { useState, Suspense } from 'react'
import { Routes, Route, BrowserRouter } from 'react-router-dom'
import React from 'react'

// 导入页面组件
const HomePage = React.lazy(() => import('./pages/home-page'));
const GamePage = React.lazy(() => import('./pages/game-page'));
const CalibrationPage = React.lazy(() => import('./pages/calibration-page'));
const SongSelectPage = React.lazy(() => import('./pages/song-select-page'));
const ResultPage = React.lazy(() => import('./pages/result-page'));
const SettingsPage = React.lazy(() => import('./pages/settings-page'));
const NotFoundPage = React.lazy(() => import('./pages/not-found-page'));

// 加载中组件
const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-cyber-black">
    <div className="text-neon-blue text-2xl animate-pulse">加载中...</div>
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-cyber-black text-white">
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/songs" element={<SongSelectPage />} />
            <Route path="/calibration" element={<CalibrationPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/game/:songId" element={<GamePage />} />
            <Route path="/result" element={<ResultPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </div>
    </BrowserRouter>
  )
}

export default App