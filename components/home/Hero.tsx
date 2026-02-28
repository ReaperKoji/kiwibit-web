 'use client';

 import { useEffect, useRef } from 'react';

 type GridCell = {
     offset: number;
     flicker: number;
 };

 type GridState = {
     cellSize: number;
     cols: number;
     rows: number;
     cells: GridCell[];
 };

 type BinaryColumn = {
     x: number;
     y: number;
     speed: number;
 };

export default function Hero() {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

     useEffect(() => {
         const canvasEl = canvasRef.current;
         if (!canvasEl) return;
         const canvas = canvasEl;

         const ctx = canvas.getContext('2d');
         if (!ctx) return;
         const context = ctx;

         let width = window.innerWidth;
         let height = window.innerHeight;
        let rafId: number | null = null;

         let dpr = 1;

         function resize() {
             width = window.innerWidth;
             height = window.innerHeight;
             dpr = Math.max(window.devicePixelRatio || 1, 1);
             canvas.style.width = width + 'px';
             canvas.style.height = height + 'px';
             canvas.width = Math.floor(width * dpr);
             canvas.height = Math.floor(height * dpr);
             context.setTransform(dpr, 0, 0, dpr, 0, 0);
         }

        function setupGrid(): GridState {
             const cellSize = Math.max(28, Math.floor(Math.min(width, height) / 24));
             const cols = Math.ceil(width / cellSize);
             const rows = Math.ceil(height / cellSize);

             const cells = new Array(cols * rows).fill(0).map(() => ({
                 offset: Math.random() * Math.PI * 2,
                 flicker: Math.random() * 0.6 + 0.2,
             }));

             return { cellSize, cols, rows, cells };
         }

        function setupBinaryColumns(): BinaryColumn[] {
             const count = Math.max(36, Math.floor(width / 22));
             return Array.from({ length: count }).map(() => ({
                 x: Math.random() * width,
                 y: Math.random() * height,
                 speed: 20 + Math.random() * 40,
             }));
         }

         let grid = setupGrid();
         let binaryColumns = setupBinaryColumns();

         function draw() {
             context.clearRect(0, 0, width, height);

             const t = performance.now() * 0.001;
             const { cellSize, cols, rows, cells } = grid;

             // =============================
             // GRID ORIGINAL (intacto)
             // =============================
             for (let y = 0; y < rows; y++) {
                 for (let x = 0; x < cols; x++) {
                     const idx = y * cols + x;
                     const c = cells[idx];
                     const px = x * cellSize;
                     const py = y * cellSize;

                     const base = (x + y) % 2 === 0;
                     const flick = 0.5 + Math.sin(t * 6 + c.offset) * 0.5 * c.flicker;
                     const mix = Math.min(Math.max(flick, 0), 1);
                     const isWhite = base ? mix > 0.45 : mix < 0.55;

                     context.fillStyle = isWhite
                         ? 'rgba(255,255,255,0.9)'
                         : 'rgba(0,0,0,0.9)';

                     context.fillRect(px, py, cellSize + 1, cellSize + 1);
                 }
             }

             // =============================
             // BINARIO SUAVE NO FUNDO
             // =============================
             context.save();
             context.globalAlpha = 0.07;
             context.font = '14px monospace';
             context.fillStyle = '#ffffff';

            binaryColumns.forEach((col) => {
                 const binaryChar = Math.random() > 0.5 ? '0' : '1';

                 context.fillText(binaryChar, col.x, col.y);

                 col.y += col.speed * 0.016;

                 if (col.y > height) {
                     col.y = -20;
                     col.x = Math.random() * width;
                 }
             });

             context.restore();

             // =============================
             // SCANLINES SUTIS
             // =============================
             context.save();
             context.globalAlpha = 0.04;
             context.fillStyle = '#ffffff';
             for (let i = 0; i < height; i += 4) {
                 context.fillRect(0, i, width, 1);
             }
             context.restore();

             // =============================
             // GLITCH DISCRETO
             // =============================
             if (Math.random() > 0.985) {
                 const sliceY = Math.random() * height;
                 const sliceH = Math.random() * 20 + 5;

                 context.drawImage(
                    canvas,
                     0,
                     sliceY,
                     width,
                     sliceH,
                     Math.random() * 10 - 5,
                     sliceY,
                     width,
                     sliceH
                 );
             }

             rafId = requestAnimationFrame(draw);
         }

         function handleResize() {
             resize();
             grid = setupGrid();
             binaryColumns = setupBinaryColumns();
         }

         function handleVisibilityChange() {
             if (document.hidden) {
                 if (rafId) {
                     cancelAnimationFrame(rafId);
                     rafId = null;
                 }
                 return;
             }

             if (!rafId) {
                 rafId = requestAnimationFrame(draw);
             }
         }

         resize();
         window.addEventListener('resize', handleResize);
         document.addEventListener('visibilitychange', handleVisibilityChange);
         rafId = requestAnimationFrame(draw);

         return () => {
             window.removeEventListener('resize', handleResize);
             document.removeEventListener('visibilitychange', handleVisibilityChange);
             if (rafId) cancelAnimationFrame(rafId);
         };
     }, []);

     return (
         <>
             <section className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden architectural-grid bg-black">

                 <canvas
                     ref={canvasRef}
                     className="absolute inset-0 w-full h-full pointer-events-none z-0"
                 />

                 <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-black z-0"></div>

                 <div className="relative z-10 max-w-[1400px] mx-auto px-8 text-center">
                     <h1 className="text-white text-5xl md:text-[8rem] font-[900] leading-[0.8] tracking-tightest mb-16 uppercase">
                         KIWIBIT
                     </h1>

                     <div className="flex flex-col sm:flex-row items-center justify-center gap-10">
                         <button
                             className="w-full sm:w-auto bg-white text-black px-14 py-7 text-[11px] font-black uppercase tracking-ultra hover:bg-zinc-200 transition-colors"
                         >
                             Explore Services
                         </button>

                         <button
                             className="w-full sm:w-auto border border-white/10 px-14 py-7 text-[11px] font-bold uppercase tracking-ultra hover:border-white/40 transition-all text-white/50 hover:text-white"
                         >
                             View Portfolio
                         </button>
                     </div>
                 </div>
             </section>

             <div className="section-divider"></div>
         </>
     );
 }
