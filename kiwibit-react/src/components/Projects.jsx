import React, { useEffect, useRef, useState } from 'react';

const projectsData = [
    {
        tag: '0DAY_RESEARCH',
        date: '2026.Q1',
        title: 'V8 Engine Sandbox Escape',
        desc: 'Discovered and weaponized a novel type confusion vulnerability in the V8 Javascript engine, achieving a full sandbox escape during the Pwn2Own competition.',
        badges: ['BROWSER_EXPLOIT', 'C++', '$100K_BOUNTY']
    },
    {
        tag: 'INFRA_HARDENING',
        date: '2025.Q4',
        title: 'Project: Obsidian Mesh',
        desc: 'Architected and deployed a multi-region, zero-trust overlay network for a Tier 1 financial institution, securing over 10,000 internal nodes against lateral movement.',
        badges: ['ZERO_TRUST', 'KUBERNETES', 'EBPF']
    },
    {
        tag: 'RED_TEAM',
        date: '2025.Q3',
        title: 'Operation Ghost Wire',
        desc: 'Executed a full-scope physical and digital Red Team assessment against a national telecom infrastructure, successfully compromising logical air-gaps via custom hardware implants.',
        badges: ['PHYSICAL_SEC', 'SDR', 'IMPLANTS']
    }
];

