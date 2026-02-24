
import React, { useState, useEffect } from 'react';
import { Uniform, LogoPlacement, InstrumentType } from '../types';
import { Button } from './Button';
import { COLORS } from '../constants';
import { BandMemberVisual } from './BandMemberVisual';

interface UniformEditorProps {
    uniforms: Uniform[];
    currentId: string;
    onSave: (uniforms: Uniform[], activeId: string) => void;
    onBack: () => void;
    identity?: any; // To access school colors/logos
}

export const UniformEditor: React.FC<UniformEditorProps> = ({ uniforms: initialUniforms, currentId, onSave, onBack, identity }) => {
    const [uniforms, setUniforms] = useState<Uniform[]>(initialUniforms);
    const [activeId, setActiveId] = useState(currentId);
    const [view, setView] = useState<'FRONT' | 'BACK'>('FRONT');
    
    // Decal/Logo State
    const activeIndex = uniforms.findIndex(u => u.id === activeId);
    const activeUniform = uniforms[activeIndex] || uniforms[0];

    // Initialize placement if not exists
    const [logoPlacement, setLogoPlacement] = useState<LogoPlacement>(activeUniform.logoPlacement || {
        enabled: false,
        position: 'CHEST_LEFT',
        size: 'SMALL',
        applyTo: 'UNIFORM',
        customText: '',
        xOffset: 0,
        yOffset: 0
    });

    useEffect(() => {
        setLogoPlacement(activeUniform.logoPlacement || {
            enabled: false,
            position: 'CHEST_LEFT',
            size: 'SMALL',
            applyTo: 'UNIFORM',
            customText: '',
            xOffset: 0,
            yOffset: 0
        });
    }, [activeId, activeUniform]);

    const updateUniform = (updates: Partial<Uniform>) => {
        const newUniforms = [...uniforms];
        newUniforms[activeIndex] = { ...activeUniform, ...updates };
        setUniforms(newUniforms);
    };

    const updateLogo = (updates: Partial<LogoPlacement>) => {
        const newPlacement = { ...logoPlacement, ...updates };
        setLogoPlacement(newPlacement);
        updateUniform({ logoPlacement: newPlacement });
    };

    const addNewUniform = () => {
        const newId = `u${Date.now()}`;
        const newUniform: Uniform = {
            id: newId,
            name: 'New Concept',
            jacketColor: identity?.primaryColor || '#ffffff',
            pantsColor: identity?.secondaryColor || '#ffffff',
            hatColor: identity?.primaryColor || '#000000',
            plumeColor: '#ef4444',
            accentColor: '#fbbf24',
            shoeColor: '#000000',
            gloveColor: '#ffffff',
            hatStyle: 'shako',
            jacketStyle: 'classic',
            pantsStyle: 'regular',
            isDrumMajor: false,
            capeStyle: 'none',
            hasGauntlets: false,
            hasSpats: false
        };
        setUniforms([...uniforms, newUniform]);
        setActiveId(newId);
    };

    const handleSave = () => {
        onSave(uniforms, activeId);
        onBack(); // Ensure we exit
    };

    return (
        <div className="flex h-full bg-slate-900 text-white font-mono">
            {/* Controls */}
            <div className="w-1/3 p-6 border-r border-gray-700 bg-black flex flex-col overflow-y-auto pb-32">
                <h2 className="text-2xl text-yellow-400 mb-6 border-b border-yellow-400 pb-2">UNIFORM DESIGNER</h2>
                
                <div className="mb-6">
                    <label className="text-gray-400 text-xs">SELECT PRESET</label>
                    <select 
                        className="w-full bg-gray-800 border border-gray-600 p-2 mt-1 text-lg"
                        value={activeId}
                        onChange={(e) => setActiveId(e.target.value)}
                    >
                        {uniforms.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                    <Button onClick={addNewUniform} className="w-full mt-2" variant="secondary">+ CREATE NEW</Button>
                </div>

                <div className="space-y-6 flex-grow">
                    
                    {/* DM Toggle */}
                    <div className="flex items-center justify-between bg-gray-800 p-3 border border-gray-600">
                        <span className="text-yellow-400 font-bold">DRUM MAJOR UNIFORM</span>
                        <input 
                            type="checkbox" 
                            checked={!!activeUniform.isDrumMajor}
                            onChange={(e) => updateUniform({ isDrumMajor: e.target.checked })}
                            className="w-6 h-6 accent-yellow-500"
                        />
                    </div>

                    {/* Accessories Toggle */}
                    <div className="bg-gray-900 p-3 border border-gray-700 space-y-2">
                        <label className="text-gray-400 text-xs uppercase font-bold">Accessories</label>
                        <div className="flex items-center justify-between">
                            <span className="text-sm">Gauntlets</span>
                            <input type="checkbox" checked={!!activeUniform.hasGauntlets} onChange={(e) => updateUniform({ hasGauntlets: e.target.checked })} className="accent-green-500" />
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm">Spats (Shoes)</span>
                            <input type="checkbox" checked={!!activeUniform.hasSpats} onChange={(e) => updateUniform({ hasSpats: e.target.checked })} className="accent-green-500" />
                        </div>
                    </div>

                    {/* Cape Selector */}
                    <div>
                        <label className="text-gray-400 text-xs uppercase font-bold">CAPE STYLE</label>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                            {['none', 'short', 'long', 'side'].map(style => (
                                <button
                                    key={style}
                                    className={`py-2 border text-xs uppercase font-bold ${activeUniform.capeStyle === style || (!activeUniform.capeStyle && style === 'none') ? 'bg-purple-600 border-white text-white' : 'bg-gray-800 border-gray-600 text-gray-400'}`}
                                    onClick={() => updateUniform({ capeStyle: style as any, hasCape: style !== 'none' })}
                                >
                                    {style}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Decals & Text */}
                    <div className="bg-gray-900 p-3 border border-gray-700 space-y-2">
                        <label className="text-gray-400 text-xs uppercase font-bold">Decals & Text</label>
                        <div className="flex items-center justify-between">
                            <span className="text-sm">Enable Logo</span>
                            <input type="checkbox" checked={!!logoPlacement.enabled} onChange={(e) => updateLogo({ enabled: e.target.checked })} className="accent-purple-500" />
                        </div>
                        {logoPlacement.enabled && (
                            <>
                                <select 
                                    className="w-full bg-black border border-gray-600 text-xs p-1 mt-1"
                                    value={logoPlacement.position}
                                    onChange={(e) => updateLogo({ position: e.target.value as any })}
                                >
                                    <option value="CHEST_LEFT">Chest Left</option>
                                    <option value="CHEST_CENTER">Chest Center</option>
                                    <option value="BACK">Back</option>
                                </select>
                                <div className="grid grid-cols-2 gap-2 mt-2">
                                    <div>
                                        <label className="text-[9px] text-gray-500 block">X Pos</label>
                                        <input type="range" min="-50" max="50" value={logoPlacement.xOffset || 0} onChange={(e) => updateLogo({ xOffset: parseInt(e.target.value) })} className="w-full h-1 bg-gray-600" />
                                    </div>
                                    <div>
                                        <label className="text-[9px] text-gray-500 block">Y Pos</label>
                                        <input type="range" min="-50" max="50" value={logoPlacement.yOffset || 0} onChange={(e) => updateLogo({ yOffset: parseInt(e.target.value) })} className="w-full h-1 bg-gray-600" />
                                    </div>
                                </div>
                            </>
                        )}
                        <input 
                            type="text" 
                            placeholder="Add text (e.g. BAND)" 
                            className="w-full bg-black border border-gray-600 text-xs p-1 text-white"
                            value={logoPlacement.customText || ''}
                            onChange={(e) => updateLogo({ customText: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="text-gray-400 text-xs">JACKET STYLE</label>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                             {[
                                { id: 'classic', name: 'Show Style' },
                                { id: 'hbcu_heritage', name: 'Heritage' },
                                { id: 'varsity', name: 'Varsity' },
                                { id: 'windbreaker', name: 'Warmup' },
                                { id: 'sash', name: 'Royal Sash' },
                                { id: 'vest', name: 'Summer Vest' },
                                { id: 'military', name: 'Corps Style' },
                                { id: 'tracksuit', name: 'Track Suit' },
                                { id: 'tshirt', name: 'Section Tee' },
                                { id: 'suit', name: 'Formal Suit' }
                             ].map(style => (
                                 <button 
                                    key={style.id}
                                    className={`py-2 border text-xs uppercase ${activeUniform.jacketStyle === style.id ? 'bg-green-600 border-white' : 'bg-transparent border-gray-600'}`}
                                    onClick={() => updateUniform({ jacketStyle: style.id as any })}
                                 >
                                     {style.name}
                                 </button>
                             ))}
                        </div>
                    </div>

                    <div>
                        <label className="text-gray-400 text-xs">PANTS STYLE</label>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                             {['regular', 'bibbers', 'shorts', 'slacks'].map(style => (
                                 <button 
                                    key={style}
                                    className={`py-2 border text-xs uppercase ${activeUniform.pantsStyle === style ? 'bg-green-600 border-white' : 'bg-transparent border-gray-600'}`}
                                    onClick={() => updateUniform({ pantsStyle: style as any })}
                                 >
                                     {style}
                                 </button>
                             ))}
                        </div>
                    </div>

                    <div>
                        <label className="text-gray-400 text-xs">HEADWEAR STYLE</label>
                         <div className="grid grid-cols-2 gap-2 mt-2">
                             {['shako', 'stetson', 'beret', 'cap', 'none', ...(activeUniform.isDrumMajor ? ['tall_shako', 'bearskin'] : [])].map(style => (
                                 <button 
                                    key={style}
                                    className={`py-2 border text-xs uppercase ${activeUniform.hatStyle === style ? 'bg-blue-600 border-white' : 'bg-transparent border-gray-600'}`}
                                    onClick={() => updateUniform({ hatStyle: style as any })}
                                 >
                                     {style.replace('_', ' ')}
                                 </button>
                             ))}
                        </div>
                    </div>

                    {/* Color Pickers */}
                    {['jacketColor', 'pantsColor', 'hatColor', 'plumeColor', 'accentColor', 'capeColor', 'shoeColor', 'gloveColor'].map(key => {
                        if (key === 'capeColor' && (!activeUniform.capeStyle || activeUniform.capeStyle === 'none')) return null;
                        return (
                            <div key={key}>
                                <label className="text-gray-400 text-xs uppercase">
                                    {key === 'accentColor' ? 'Secondary / Accent' : key.replace('Color', '')}
                                </label>
                                <div className="flex flex-wrap gap-2 mt-1">
                                    {COLORS.map(c => (
                                        <button 
                                            key={c.name}
                                            className={`w-8 h-8 border-2 ${activeUniform[key as keyof Uniform] === c.hex ? 'border-white scale-110 shadow' : 'border-transparent'}`}
                                            style={{ backgroundColor: c.hex }}
                                            onClick={() => updateUniform({ [key]: c.hex })}
                                            title={c.name}
                                        />
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Preview (Locker Room) */}
            <div className="flex-grow flex flex-col items-center justify-end pb-48 bg-[#b0b0b0] relative overflow-hidden border-l-4 border-black">
                {/* Locker Room Background */}
                <div className="absolute inset-0 z-0 bg-[#8c8c8c]">
                    {/* Lockers */}
                    <div className="absolute top-10 left-0 w-full h-[70%] flex justify-center gap-1">
                        {[...Array(8)].map((_, i) => (
                            <div key={i} className="w-16 h-full bg-[#555] border-2 border-[#333] relative">
                                <div className="absolute top-4 left-1/2 -translate-x-1/2 w-8 h-2 bg-[#222]"></div> {/* Vents */}
                                <div className="absolute top-8 left-1/2 -translate-x-1/2 w-8 h-2 bg-[#222]"></div>
                                <div className="absolute top-1/2 right-2 w-1 h-4 bg-gray-400"></div> {/* Handle */}
                            </div>
                        ))}
                    </div>
                    {/* Bench */}
                    <div className="absolute bottom-32 w-[80%] left-[10%] h-8 bg-[#8b4513] border-b-4 border-[#5d2e0c] shadow-lg"></div>
                    <div className="absolute bottom-20 left-[20%] w-4 h-12 bg-[#333]"></div>
                    <div className="absolute bottom-20 right-[20%] w-4 h-12 bg-[#333]"></div>
                </div>

                <div className="absolute inset-0 bg-black/20 z-0"></div>

                <h3 className="text-3xl font-black text-white drop-shadow-[4px_4px_0_rgba(0,0,0,1)] uppercase absolute top-10 z-20 bg-black/50 px-4 py-2 border-2 border-white">{activeUniform.name}</h3>
                
                <div className="relative z-10 flex gap-8 transform translate-y-20">
                    <BandMemberVisual 
                        instrument={activeUniform.isDrumMajor ? InstrumentType.MACE : InstrumentType.SNARE}
                        uniform={activeUniform}
                        appearance={{ skinColor: '#dca586', hairColor: '#000000', hairStyle: 1, bodyType: 'average', accessoryId: 0 }}
                        scale={2.5}
                        showInstrument={view === 'FRONT'}
                        logoGrid={identity?.logo}
                        view={view}
                    />
                </div>

                <div className="absolute bottom-32 flex gap-4 z-20">
                    <Button onClick={() => setView('FRONT')} className={view === 'FRONT' ? 'bg-blue-600' : 'bg-gray-600'} >FRONT</Button>
                    <Button onClick={() => setView('BACK')} className={view === 'BACK' ? 'bg-blue-600' : 'bg-gray-600'} >BACK</Button>
                </div>
                
                <div className="absolute top-8 right-8 flex gap-4 z-50">
                    <Button onClick={onBack} variant="secondary" className="px-6 py-4">CANCEL</Button>
                    <Button onClick={handleSave} variant="success" className="px-6 py-4 text-lg">SAVE TO LOCKER</Button>
                </div>
            </div>
        </div>
    );
};
