import React, { useEffect, useRef } from 'react';

export default function Hero() {
    const canvasRef = useRef(null);

    useEffect(() => {
        // Parallax logic for Hero icons / elements
        const handleMouseMove = (e) => {
            const { clientX, clientY } = e;
            const xPos = (clientX / window.innerWidth - 0.5) * 20;
            const yPos = (clientY / window.innerHeight - 0.5) * 20;

            const parallaxTargets = document.querySelectorAll('.parallax-target');
            parallaxTargets.forEach(target => {
                target.style.transform = `translate(${xPos}px, ${yPos}px)`;
            });
        };

        document.addEventListener('mousemove', handleMouseMove);
        return () => document.removeEventListener('mousemove', handleMouseMove);
    }, []);

    return (
        <>
            <section
                className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden architectural-grid">
                <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-black"></div>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                    <div className="flame-glow flex items-center justify-center">
                        <svg className="w-[400px] h-[400px] md:w-[700px] md:h-[700px] opacity-20" viewBox="0 0 200 200"
                            xmlns="http://www.w3.org/2000/svg">
                            <path
                                d="M100 20C100 20 145 70 145 125C145 160 100 185 100 185C100 185 55 160 55 125C55 70 100 20 100 20Z"
                                fill="none" stroke="white" strokeWidth="0.5"></path>
                            <path className="animate-pulse"
                                d="M100 45C100 45 130 90 130 125C130 145 100 165 100 165C100 165 70 145 70 125C70 90 100 45 100 45Z"
                                fill="none" stroke="white" strokeWidth="0.25"></path>
                            <circle cx="100" cy="120" fill="white" r="1.5"></circle>
                        </svg>
                    </div>
                </div>
                <div className="relative z-10 max-w-[1400px] mx-auto px-8 text-center">
                    <div className="inline-flex items-center gap-4 mb-12">
                        <span className="h-px w-8 bg-white/40"></span>
                        <span className="text-[10px] font-bold tracking-[0.6em] uppercase text-white/50">Advanced AppSec & Cyber
                            Security</span>
                        <span className="h-px w-8 bg-white/40"></span>
                    </div>
                    <h1
                        className="text-white text-5xl md:text-[8rem] font-[900] leading-[0.8] tracking-tightest mb-16 uppercase">
                        KIWIBIT<br /><span className="text-outline">SECURITY</span><br />OPERATIONS
                    </h1>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-10">
                        <button
                            className="w-full sm:w-auto bg-white text-black px-14 py-7 text-[11px] font-black uppercase tracking-ultra hover:bg-zinc-200 transition-colors">
                            Explore Services
                        </button>
                        <button
                            className="w-full sm:w-auto border border-white/10 px-14 py-7 text-[11px] font-bold uppercase tracking-ultra hover:border-white/40 transition-all text-white/50 hover:text-white">
                            View Portfolio
                        </button>
                    </div>
                </div>
            </section>
            <div className="section-divider"></div>
        </>
    );
}
