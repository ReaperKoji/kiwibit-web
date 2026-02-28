'use client';

import { type MouseEvent, useEffect, useMemo, useRef, useState } from 'react';

type HomeProjectCard = {
    tag: string;
    date: string;
    title: string;
    desc: string;
    badges: string[];
    href: string;
};

type BlogApiPost = {
    slug: string;
    title: string;
    excerpt: string;
    tags?: string[];
    categories?: string[];
    publishedAt?: string;
    updatedAt: string;
};

type CarouselState = {
    pos: number;
    speed: number;
    targetPos: number;
    isHovering: boolean;
    centeringMode: boolean;
    hoveredCardIndex: number | null;
};

const fallbackProjectsData: HomeProjectCard[] = [
    {
        tag: 'ARCHITECTURE',
        date: 'LATEST',
        title: 'Zero-Trust Blueprint for Hybrid Teams',
        desc: 'How to map identities, devices, and service boundaries without creating operational drag.',
        badges: ['SECURITY', 'BLUEPRINT', 'BLOG'],
        href: '/blog'
    },
    {
        tag: 'OPERATIONS',
        date: 'LATEST',
        title: 'Incident Response Playbook Lite',
        desc: 'A pragmatic playbook for triage, containment, and post-incident learning in under 5 pages.',
        badges: ['IR', 'SOC', 'NEWS'],
        href: '/blog'
    },
    {
        tag: 'ENGINEERING',
        date: 'LATEST',
        title: 'API Hardening Checklist',
        desc: 'Minimal checklist that catches most critical API issues before deployment.',
        badges: ['API', 'CHECKLIST', 'POST'],
        href: '/blog'
    }
];

export default function Projects() {
    const [projectsData, setProjectsData] = useState(fallbackProjectsData);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const trackRef = useRef<HTMLDivElement | null>(null);
    const cardsRef = useRef<Array<HTMLDivElement | null>>([]);

    // We store mutable carousel states in refs to prevent component re-renders
    const stateRef = useRef<CarouselState>({
        pos: 0,
        speed: 1.0,
        targetPos: 0,
        isHovering: false,
        centeringMode: false,
        hoveredCardIndex: null
    });

    useEffect(() => {
        let isMounted = true;

        async function loadPostsAndNews() {
            try {
                const response = await fetch('/api/blog/posts?page=1&pageSize=8');
                if (!response.ok) return;

                const payload = (await response.json()) as { items?: BlogApiPost[] };
                const posts = Array.isArray(payload?.items) ? payload.items : [];
                const mappedPosts: HomeProjectCard[] = posts.map((post) => ({
                    tag: (post.categories?.[0] ?? 'BLOG').toUpperCase(),
                    date: new Date(post.publishedAt ?? post.updatedAt).toLocaleDateString('en-US'),
                    title: post.title,
                    desc: post.excerpt,
                    badges: [...(post.tags ?? []).slice(0, 2), 'NEWS'].map((item) => String(item).toUpperCase()),
                    href: `/blog/${post.slug}`
                }));

                if (isMounted && mappedPosts.length > 0) {
                    setProjectsData(mappedPosts);
                }
            } catch {
                // Keep fallback cards if blog API is unavailable.
            }
        }

        loadPostsAndNews();
        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => {
        const container = containerRef.current;
        const track = trackRef.current;
        const cards = cardsRef.current;
        if (!container || !track || cards.length === 0) return;

        let animationFrameId: number;

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
                    card.classList.add('scale-105', 'z-20', 'shadow-2xl');
                    card.classList.remove('scale-95', 'z-10');
                } else {
                    card.classList.add('scale-95', 'z-10');
                    card.classList.remove('scale-105', 'z-20', 'shadow-2xl');
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

    const handleCardMouseEnter = (index: number) => {
        stateRef.current.hoveredCardIndex = index;
    };

    const handleCardClick = (e: MouseEvent, index: number) => {
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
    const allProjects = useMemo(() => [...projectsData, ...projectsData], [projectsData]);

    return (
        <>
            <section className="py-40 px-8" id="portfolio">
                <div className="max-w-[1600px] mx-auto">
                    <div className="flex flex-col md:flex-row items-end justify-between mb-32">
                        <div className="flex flex-col">
                            <span className="text-[9px] font-mono text-white/30 uppercase tracking-[0.4em] mb-4">Section_02 // POSTS_AND_NEWS</span>
                            <h2 className="text-white text-6xl font-black tracking-tighter uppercase leading-none">Projects</h2>
                        </div>
                        <div className="hidden md:block">
                            <span className="text-white/20 text-[10px] font-bold tracking-ultra uppercase flex items-center gap-4">
                                <span className="w-12 h-px bg-white/20"></span>
                                Status: Latest_Updates
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
                                    ref={(el) => {
                                        cardsRef.current[idx] = el;
                                    }}
                                    onMouseEnter={() => handleCardMouseEnter(idx)}
                                    onClick={(e) => handleCardClick(e, idx)}
                                    className="carousel-card group relative border border-black/15 bg-white p-10 hover:bg-zinc-100 transition-colors duration-500 flex flex-col h-[400px] scale-95 z-10 text-black"
                                >
                                    <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-black/0 via-black/30 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                                    <div className="flex justify-between items-start mb-16">
                                        <span className="bg-zinc-100 text-black text-[9px] font-black px-3 py-1 uppercase tracking-widest rounded-sm border border-black/10">{proj.tag}</span>
                                        <span className="text-black/60 text-[10px] font-mono border border-black/15 px-2 py-1">{proj.date}</span>
                                    </div>
                                    <div className="space-y-4 mb-12 flex-grow">
                                        <h4 className="text-black text-2xl font-black uppercase tracking-tight group-hover:text-black/80 transition-colors">
                                            {proj.title}
                                        </h4>
                                        <p className="text-black/70 font-light text-sm leading-relaxed">
                                            {proj.desc}
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap gap-3 mt-auto pt-8 border-t border-black/10">
                                        {proj.badges.map((badge, bIdx) => (
                                            <span key={bIdx} className="text-[8px] text-black/60 font-bold uppercase tracking-widest">{badge}</span>
                                        ))}
                                        <a
                                            href={proj.href}
                                            target="_blank"
                                            rel="noreferrer"
                                            onClick={(event) => event.stopPropagation()}
                                            className="ml-auto text-[8px] text-black font-bold uppercase tracking-widest border border-black/20 px-2 py-1 hover:bg-black hover:text-white transition-colors"
                                        >
                                            Read Post
                                        </a>
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
