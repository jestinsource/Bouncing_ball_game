import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RefreshCw, Play, Pause, Plus, Minus, Zap } from 'lucide-react';

interface Ball {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  trail: { x: number; y: number }[];
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

const COLORS = [
  '#FF3E3E', // Red
  '#3E8BFF', // Blue
  '#3EFF8B', // Green
  '#FFD73E', // Yellow
  '#FF3EFF', // Pink
  '#3EFFFF', // Cyan
];

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [balls, setBalls] = useState<Ball[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [gravity, setGravity] = useState(0.25);
  const [friction, setFriction] = useState(0.99);
  const [bounce, setBounce] = useState(0.8);
  const [score, setScore] = useState(0);
  const [shake, setShake] = useState(0);

  const ballsRef = useRef<Ball[]>([]);
  const particlesRef = useRef<Particle[]>([]);

  const createBall = useCallback((x: number, y: number) => {
    const radius = Math.random() * 15 + 10;
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    return {
      id: Date.now() + Math.random(),
      x,
      y,
      vx: (Math.random() - 0.5) * 15,
      vy: (Math.random() - 0.5) * 15,
      radius,
      color,
      trail: [],
    };
  }, []);

  const spawnBall = () => {
    if (!canvasRef.current) return;
    const newBall = createBall(
      canvasRef.current.width / 2,
      canvasRef.current.height / 4
    );
    ballsRef.current.push(newBall);
    setBalls([...ballsRef.current]);
  };

  const clearBalls = () => {
    ballsRef.current = [];
    setBalls([]);
    setScore(0);
  };

  const createParticles = (x: number, y: number, color: string) => {
    for (let i = 0; i < 8; i++) {
      particlesRef.current.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.5) * 10,
        life: 1.0,
        color,
      });
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      if (containerRef.current) {
        canvas.width = containerRef.current.clientWidth;
        canvas.height = containerRef.current.clientHeight;
      }
    };

    window.addEventListener('resize', resize);
    resize();

    // Initial balls
    if (ballsRef.current.length === 0) {
      for (let i = 0; i < 3; i++) {
        ballsRef.current.push(createBall(canvas.width / 2, canvas.height / 2));
      }
      setBalls([...ballsRef.current]);
    }

    let animationId: number;

    const update = () => {
      if (isPaused) {
        animationId = requestAnimationFrame(update);
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Apply screen shake
      if (shake > 0) {
        const sx = (Math.random() - 0.5) * shake;
        const sy = (Math.random() - 0.5) * shake;
        ctx.translate(sx, sy);
        setShake(prev => Math.max(0, prev - 0.5));
      }

      // Update Particles
      particlesRef.current = particlesRef.current.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.1; // Particle gravity
        p.life -= 0.02;

        if (p.life > 0) {
          ctx.globalAlpha = p.life;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
          ctx.fill();
          return true;
        }
        return false;
      });
      ctx.globalAlpha = 1.0;

      // Update Balls
      ballsRef.current.forEach(ball => {
        // Physics
        ball.vy += gravity;
        ball.vx *= friction;
        ball.vy *= friction;
        ball.x += ball.vx;
        ball.y += ball.vy;

        // Trail
        ball.trail.push({ x: ball.x, y: ball.y });
        if (ball.trail.length > 10) ball.trail.shift();

        // Draw Trail
        ctx.beginPath();
        ctx.strokeStyle = ball.color;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.3;
        ball.trail.forEach((p, i) => {
          if (i === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        });
        ctx.stroke();
        ctx.globalAlpha = 1.0;

        // Wall Collisions
        if (ball.x + ball.radius > canvas.width) {
          ball.x = canvas.width - ball.radius;
          ball.vx *= -bounce;
          createParticles(ball.x, ball.y, ball.color);
          setScore(s => s + 1);
          setShake(3);
        } else if (ball.x - ball.radius < 0) {
          ball.x = ball.radius;
          ball.vx *= -bounce;
          createParticles(ball.x, ball.y, ball.color);
          setScore(s => s + 1);
          setShake(3);
        }

        if (ball.y + ball.radius > canvas.height) {
          ball.y = canvas.height - ball.radius;
          ball.vy *= -bounce;
          createParticles(ball.x, ball.y, ball.color);
          setScore(s => s + 1);
          setShake(3);
        } else if (ball.y - ball.radius < 0) {
          ball.y = ball.radius;
          ball.vy *= -bounce;
          createParticles(ball.x, ball.y, ball.color);
          setScore(s => s + 1);
          setShake(3);
        }

        // Draw Ball
        ctx.fillStyle = ball.color;
        ctx.shadowBlur = 15;
        ctx.shadowColor = ball.color;
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // Reset transform if shaken
      ctx.setTransform(1, 0, 0, 1, 0, 0);

      animationId = requestAnimationFrame(update);
    };

    animationId = requestAnimationFrame(update);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationId);
    };
  }, [isPaused, gravity, friction, bounce, shake]);

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Apply impulse to nearby balls
    ballsRef.current.forEach(ball => {
      const dx = ball.x - x;
      const dy = ball.y - y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 150) {
        const force = (150 - dist) / 10;
        ball.vx += (dx / dist) * force;
        ball.vy += (dy / dist) * force;
      }
    });
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans overflow-hidden flex flex-col">
      {/* Header */}
      <header className="p-6 flex items-center justify-between border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Zap className="w-6 h-6 text-zinc-950" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Bouncing Ball Odyssey</h1>
            <p className="text-xs text-zinc-500 uppercase tracking-widest font-mono">Physics Sandbox v1.0</p>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-xs text-zinc-500 uppercase font-mono">Total Bounces</p>
            <motion.p 
              key={score}
              initial={{ scale: 1.2, color: '#10b981' }}
              animate={{ scale: 1, color: '#f4f4f5' }}
              className="text-2xl font-bold tabular-nums"
            >
              {score}
            </motion.p>
          </div>
          <button 
            onClick={clearBalls}
            className="p-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 transition-colors border border-zinc-700"
            title="Reset Game"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="flex-1 flex relative">
        {/* Sidebar Controls */}
        <aside className="w-72 border-r border-zinc-800 bg-zinc-900/30 p-6 flex flex-col gap-8 z-10">
          <section>
            <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Simulation</h2>
            <div className="flex flex-col gap-4">
              <button 
                onClick={() => setIsPaused(!isPaused)}
                className={`w-full py-3 rounded-xl flex items-center justify-center gap-2 font-medium transition-all ${
                  isPaused ? 'bg-emerald-500 text-zinc-950 shadow-lg shadow-emerald-500/20' : 'bg-zinc-800 text-zinc-100 border border-zinc-700'
                }`}
              >
                {isPaused ? <Play className="w-4 h-4 fill-current" /> : <Pause className="w-4 h-4 fill-current" />}
                {isPaused ? 'Resume' : 'Pause'}
              </button>
              
              <button 
                onClick={spawnBall}
                className="w-full py-3 rounded-xl bg-zinc-100 text-zinc-950 hover:bg-white transition-all flex items-center justify-center gap-2 font-medium"
              >
                <Plus className="w-4 h-4" />
                Spawn Ball
              </button>
            </div>
          </section>

          <section className="flex flex-col gap-6">
            <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Environment</h2>
            
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">Gravity</span>
                <span className="font-mono text-emerald-400">{gravity.toFixed(2)}</span>
              </div>
              <input 
                type="range" min="0" max="1" step="0.01" 
                value={gravity} onChange={(e) => setGravity(parseFloat(e.target.value))}
                className="w-full accent-emerald-500 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">Friction</span>
                <span className="font-mono text-emerald-400">{friction.toFixed(3)}</span>
              </div>
              <input 
                type="range" min="0.9" max="1" step="0.001" 
                value={friction} onChange={(e) => setFriction(parseFloat(e.target.value))}
                className="w-full accent-emerald-500 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">Elasticity</span>
                <span className="font-mono text-emerald-400">{bounce.toFixed(2)}</span>
              </div>
              <input 
                type="range" min="0" max="1.2" step="0.01" 
                value={bounce} onChange={(e) => setBounce(parseFloat(e.target.value))}
                className="w-full accent-emerald-500 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </section>

          <div className="mt-auto p-4 rounded-2xl bg-zinc-800/50 border border-zinc-700/50">
            <p className="text-[10px] text-zinc-500 uppercase font-mono mb-2">Instructions</p>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Click on the canvas to push balls away. Adjust sliders to change physics in real-time.
            </p>
          </div>
        </aside>

        {/* Game Canvas */}
        <div ref={containerRef} className="flex-1 bg-zinc-950 cursor-crosshair relative">
          <canvas 
            ref={canvasRef} 
            onClick={handleCanvasClick}
            className="w-full h-full block"
          />
          
          <AnimatePresence>
            {ballsRef.current.length === 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
              >
                <div className="text-center">
                  <p className="text-zinc-500 font-mono text-sm mb-4">CANVAS EMPTY</p>
                  <button 
                    onClick={spawnBall}
                    className="pointer-events-auto px-8 py-4 rounded-2xl bg-emerald-500 text-zinc-950 font-bold text-lg shadow-2xl shadow-emerald-500/40 hover:scale-105 transition-transform"
                  >
                    START SIMULATION
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Footer Stats */}
      <footer className="p-4 border-t border-zinc-800 bg-zinc-900/50 flex items-center justify-between px-8">
        <div className="flex gap-8">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-mono text-zinc-500">Active Balls: {ballsRef.current.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-xs font-mono text-zinc-500">Particles: {particlesRef.current.length}</span>
          </div>
        </div>
        <div className="text-xs font-mono text-zinc-600">
          Built with React + Canvas API
        </div>
      </footer>
    </div>
  );
}
