
import React, { useState, useEffect, useRef } from 'react';
import { Button } from './Button';
import { Settings, GameState } from '../types';
import { soundManager } from '../services/soundManager';
import { GAME_NAME, COLORS, GAME_VERSION } from '../constants';

interface TitleScreenProps {
    onStart: (mode: 'DIRECTOR' | 'CAREER') => void;
    onLoad: (state: GameState) => void;
    hasSave: boolean;
    currentSettings: Settings;
    onSettingsChange: (settings: Settings) => void;
    onCredits: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({ onStart, onLoad, hasSave, currentSettings, onSettingsChange, onCredits }) => {
    const [showLoadMenu, setShowLoadMenu] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [saveSlots, setSaveSlots] = useState<{id: number, empty: boolean, date?: string, name?: string, mode?: string}[]>([]);
    
    // Easter Egg & Secret States
    const [careerUnlocked, setCareerUnlocked] = useState(false);
    const [eggClicks, setEggClicks] = useState(0);
    const [isRetroBowlMode, setIsRetroBowlMode] = useState(false);
    
    // Background Cycle
    const [bgIndex, setBgIndex] = useState(0);
    const [fieldPalette, setFieldPalette] = useState([COLORS[0].hex, COLORS[7].hex]); // Default Red/White

    // Konami Code Buffer
    const inputBuffer = useRef<string[]>([]);
    const KONAMI_CODE = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];

