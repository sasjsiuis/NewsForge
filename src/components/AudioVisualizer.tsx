import React, { useEffect, useRef, useState } from 'react';

interface AudioVisualizerProps {
  audioElement: HTMLAudioElement | null;
  isPlaying: boolean;
  uploadedFile: File | null;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  audioElement,
  isPlaying,
  uploadedFile
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const [useFallback, setUseFallback] = useState<boolean>(false);

  // Keep a map on window to avoid connecting MediaElementAudioSourceNode multiple times to the same element
  useEffect(() => {
    if (!audioElement) return;

    const initAudioContext = () => {
      try {
        // Retrieve or create window-specific audio sources map
        const win = window as any;
        if (!win._connectedAudioSources) {
          win._connectedAudioSources = new Map();
        }

        const AudioContextClass = win.AudioContext || win.webkitAudioContext;
        if (!AudioContextClass) {
          setUseFallback(true);
          return;
        }

        // Initialize AudioContext
        if (!audioContextRef.current) {
          audioContextRef.current = new AudioContextClass();
        }
        const ctx = audioContextRef.current;

        // Create or reuse AnalyserNode
        if (!analyserRef.current) {
          const fftSize = 128;
          const analyser = ctx.createAnalyser();
          analyser.fftSize = fftSize;
          analyser.smoothingTimeConstant = 0.8;
          analyserRef.current = analyser;
        }
        const analyser = analyserRef.current;

        // Reuse or create source node
        let source = win._connectedAudioSources.get(audioElement);
        if (!source) {
          source = ctx.createMediaElementSource(audioElement);
          win._connectedAudioSources.set(audioElement, source);
        }
        
        sourceRef.current = source;
        
        // Reconnect connections safely
        source.disconnect();
        source.connect(analyser);
        analyser.connect(ctx.destination);
        setUseFallback(false);
      } catch (e) {
        console.warn("Web Audio API not fully bound to this element, using high-fidelity fallback animation:", e);
        setUseFallback(true);
      }
    };

    // Initialize on first play or if context exists
    if (isPlaying) {
      initAudioContext();
      if (audioContextRef.current?.state === 'suspended') {
        audioContextRef.current.resume();
      }
    }

    const handlePlay = () => {
      initAudioContext();
      if (audioContextRef.current?.state === 'suspended') {
        audioContextRef.current.resume();
      }
    };

    audioElement.addEventListener('play', handlePlay);
    return () => {
      audioElement.removeEventListener('play', handlePlay);
    };
  }, [audioElement, isPlaying]);

