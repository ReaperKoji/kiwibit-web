import React from 'react';

const teamMembers = [
    {
        name: 'GUSTAVO COSTA',
        role: '[ CYBERSEC_SPEC ]',
        desc: 'Software Engineer and Cyber Security Specialist.'
    },
    {
        name: 'PEDRO GALVÃO',
        role: '[ SYS_ANALYSIS ]',
        desc: 'Systems Analysis and Development student and Cyber Security enthusiast.'
    },
    {
        name: 'MÁRCIO SOUZA',
        role: '[ DBA_EXPERT ]',
        desc: 'Systems Analysis and Development student and Database Administrator (DBA).'
    },
    {
        name: 'PEDRO SOUZA',
        role: '[ MULTIPLATFORM ]',
        desc: 'Graduate in Multiplatform Software Development.'
    },
    {
        name: 'THIAGO MAIA',
        role: '[ COMP_SCI ]',
        desc: 'Studying Computer Science and Cyber Security.'
    },
    {
        name: 'HENRIQUE',
        role: '[ POSTGRAD_SEC ]',
        desc: 'Pursuing a postgraduate degree in Cyber Security.'
    },
    {
        name: 'ITALO BIANCHI',
        role: '[ MECHATRONICS ]',
        desc: 'Studying Mechatronics.'
    }
];

export default function Team() {
    return (
        <section className="py-40 px-8 matrix-grid-texture relative" id="team">
            <div className="max-w-[1400px] mx-auto">
                <div className="flex flex-col items-center text-center mb-32">
                    <span className="text-[9px] font-mono text-white/30 uppercase tracking-[0.4em] mb-4">Section_04 //
                        TACTICAL_OPERATIVES_MATRIX</span>
                    <h2 className="text-white text-5xl md:text-7xl font-black tracking-[0.2em] uppercase mb-6">
                        OPERATIONAL_MATRIX_V2.0</h2>
                    <div className="w-full h-px bg-white/10 max-w-4xl"></div>
                </div>
                <div className="mb-24">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-16 md:gap-24 justify-items-center">
                        {teamMembers.map((member, index) => (
                            <div key={index} className="group relative flex flex-col items-center text-center w-full max-w-[280px]">
                                <div className="relative w-40 h-40 mb-6">
                                    <div
                                        className="absolute inset-0 bg-[radial-gradient(circle,rgba(255,255,255,0.15)_0%,transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500 scale-150">
                                    </div>
                                    <div
                                        className="relative w-full h-full rounded-full p-1 border border-white/20 group-hover:border-white transition-colors duration-500">
                                        <div
                                            className="w-full h-full rounded-full border border-white/10 overflow-hidden bg-zinc-900 flex items-center justify-center">
                                            <span className="material-symbols-outlined text-white/20 text-5xl">person</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <h5 className="text-white text-xl font-black uppercase tracking-tighter">{member.name}</h5>
                                    <span className="text-[9px] font-mono text-white/60 block tracking-widest">{member.role}</span>
                                    <p
                                        className="text-[11px] text-white/40 group-hover:text-white/80 transition-all duration-500 font-mono mt-4">
                                        {member.desc}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