    useEffect(() => {
        // Init Sound (User interaction required usually, but we prepare)
        // Check local storage for unlock
        const unlocked = localStorage.getItem('MF_CAREER_UNLOCKED') === 'true';
        setCareerUnlocked(unlocked);

        // Start Background Cycle
        const bgInterval = setInterval(() => {
            setBgIndex(prev => (prev + 1) % 4);
            // Randomize field colors occasionally
            if (Math.random() > 0.5) {
                const c1 = COLORS[Math.floor(Math.random() * COLORS.length)].hex;
                const c2 = COLORS[Math.floor(Math.random() * COLORS.length)].hex;
                setFieldPalette([c1, c2]);
            }
        }, 8000); // 8 Seconds per slide

        // Input Listener
        const handleKeyDown = (e: KeyboardEvent) => {
            inputBuffer.current = [...inputBuffer.current, e.key].slice(-10);
            if (JSON.stringify(inputBuffer.current) === JSON.stringify(KONAMI_CODE)) {
                if (localStorage.getItem('MF_CAREER_UNLOCKED') !== 'true') {
                    localStorage.setItem('MF_CAREER_UNLOCKED', 'true');
                    setCareerUnlocked(true);
                    soundManager.playSuccess();
                    alert("CHEAT CODE ACTIVATED: CAREER MODE UNLOCKED");
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            clearInterval(bgInterval);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    // Load Save Slots when menu opens
    useEffect(() => {
        if (showLoadMenu) {
            const slots = [];
            for(let i=1; i<=3; i++) {
                try {
                    const data = localStorage.getItem(`MF_SAVE_${i}`);
                    if(data) {
                        const parsed = JSON.parse(data);
                        slots.push({ id: i, empty: false, date: parsed.lastSaveDate || 'Unknown', name: parsed.bandName || parsed.career?.playerName || 'Untitled', mode: parsed.mode });
                    } else slots.push({ id: i, empty: true });
                } catch (e) { slots.push({ id: i, empty: true }); }
            }
            setSaveSlots(slots);
        }
    }, [showLoadMenu]);

    const handleVersionClick = () => {
        const nextClicks = eggClicks + 1;
        setEggClicks(nextClicks);
        if (nextClicks === 5) {
            soundManager.playOrchestraHit();
            setIsRetroBowlMode(true);
        }
    };

    const handleLoadGame = (slotId: number) => {
        try {
            const data = localStorage.getItem(`MF_SAVE_${slotId}`);
            if (data) {
                onLoad(JSON.parse(data));
            }
        } catch (e) {
            console.error("Failed to load save", e);
        }
    };

    const renderBackground = () => {
        if (isRetroBowlMode) {
            return (
                <div className="absolute inset-0 bg-[#388e3c] flex flex-col items-center justify-center overflow-hidden">
                    {/* Retro Bowl Style Scanlines */}
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-10 bg-[length:100%_2px,3px_100%] pointer-events-none"></div>
                    
                    {/* Football Field */}
                    <div className="w-full h-full relative" style={{ backgroundImage: `repeating-linear-gradient(90deg, transparent 0%, transparent 9%, rgba(255,255,255,0.5) 9.5%, rgba(255,255,255,0.5) 10%)`, backgroundSize: '100px 100%' }}>
                        <div className="absolute top-1/2 left-0 w-full h-2 bg-white/30 transform -translate-y-1/2"></div>
                        {/* 8-bit ball */}
                        <div className="absolute top-1/2 left-1/2 w-8 h-5 bg-[#8B4513] rounded-full border-2 border-white animate-[spin_1s_linear_infinite]"></div>
                    </div>
                </div>
            );
        }

        switch (bgIndex) {
            case 0: // THE STADIUM (Marching Pattern)
                return (
                    <div className="absolute inset-0 bg-green-900 overflow-hidden flex items-center justify-center animate-fade-in">
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/grass.png')] opacity-50"></div>
                        <div className="absolute inset-0 flex flex-col justify-center gap-8 opacity-40 transform -skew-x-12 scale-110">
                            {[...Array(5)].map((_, r) => (
                                <div key={r} className="flex justify-center gap-4 animate-[march_2s_infinite]">
                                    {[...Array(20)].map((_, c) => (
                                        <div key={c} className="w-4 h-4 rounded-full shadow-lg" style={{ backgroundColor: (r+c)%2===0 ? fieldPalette[0] : fieldPalette[1] }}></div>
                                    ))}
                                </div>
                            ))}
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/80"></div>
                    </div>
                );
            case 1: // THE SHEET MUSIC
                return (
                    <div className="absolute inset-0 bg-[#e3dac9] flex items-center justify-center animate-fade-in">
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/notebook.png')] opacity-30"></div>
                        <div className="w-full h-full flex flex-col justify-center space-y-12 opacity-20">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="w-full border-y border-black h-8 relative">
                                    <div className="absolute top-2 w-full h-[1px] bg-black"></div>
                                    <div className="absolute top-4 w-full h-[1px] bg-black"></div>
                                    <div className="absolute top-6 w-full h-[1px] bg-black"></div>
                                    <div className="absolute left-0 text-6xl text-black font-serif transform -translate-y-8 animate-[slide_20s_linear_infinite]" style={{ animationDelay: `${i}s` }}>
                                        ♩ ♫ ♬ ♭ ♮ ♯
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-black/80"></div>
                    </div>
                );
            case 2: // THE INSTRUMENTS
                return (
                    <div className="absolute inset-0 bg-[#1a237e] overflow-hidden animate-fade-in">
                        <div className="absolute inset-0 opacity-10">
                            {[...Array(50)].map((_, i) => (
                                <div 
                                    key={i} 
                                    className="absolute text-6xl text-white transform animate-pulse"
                                    style={{
                                        left: `${Math.random() * 100}%`,
                                        top: `${Math.random() * 100}%`,
                                        animationDelay: `${Math.random() * 2}s`,
                                        transform: `rotate(${Math.random() * 360}deg)`
                                    }}
                                >
                                    {['🎺', '🎷', '🥁', '🚩', '🎼'][Math.floor(Math.random() * 5)]}
                                </div>
                            ))}
                        </div>
                        <div className="absolute inset-0 bg-radial-gradient from-transparent to-black"></div>
                    </div>
                );
            default: // NIGHT HYPE
                return (
                    <div className="absolute inset-0 bg-black animate-fade-in">
                        <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-blue-900 to-transparent opacity-50"></div>
                        <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 animate-[spin_60s_linear_infinite]"></div>
                        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/30 blur-[100px] rounded-full animate-pulse"></div>
                        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-yellow-600/30 blur-[100px] rounded-full animate-pulse delay-75"></div>
                    </div>
                );
        }
    };

    return (
        <div className="w-full h-full bg-black flex flex-col relative overflow-hidden font-sans select-none" onClick={() => soundManager.init()}>
            {renderBackground()}

            {/* Cinematic Vignette & Grain */}
            <div className="absolute inset-0 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/noise.png')] opacity-[0.05] z-10"></div>
            <div className="absolute inset-0 pointer-events-none bg-radial-gradient from-transparent via-black/20 to-black/90 z-20"></div>

            {/* Main Content Layer */}
            <div className="absolute inset-0 z-30 flex flex-col">
                
                {/* Header Section */}
                <div className="flex-grow flex flex-col items-center justify-center pt-20 pb-10">
                    <div className="animate-fade-in-down mb-8 text-center">
                        <p className="text-xs font-bold tracking-[0.5em] text-yellow-500 uppercase mb-2 drop-shadow-md font-mono">
                            Marktime Productions Presents
                        </p>
                        <h1 className="text-7xl md:text-9xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-400 drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)] transform -rotate-2"
                            style={{ 
                                textShadow: '0 0 30px rgba(59, 130, 246, 0.5)',
                                fontFamily: "'Press Start 2P', cursive" // Keeping the pixel font for main title authenticity
                            }}
                        >
                            {isRetroBowlMode ? "THANK YOU" : GAME_NAME.split("'")[0]}
                        </h1>
                        <h2 className="text-4xl md:text-6xl font-black text-white italic tracking-widest -mt-4 transform -rotate-2"
                            style={{ textShadow: '4px 4px 0 #ef4444' }}
                        >
                            {isRetroBowlMode ? "RETRO BOWL" : `'26 EDITION`}
                        </h2>
                    </div>

                    {/* Main Menu Buttons */}
                    <div className="flex flex-col gap-4 w-80 items-stretch animate-fade-in-up delay-300">
                        <div className="group relative">
                            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-500 rounded blur opacity-25 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
                            <button 
                                onClick={() => onStart('DIRECTOR')} 
                                className="relative w-full bg-slate-900 border border-slate-700 hover:bg-slate-800 text-white font-bold py-4 px-6 uppercase tracking-widest text-sm transition-all transform hover:scale-[1.02] flex justify-between items-center"
                            >
                                <span>Director Mode</span>
                                <span className="text-blue-400">▶</span>
                            </button>
                        </div>

                        <div className="group relative">
                            {careerUnlocked ? (
                                <>
                                    <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-pink-500 rounded blur opacity-25 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
                                    <button 
                                        onClick={() => onStart('CAREER')} 
                                        className="relative w-full bg-slate-900 border border-slate-700 hover:bg-slate-800 text-white font-bold py-4 px-6 uppercase tracking-widest text-sm transition-all transform hover:scale-[1.02] flex justify-between items-center"
                                    >
                                        <span>Career Mode</span>
                                        <span className="text-purple-400">★</span>
                                    </button>
                                </>
                            ) : (
                                <button 
                                    className="w-full bg-gray-800 border border-gray-700 text-gray-500 font-bold py-4 px-6 uppercase tracking-widest text-sm flex justify-between items-center cursor-not-allowed opacity-50"
                                    title="Unlock via achievement or Konami Code"
                                >
                                    <span>Career Mode</span>
                                    <span>🔒</span>
                                </button>
                            )}
                        </div>

                        {/* Credits Button */}
                        <div className="group relative">
                            <div className="absolute -inset-1 bg-gradient-to-r from-yellow-600 to-red-500 rounded blur opacity-25 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
                            <button 
                                onClick={onCredits}
                                className="relative w-full bg-slate-900 border border-slate-700 hover:bg-slate-800 text-white font-bold py-4 px-6 uppercase tracking-widest text-sm transition-all transform hover:scale-[1.02] flex justify-between items-center"
                            >
                                <span>Credits</span>
                                <span className="text-yellow-400">📜</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Footer / Version */}
                <div className="p-6 flex justify-between items-end text-xs font-mono text-gray-500 relative z-40">
                    <div className="flex gap-4">
                        <button className="hover:text-white transition-colors" onClick={() => setShowSettings(!showSettings)}>SETTINGS</button>
                        {hasSave && <button className="hover:text-white transition-colors" onClick={() => setShowLoadMenu(!showLoadMenu)}>LOAD GAME</button>}
                    </div>
                    <div className="text-right">
                        <span onClick={handleVersionClick} className="cursor-pointer hover:text-white transition-colors">{GAME_VERSION}</span>
                    </div>
                </div>
            </div>

            {/* SETTINGS MODAL */}
            {showSettings && (
                <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center p-8 backdrop-blur-sm animate-fade-in">
                    <div className="bg-slate-800 border-4 border-white p-8 max-w-md w-full shadow-2xl relative">
                        <h2 className="text-2xl font-black text-white mb-6 uppercase border-b-2 border-gray-600 pb-2">System Settings</h2>
                        
                        <div className="space-y-6">
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Audio Volume</label>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-white text-xs"><span>Master</span><span>{currentSettings.masterVolume}%</span></div>
                                    <input type="range" min="0" max="100" value={currentSettings.masterVolume} onChange={(e) => onSettingsChange({...currentSettings, masterVolume: parseInt(e.target.value)})} className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer" />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Graphics</label>
                                <div className="flex gap-2">
                                    {['LOW', 'MEDIUM', 'HIGH'].map(q => (
                                        <button 
                                            key={q}
                                            onClick={() => onSettingsChange({...currentSettings, graphicsQuality: q as any})}
                                            className={`flex-1 py-2 text-xs font-bold border ${currentSettings.graphicsQuality === q ? 'bg-white text-black border-white' : 'bg-transparent text-gray-500 border-gray-600'}`}
                                        >
                                            {q}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex items-center justify-between border-t border-gray-600 pt-4">
                                <span className="text-white text-sm font-bold">Retro CRT Effect</span>
                                <button 
                                    onClick={() => onSettingsChange({...currentSettings, retroMode: !currentSettings.retroMode})}
                                    className={`w-12 h-6 rounded-full p-1 transition-colors ${currentSettings.retroMode ? 'bg-green-500' : 'bg-gray-600'}`}
                                >
                                    <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${currentSettings.retroMode ? 'translate-x-6' : 'translate-x-0'}`}></div>
                                </button>
                            </div>
                        </div>

                        <div className="mt-8 flex justify-end">
                            <Button onClick={() => setShowSettings(false)} variant="secondary">CLOSE</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* LOAD GAME MODAL */}
            {showLoadMenu && (
                <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center p-8 backdrop-blur-sm animate-fade-in">
                    <div className="bg-slate-800 border-4 border-yellow-500 p-8 max-w-lg w-full shadow-2xl relative">
                        <h2 className="text-2xl font-black text-yellow-400 mb-6 uppercase border-b-2 border-yellow-600 pb-2">Load Career</h2>
                        
                        <div className="space-y-4">
                            {saveSlots.map(slot => (
                                <button
                                    key={slot.id}
                                    disabled={slot.empty}
                                    onClick={() => handleLoadGame(slot.id)}
                                    className={`w-full p-4 border-2 text-left transition-all group ${slot.empty ? 'border-gray-700 bg-gray-800 opacity-50 cursor-default' : 'border-white bg-slate-700 hover:bg-slate-600 hover:border-yellow-400'}`}
                                >
                                    <div className="flex justify-between items-center mb-1">
                                        <span className={`font-black uppercase ${slot.empty ? 'text-gray-500' : 'text-white'}`}>
                                            {slot.empty ? 'EMPTY SLOT' : `SLOT ${slot.id}: ${slot.name}`}
                                        </span>
                                        {!slot.empty && <span className="text-[10px] font-bold bg-blue-600 px-2 py-1 rounded text-white">{slot.mode}</span>}
                                    </div>
                                    {!slot.empty && <div className="text-xs text-gray-400 group-hover:text-yellow-200">Last Save: {slot.date}</div>}
                                </button>
                            ))}
                        </div>

                        <div className="mt-8 flex justify-end">
                            <Button onClick={() => setShowLoadMenu(false)} variant="secondary">CANCEL</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