export default function Projects() {
    const containerRef = useRef(null);
    const trackRef = useRef(null);
    const cardsRef = useRef([]);

    // We store mutable carousel states in refs to prevent component re-renders
    const stateRef = useRef({
        pos: 0,
        speed: 1.0,
        targetPos: 0,
        isHovering: false,
        centeringMode: false,
        hoveredCardIndex: null
    });

    useEffect(() => {
        const container = containerRef.current;
        const track = trackRef.current;
        const cards = cardsRef.current;
        if (!container || !track || cards.length === 0) return;

        let animationFrameId;

        const updateCarouselCenter = () => {
            const state = stateRef.current;
            const containerRect = container.getBoundingClientRect();
            const containerCenter = containerRect.left + (containerRect.width / 2);
            const trackRect = track.getBoundingClientRect();
            const maxScroll = trackRect.width / 2; // the first half

            if (!state.centeringMode) {
                if (!state.isHovering) {
                    state.pos -= state.speed;
                }
            } else {
                state.pos += (state.targetPos - state.pos) * 0.1;
                if (Math.abs(state.targetPos - state.pos) < 1) {
                    state.pos = state.targetPos;
                    state.centeringMode = false;
                }
            }

            if (state.pos <= -maxScroll) {
                state.pos += maxScroll;
                if (state.centeringMode) state.targetPos += maxScroll;
            } else if (state.pos > 0) {
                state.pos -= maxScroll;
                if (state.centeringMode) state.targetPos -= maxScroll;
            }

            track.style.transform = `translateX(${state.pos}px)`;

            cards.forEach((card, index) => {
                if (!card) return;
                const rect = card.getBoundingClientRect();
                const cardCenter = rect.left + (rect.width / 2);
                const dist = Math.abs(containerCenter - cardCenter);
                const threshold = containerRect.width / 6;

                let isHighlighted = false;
                if (state.hoveredCardIndex !== null) {
                    isHighlighted = (index === state.hoveredCardIndex);
                } else {
                    isHighlighted = (dist < threshold);
                }

                if (isHighlighted) {
                    card.classList.add('scale-105', 'z-20', 'shadow-2xl', 'opacity-100');
                    card.classList.remove('scale-95', 'z-10', 'opacity-50');
                } else {
                    card.classList.add('scale-95', 'z-10', 'opacity-50');
                    card.classList.remove('scale-105', 'z-20', 'shadow-2xl', 'opacity-100');
                }
            });

            animationFrameId = requestAnimationFrame(updateCarouselCenter);
        };

        animationFrameId = requestAnimationFrame(updateCarouselCenter);

        return () => {
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    const handleMouseEnterContainer = () => stateRef.current.isHovering = true;
    const handleMouseLeaveContainer = () => {
        stateRef.current.isHovering = false;
        stateRef.current.hoveredCardIndex = null;
    };

    const handleCardMouseEnter = (index) => {
        stateRef.current.hoveredCardIndex = index;
    };

    const handleCardClick = (e, index) => {
        e.preventDefault();
        const card = cardsRef.current[index];
        if (!containerRef.current || !card) return;

        const containerRect = containerRef.current.getBoundingClientRect();
        const containerCenter = containerRect.left + (containerRect.width / 2);
        const rect = card.getBoundingClientRect();
        const cardCenter = rect.left + (rect.width / 2);

        const diff = containerCenter - cardCenter;
        stateRef.current.targetPos = stateRef.current.pos + diff;
        stateRef.current.centeringMode = true;
    };

    // Render original and duplicate items for seamless loop
    const allProjects = [...projectsData, ...projectsData];

    return (
        <>
            <section className="py-40 px-8" id="portfolio">
                <div className="max-w-[1600px] mx-auto">
                    <div className="flex flex-col md:flex-row items-end justify-between mb-32">
                        <div className="flex flex-col">
                            <span className="text-[9px] font-mono text-white/30 uppercase tracking-[0.4em] mb-4">Section_02 // SYSTEM_DEPLOYMENTS</span>
                            <h2 className="text-white text-6xl font-black tracking-tighter uppercase leading-none">Portfolio</h2>
                        </div>
                        <div className="hidden md:block">
                            <span className="text-white/20 text-[10px] font-bold tracking-ultra uppercase flex items-center gap-4">
                                <span className="w-12 h-px bg-white/20"></span>
                                Status: Live_Environment
                            </span>
                        </div>
                    </div>

                    <div
                        ref={containerRef}
                        onMouseEnter={handleMouseEnterContainer}
                        onMouseLeave={handleMouseLeaveContainer}
                        className="relative overflow-hidden w-full group/carousel py-10"
                    >
                        <div className="absolute left-0 top-0 w-32 h-full bg-gradient-to-r from-background-dark to-transparent z-10 pointer-events-none"></div>
                        <div className="absolute right-0 top-0 w-32 h-full bg-gradient-to-l from-background-dark to-transparent z-10 pointer-events-none"></div>

                        <div ref={trackRef} className="carousel-track">
                            {allProjects.map((proj, idx) => (
                                <div
                                    key={idx}
                                    ref={(el) => (cardsRef.current[idx] = el)}
                                    onMouseEnter={() => handleCardMouseEnter(idx)}
                                    onClick={(e) => handleCardClick(e, idx)}
                                    className="carousel-card group relative border border-white/10 bg-black/50 p-10 hover:bg-zinc-900 transition-colors duration-500 flex flex-col h-[400px] scale-95 opacity-50 z-10"
                                >
                                    <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-white/0 via-white/50 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                                    <div className="flex justify-between items-start mb-16">
                                        <span className="bg-white text-black text-[9px] font-black px-3 py-1 uppercase tracking-widest rounded-sm">{proj.tag}</span>
                                        <span className="text-white/40 text-[10px] font-mono border border-white/10 px-2 py-1">{proj.date}</span>
                                    </div>
                                    <div className="space-y-4 mb-12 flex-grow">
                                        <h4 className="text-white text-2xl font-black uppercase tracking-tight group-hover:text-white/80 transition-colors">
                                            {proj.title}
                                        </h4>
                                        <p className="text-white/40 font-light text-sm leading-relaxed">
                                            {proj.desc}
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap gap-3 mt-auto pt-8 border-t border-white/5">
                                        {proj.badges.map((badge, bIdx) => (
                                            <span key={bIdx} className="text-[8px] text-white/30 font-bold uppercase tracking-widest">{badge}</span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>
            <div className="section-divider"></div>
        </>
    );
}