  // Audio waveform rendering loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set high-DPI canvas resolution
    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };
    resizeCanvas();

    const resizeObserver = new ResizeObserver(() => {
      resizeCanvas();
    });
    resizeObserver.observe(canvas);

    const barCount = 42;
    // Dynamic wave values for nice fallback and idle mode smoothing
    let phases = Array.from({ length: barCount }, () => Math.random() * Math.PI * 2);
    let speeds = Array.from({ length: barCount }, () => 0.05 + Math.random() * 0.05);
    let currentHeights = Array.from({ length: barCount }, () => 2);

    const render = () => {
      const w = canvas.width / (window.devicePixelRatio || 1);
      const h = canvas.height / (window.devicePixelRatio || 1);

      if (w <= 0 || h <= 0 || isNaN(w) || isNaN(h)) {
        animationRef.current = requestAnimationFrame(render);
        return;
      }

      // Clear with elegant slight transparency trail for glow
      ctx.clearRect(0, 0, w, h);

      const gap = 3;
      const totalGapWidth = gap * (barCount - 1);
      const barWidth = (w - totalGapWidth) / barCount;

      let dataArray: Uint8Array = new Uint8Array(0);
      if (analyserRef.current && !useFallback) {
        const bufferLength = analyserRef.current.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);
        if (isPlaying) {
          analyserRef.current.getByteFrequencyData(dataArray);
        }
      }

      // Track time/frequency indices
      for (let i = 0; i < barCount; i++) {
        // Calculate target height
        let targetHeight = 3; // Baseline height
        
        if (isPlaying) {
          if (analyserRef.current && !useFallback && dataArray.length > 0) {
            // Map bar index to frequency bin safely
            const dataIdx = Math.floor((i / barCount) * (dataArray.length * 0.7)); // Focus on standard human vocal ranges
            const val = dataArray[dataIdx];
            targetHeight = (val / 255) * (h - 6) + 3;
          } else {
            // High fidelity fallback sinewave synthesis simulation if Web Audio isn't accessible
            phases[i] += speeds[i];
            const multiplier = Math.sin(phases[i]) * 0.5 + 0.5;
            // Scale by dynamic speech rhythm multiplier
            const speechPulse = Math.sin(Date.now() * 0.003) * 0.3 + 0.7;
            targetHeight = multiplier * (h - 8) * speechPulse + 4;
          }
        } else {
          // Beautiful idle ambient wave representing a static physical file structure
          const centerFactor = Math.sin((i / (barCount - 1)) * Math.PI); // beautiful curve
          const offsetBase = Math.sin(i * 0.4) * 0.2 + 0.8;
          targetHeight = centerFactor * 14 * offsetBase + 2;
        }

        // Apply visual damping and smoothing
        currentHeights[i] += (targetHeight - currentHeights[i]) * 0.25;

        // Render double-sided beautiful symmetrical mirror bar
        const barH = isFinite(currentHeights[i]) ? currentHeights[i] : 2;
        const x = i * (barWidth + gap);
        const y = h / 2 - barH / 2;

        if (!isFinite(x) || !isFinite(y) || !isFinite(barWidth) || !isFinite(barH) || barWidth <= 0 || barH <= 0) {
          continue;
        }

        // Base gradient corresponding styled palette
        const gradient = ctx.createLinearGradient(x, y, x, y + barH);
        
        if (isPlaying) {
          // Radiant Glowing Neon crimson red
          gradient.addColorStop(0, '#f87171'); // Light pink/red apex
          gradient.addColorStop(0.5, '#ef4444'); // Vivid Red mid
          gradient.addColorStop(1, '#991b1b'); // Crimson base
          
          // Outer shadow glow using canvas filters if playing
          ctx.shadowBlur = 12;
          ctx.shadowColor = 'rgba(239, 68, 68, 0.45)';
        } else {
          // Elegant dark titanium gray
          gradient.addColorStop(0, '#475569');
          gradient.addColorStop(1, '#1e293b');
          ctx.shadowBlur = 0;
        }

        // Draw rounded rectangle for premium texture
        ctx.fillStyle = gradient;
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(x, y, barWidth, barH, [3]);
        } else {
          ctx.rect(x, y, barWidth, barH);
        }
        ctx.fill();
      }

      // Reset shadows for clean interface rendering
      ctx.shadowBlur = 0;

      // Draw horizontal baseline decoration
      ctx.fillStyle = isPlaying ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.04)';
      ctx.fillRect(0, h / 2 - 0.5, w, 1);

      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      resizeObserver.disconnect();
    };
  }, [isPlaying, useFallback]);

  return (
    <div className="w-full h-12 flex items-center relative overflow-hidden bg-black/20 border border-white/[0.04] rounded-lg p-2 px-3">
      {/* Decorative spectrum background indicators */}
      <div className="absolute top-1 left-2.5 flex gap-1 items-center opacity-40 select-none">
        <span className={`w-1 h-1 rounded-full ${isPlaying ? 'bg-[#e53e3e] animate-pulse' : 'bg-slate-600'}`} />
        <span className="font-logo text-[8px] text-[#94a3b8] tracking-widest font-bold">
          {isPlaying ? 'SPECTRUM ACTIVE' : 'SPECTRUM IDLE'}
        </span>
      </div>
      <div className="absolute bottom-1 right-2.5 opacity-30 select-none">
        <span className="font-logo text-[7px] text-[#94a3b8] font-bold">
          {isPlaying ? 'STEREO ANALOG' : 'READY TO STREAM'}
        </span>
      </div>

      {/* Main rendering canvas */}
      <canvas 
        ref={canvasRef} 
        className="w-full h-8 block cursor-pointer"
        title="অডিও ফ্রিকোয়েন্সি ওয়েভফর্ম স্পেকট্রাম"
      />
    </div>
  );
};
