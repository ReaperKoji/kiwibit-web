import React from 'react';

export default function Header() {
    return (
        <header className="fixed top-0 z-[100] w-full border-b border-white/5 bg-black/60 backdrop-blur-2xl">
            <div className="max-w-[1800px] mx-auto px-8 h-20 flex items-center justify-between">
                <div className="flex items-center gap-6">
                    <div className="relative flex items-center justify-center">
                        <div className="w-10 h-10 rounded-full overflow-hidden border border-white/20 bg-black/50">
                            <img src="/Kiwi.png" alt="Kiwibit Logo" className="w-full h-full object-cover" />
                        </div>
                    </div>
                    <div className="flex flex-col">
                        <h1 className="text-xl font-black tracking-ultra uppercase leading-none">Kiwibit</h1>
                    </div>
                </div>
                <nav className="hidden lg:flex items-center gap-12">
                    <a className="text-[10px] font-bold hover:text-white transition-all uppercase tracking-widest text-white/40"
                        href="#vision">AppSec</a>
                    <a className="text-[10px] font-bold hover:text-white transition-all uppercase tracking-widest text-white/40"
                        href="#portfolio">Projects</a>
                    <a className="text-[10px] font-bold hover:text-white transition-all uppercase tracking-widest text-white/40"
                        href="#blog">Blog</a>
                    <a className="text-[10px] font-bold hover:text-white transition-all uppercase tracking-widest text-white/40"
                        href="#team">Team</a>
                </nav>
                <div className="flex items-center gap-6">
                    <div className="hidden xl:block text-right">
                        <p className="text-[8px] font-mono text-white/30 uppercase">Local Time: 14:02:44</p>
                        <p className="text-[8px] font-mono text-white/30 uppercase">Lat: 37.7749 N</p>
                    </div>
                    <button
                        className="bg-white text-black text-[10px] font-black uppercase tracking-widest px-8 py-3 hover:bg-zinc-200 transition-all">
                        Login
                    </button>
                </div>
            </div>
        </header>
    );
}
