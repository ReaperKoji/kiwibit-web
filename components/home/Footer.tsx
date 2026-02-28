export default function Footer() {
    return (
        <footer className="bg-black py-32 px-8 border-t border-white/5">
            <div className="max-w-[1800px] mx-auto grid grid-cols-1 lg:grid-cols-4 gap-20">
                <div className="col-span-1 lg:col-span-2 space-y-12">
                    <div className="flex items-center gap-4">
                        <span className="material-symbols-outlined text-white text-4xl">security</span>
                        <h2 className="text-2xl font-black tracking-ultra uppercase">Kiwibit</h2>
                    </div>
                    <p className="text-white/30 text-sm leading-relaxed max-w-md">
                        An elite cybersecurity engineering collective specializing in adversarial research and defensive
                        product development for global sovereign enterprises.
                    </p>
                    <div className="flex gap-12">
                        <a className="text-white/40 hover:text-white transition-colors text-[10px] font-bold tracking-ultra uppercase"
                            href="#">X / Twitter</a>
                        <a className="text-white/40 hover:text-white transition-colors text-[10px] font-bold tracking-ultra uppercase"
                            href="#">GitHub</a>
                        <a className="text-white/40 hover:text-white transition-colors text-[10px] font-bold tracking-ultra uppercase"
                            href="#">LinkedIn</a>
                    </div>
                </div>
                <div className="space-y-10">
                    <h6 className="text-white/30 text-[10px] font-black uppercase tracking-ultra">Protocols</h6>
                    <ul className="space-y-6">
                        <li><a className="text-white/50 hover:text-white transition-all text-[11px] uppercase tracking-widest"
                            href="#">Core_Framework</a></li>
                        <li><a className="text-white/50 hover:text-white transition-all text-[11px] uppercase tracking-widest"
                            href="#">Adversarial_Labs</a></li>
                        <li><a className="text-white/50 hover:text-white transition-all text-[11px] uppercase tracking-widest"
                            href="#">Incident_Response</a></li>
                        <li><a className="text-white/50 hover:text-white transition-all text-[11px] uppercase tracking-widest"
                            href="#">Infrastructure</a></li>
                    </ul>
                </div>
                <div className="text-right space-y-10">
                    <h6 className="text-white/30 text-[10px] font-black uppercase tracking-ultra">Deployment Center</h6>
                    <div className="space-y-4">
                        <div
                            className="flex items-center justify-end gap-3 text-white/60 text-[10px] uppercase font-bold tracking-widest">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
                            ALL_NODES_LIVE
                        </div>
                        <p className="text-[9px] font-mono text-white/20">VER: 2.0.0-PROD</p>
                        <p className="text-[9px] font-mono text-white/20">SIG: 0x88AE7..B3</p>
                    </div>
                </div>
            </div>
            <div
                className="max-w-[1800px] mx-auto mt-32 pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-8">
                <p className="text-white/20 text-[9px] font-medium uppercase tracking-[0.4em]">
                    © 2026 KIWIBIT TECHNOLOGIES. DECRYPTING THE FUTURE.
                </p>
            </div>
        </footer>
    );
}
