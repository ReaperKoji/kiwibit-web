import React from 'react';

export default function About() {
    return (
        <>
            <section className="py-40 px-8 max-w-[1600px] mx-auto relative" id="vision">
                <div className="flex flex-col md:flex-row justify-between items-end mb-32 gap-10">
                    <div>
                        <h2 className="text-white text-6xl font-black tracking-tighter uppercase leading-none">
                            AppSec<br />Methodology</h2>
                    </div>
                    <div className="max-w-sm text-right">
                        <p className="text-white/40 text-sm font-light leading-relaxed">Systematic fortification of digital
                            assets through architectural precision, custom automation, and offensive research.</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
                    <div
                        className="v-pillar p-12 md:p-20 flex flex-col justify-between min-h-[600px] group relative overflow-hidden">
                        <div className="absolute top-10 right-10">
                            <div className="micro-indicator"></div>
                        </div>
                        <div>
                            <span className="text-[10px] font-mono text-white/20 mb-2 block tracking-widest">PROTOCOL_ID:
                                P-772</span>
                            <span className="text-[10px] font-bold text-white/60 uppercase tracking-ultra mb-6 block">01 /
                                DEVELOPMENT</span>
                            <h3 className="text-white text-4xl font-black uppercase tracking-tight mb-8">Build</h3>
                        </div>
                        <div>
                            <p className="text-white/40 font-light leading-relaxed mb-12">
                                Secure by design. We build high-integrity platforms and applications with zero-trust
                                principles at the core. Our engineers integrate comprehensive code reviews and security
                                testing right into the CI/CD pipeline.
                            </p>
                            <div
                                className="flex items-center gap-6 group-hover:translate-x-2 transition-transform duration-500">
                                <span className="text-[9px] font-black tracking-ultra text-white/40">SEC_DEV_OPS</span>
                                <span className="material-symbols-outlined text-white/20">arrow_forward</span>
                            </div>
                        </div>
                    </div>

                    <div
                        className="v-pillar p-12 md:p-20 flex flex-col justify-between min-h-[600px] group relative bg-white/[0.01]">
                        <div className="absolute top-10 right-10">
                            <div className="micro-indicator" style={{ animationDelay: '1s' }}></div>
                        </div>
                        <div>
                            <span className="text-[10px] font-mono text-white/20 mb-2 block tracking-widest">PROTOCOL_ID:
                                P-901</span>
                            <span className="text-[10px] font-bold text-white/60 uppercase tracking-ultra mb-6 block">02 /
                                DATA_SECURITY</span>
                            <h3 className="text-white text-4xl font-black uppercase tracking-tight mb-8">Harden</h3>
                        </div>
                        <div>
                            <p className="text-white/40 font-light leading-relaxed mb-12">
                                Data is the most critical asset. We specialize in advanced database administration, securing
                                complex multiplatform environments, and implementing strict access controls to prevent data
                                exfiltration.
                            </p>
                            <div
                                className="flex items-center gap-6 group-hover:translate-x-2 transition-transform duration-500">
                                <span className="text-[9px] font-black tracking-ultra text-white/40">DATA_INTEGRITY</span>
                                <span className="material-symbols-outlined text-white/20">arrow_forward</span>
                            </div>
                        </div>
                    </div>

                    <div
                        className="v-pillar p-12 md:p-20 flex flex-col justify-between min-h-[600px] group border-r border-white/10">
                        <div className="absolute top-10 right-10">
                            <div className="micro-indicator" style={{ animationDelay: '2s' }}></div>
                        </div>
                        <div>
                            <span className="text-[10px] font-mono text-white/20 mb-2 block tracking-widest">PROTOCOL_ID:
                                P-115</span>
                            <span className="text-[10px] font-bold text-white/60 uppercase tracking-ultra mb-6 block">03 /
                                ADVERSARIAL</span>
                            <h3 className="text-white text-4xl font-black uppercase tracking-tight mb-8">Exploit</h3>
                        </div>
                        <div>
                            <p className="text-white/40 font-light leading-relaxed mb-12">
                                Validating security postures through rigorous penetration testing, IoT hardware assessment,
                                and active bug bounty participation. We simulate real-world threat actors to uncover complex
                                logic vulnerabilities.
                            </p>
                            <div
                                className="flex items-center gap-6 group-hover:translate-x-2 transition-transform duration-500">
                                <span className="text-[9px] font-black tracking-ultra text-white/40">THREAT_ACTOR</span>
                                <span className="material-symbols-outlined text-white/20">arrow_forward</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
            <div className="section-divider"></div>
        </>
    );
}
