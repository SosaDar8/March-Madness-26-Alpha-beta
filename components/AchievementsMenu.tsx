
import React from 'react';
import { GameState, Achievement } from '../types';
import { Button } from './Button';

interface AchievementsMenuProps {
    gameState: GameState;
    onBack: () => void;
}

export const AchievementsMenu: React.FC<AchievementsMenuProps> = ({ gameState, onBack }) => {
    // Filter by mode
    const modeFilter = (a: Achievement) => !a.mode || a.mode === 'BOTH' || a.mode === gameState.mode;
    const visibleAchievements = gameState.achievements.filter(modeFilter);

    return (
        <div className="h-full bg-slate-900 text-white p-8">
            <header className="flex items-center justify-between mb-8 pb-4 border-b border-gray-700">
                <h1 className="text-4xl text-yellow-500 font-mono">HALL OF FAME</h1>
                <div className="flex gap-4 items-center">
                    <div className="text-right">
                        <div className="text-xs text-gray-400">UNLOCKED</div>
                        <div className="text-2xl font-bold">{visibleAchievements.filter(a => a.unlocked).length} / {visibleAchievements.length}</div>
                    </div>
                    <Button onClick={onBack} variant="secondary">BACK</Button>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {visibleAchievements.map(ach => (
                    <div key={ach.id} className={`aspect-square p-6 flex flex-col items-center justify-center text-center border-4 transition-all ${ach.unlocked ? 'bg-yellow-900/20 border-yellow-500' : 'bg-gray-800 border-gray-700 grayscale opacity-50'}`}>
                        <div className="text-6xl mb-4">{ach.icon}</div>
                        <h3 className="text-xl font-bold mb-2">{ach.name}</h3>
                        <p className="text-sm text-gray-400">{ach.description}</p>
                        {ach.unlocked && <div className="mt-4 text-xs text-yellow-600 font-mono">{ach.dateUnlocked}</div>}
                    </div>
                ))}
            </div>
        </div>
    );
};
