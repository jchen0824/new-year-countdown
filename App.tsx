import React, { useState, useEffect, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { Stars, Sparkles } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { useHandTracking } from './hooks/useHandTracking';
import ParticleNumber from './components/ParticleNumber';

const App: React.FC = () => {
  const { videoRef, handData, isReady } = useHandTracking();
  const [currentNumber, setCurrentNumber] = useState(5);
  const [lastFistTime, setLastFistTime] = useState(0);

  // Game Logic Loop
  useEffect(() => {
    if (!isReady || !handData.isFist) return;

    const now = Date.now();
    // Debounce: 1.5 seconds cooldown between interactions to prevent accidental double-skips
    if (now - lastFistTime > 1500) {
      setLastFistTime(now);
      
      if (currentNumber > 0) {
        // Trigger squeeze effect, change number
        setCurrentNumber((prev) => prev - 1);
      } else {
        // Reset to start if currently at 0 (Happy 2026)
        setCurrentNumber(5);
      }
    }
  }, [handData.isFist, isReady, lastFistTime, currentNumber]);

  return (
    <div className="relative w-full h-full bg-black select-none overflow-hidden">
      
      {/* Hidden Video Element for MediaPipe */}
      <video
        ref={videoRef}
        className="absolute top-0 left-0 w-0 h-0 opacity-0 pointer-events-none"
        playsInline
        muted
        autoPlay
      />

      {/* Loading Overlay */}
      {!isReady && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black text-white flex-col gap-4">
          <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="font-mono text-cyan-400 animate-pulse">Initializing Vision Systems...</p>
          <p className="text-xs text-gray-500">Please allow camera access</p>
        </div>
      )}

      {/* UI Overlay */}
      {isReady && (
        <div className="absolute inset-0 z-10 pointer-events-none p-8 flex flex-col justify-between">
          <div className="flex justify-between items-start">
             <div>
                <h1 className="text-2xl font-bold text-white tracking-widest uppercase" style={{ textShadow: '0 0 10px rgba(0,255,255,0.5)' }}>
                  Chronos 2026
                </h1>
                <p className="text-cyan-300 text-sm font-mono mt-1 opacity-80">
                  {currentNumber > 0 ? "SQUEEZE HAND TO ACCELERATE TIME" : "SQUEEZE TO RESET TIMELINE"}
                </p>
             </div>
             
             {/* Hand Status Indicator */}
             <div className="flex flex-col items-end gap-2">
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${handData.isPresent ? 'border-green-500/50 bg-green-900/20' : 'border-red-500/50 bg-red-900/20'}`}>
                   <div className={`w-2 h-2 rounded-full ${handData.isPresent ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
                   <span className="text-xs font-mono text-white">{handData.isPresent ? 'LINK ESTABLISHED' : 'SEARCHING FOR HAND'}</span>
                </div>
                {handData.isPresent && (
                   <div className={`text-xs font-bold transition-colors duration-200 ${handData.isFist ? 'text-yellow-400' : 'text-gray-500'}`}>
                      {handData.isFist ? '[ FIST DETECTED ]' : '[ OPEN HAND ]'}
                   </div>
                )}
             </div>
          </div>

          <div className="text-center opacity-40">
            <p className="text-[10px] text-white font-mono">
              Use your hand to move the energy core. Close your fist to advance the countdown or reset.
            </p>
          </div>
        </div>
      )}

      {/* 3D Scene */}
      <Canvas 
        camera={{ position: [0, 0, 15], fov: 45 }}
        gl={{ antialias: false, stencil: false, depth: false }}
        dpr={[1, 1.5]} // Optimize performance
      >
        <color attach="background" args={['#050510']} />
        
        {/* Environment */}
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        <ambientLight intensity={0.2} />
        
        {/* Floating dust */}
        <Sparkles count={500} scale={20} size={2} speed={0.4} opacity={0.5} color="#ffffff" />

        {/* The Core Content */}
        {isReady && (
            <ParticleNumber 
                handData={handData} 
                targetNumber={currentNumber} 
            />
        )}

        {/* Post Processing */}
        <EffectComposer enableNormalPass={false}>
          {/* Lower threshold so the AdditiveBlending hot spots glow, but keep radius tight for sharpness */}
          <Bloom 
            luminanceThreshold={0.5} 
            mipmapBlur 
            intensity={1.2} 
            radius={0.6} 
          />
          <Vignette eskil={false} offset={0.1} darkness={1.1} />
        </EffectComposer>
      </Canvas>
    </div>
  );
};

export default App;