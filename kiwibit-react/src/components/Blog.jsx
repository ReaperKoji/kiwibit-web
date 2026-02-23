import React from 'react';

export default function Blog() {
    return (
        <>
            <section className="py-40 px-8" id="blog">
                <div className="max-w-[1600px] mx-auto">
                    <div className="flex flex-col mb-24">
                        <span className="text-[9px] font-mono text-white/30 uppercase tracking-[0.4em] mb-4">Section_03 //
                            RESEARCH_LOGS</span>
                        <div className="flex flex-col md:flex-row items-end justify-between gap-10">
                            <h2 className="text-white text-6xl font-black tracking-tighter uppercase leading-none">Blog</h2>
                            <span
                                className="text-white/20 text-[10px] font-bold tracking-ultra uppercase flex items-center gap-4">
                                <span className="w-12 h-px bg-white/20"></span>
                                Latest Intelligence
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-12">
                        {/* Blog Card 1 */}
                        <a href="#"
                            className="w-full group block border border-black/10 bg-white hover:bg-zinc-50 transition-all duration-500 hover:shadow-2xl shadow-black/50 p-8 relative flex flex-col h-full">
                            <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="material-symbols-outlined text-black/40">arrow_outward</span>
                            </div>
                            <div className="mb-12 flex justify-between items-start">
                                <span
                                    className="bg-black text-white text-[9px] font-black px-2 py-1 uppercase tracking-widest">ZERO_DAY</span>
                                <span className="text-[10px] font-mono text-black/40 block">0xFE_24.02.2026</span>
                            </div>
                            <h3
                                className="text-black text-2xl font-black uppercase tracking-tight mb-4 group-hover:text-black/80 transition-colors">
                                Bypassing EDR Heuristics with Polymorphic Payloads
                            </h3>
                            <p className="text-[12px] text-black/60 font-light leading-relaxed mb-8 flex-grow">
                                An in-depth analysis of modern Endpoint Detection and Response systems and how novel
                                polymorphic compilation techniques can reliably evade user-land hooking.
                            </p>
                            <div className="w-full h-px bg-black/10 mt-auto"></div>
                        </a>

                        {/* Blog Card 2 */}
                        <a href="#"
                            className="w-full group block border border-black/10 bg-white hover:bg-zinc-50 transition-all duration-500 hover:shadow-2xl shadow-black/50 p-8 relative flex flex-col h-full">
                            <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="material-symbols-outlined text-black/40">arrow_outward</span>
                            </div>
                            <div className="mb-12 flex justify-between items-start">
                                <span
                                    className="bg-black text-white text-[9px] font-black px-2 py-1 uppercase tracking-widest">INFRA</span>
                                <span className="text-[10px] font-mono text-black/40 block">0xFD_18.02.2026</span>
                            </div>
                            <h3
                                className="text-black text-2xl font-black uppercase tracking-tight mb-4 group-hover:text-black/80 transition-colors">
                                Architecting Multi-Cloud Zero-Trust Mesh
                            </h3>
                            <p className="text-[12px] text-black/60 font-light leading-relaxed mb-8 flex-grow">
                                Standard VPNs are obsolete. We explore the architectural paradigm shift towards
                                identity-aware overlay networks spanning across AWS, GCP, and on-premise iron.
                            </p>
                            <div className="w-full h-px bg-black/10 mt-auto"></div>
                        </a>

                        {/* Blog Card 3 */}
                        <a href="#"
                            className="w-full group block border border-black/10 bg-white hover:bg-zinc-50 transition-all duration-500 hover:shadow-2xl shadow-black/50 p-8 relative flex flex-col h-full">
                            <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="material-symbols-outlined text-black/40">arrow_outward</span>
                            </div>
                            <div className="mb-12 flex justify-between items-start">
                                <span
                                    className="bg-black text-white text-[9px] font-black px-2 py-1 uppercase tracking-widest">BUG_BOUNTY</span>
                                <span className="text-[10px] font-mono text-black/40 block">0xFC_10.02.2026</span>
                            </div>
                            <h3
                                className="text-black text-2xl font-black uppercase tracking-tight mb-4 group-hover:text-black/80 transition-colors">
                                Chaining Logic Flaws for Remote Code Execution
                            </h3>
                            <p className="text-[12px] text-black/60 font-light leading-relaxed mb-8 flex-grow">
                                A breakdown of our recent bounty submission where three low-impact logic flaws were
                                weaponized together to achieve unauthenticated RCE on a major payment gateway.
                            </p>
                            <div className="w-full h-px bg-black/10 mt-auto"></div>
                        </a>
                    </div>

                    <div className="mt-16 text-center">
                        <a href="#"
                            className="inline-block border border-white/20 text-white px-12 py-5 text-[10px] font-bold uppercase tracking-widest hover:bg-white hover:text-black transition-all">
                            View All Transmissions
                        </a>
                    </div>
                </div>
            </section>
            <div className="section-divider"></div>
        </>
    );
}
