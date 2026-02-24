
import React, { useState, useEffect, useRef } from 'react';
import { Button } from './Button';
import { GameState } from '../types';
import { soundManager } from '../services/soundManager';
import { CutsceneOverlay } from './CutsceneOverlay';

interface PracticeModeProps {
    onBack: () => void;
    gameState: GameState;
}

export const PracticeMode: React.FC<PracticeModeProps> = ({ onBack, gameState }) => {
    const [phase, setPhase] = useState<'WARMUP' | 'GAME' | 'RESULTS'>('WARMUP');
    const [isPlaying, setIsPlaying] = useState(false);
    const [score, setScore] = useState(0);
    const [targetPos, setTargetPos] = useState(50);
    const [cursorPos, setCursorPos] = useState(0);
    const [direction, setDirection] = useState(1);
    const [speed, setSpeed] = useState(1.5);
    const [hits, setHits] = useState(0);
    const [gameMessage, setGameMessage] = useState("HIT SPACE IN THE GREEN ZONE!");
    
    const requestRef = useRef<number>(0);

    const handleWarmupComplete = () => {
        setPhase('GAME');
    };

    const startGame = () => {
        setIsPlaying(true);
        setScore(0);
        setHits(0);
        setSpeed(1.5);
        setCursorPos(0);
        setTargetPos(20 + Math.random() * 60); // Random target between 20-80
        setGameMessage("FOCUS!");
    };

    const gameLoop = () => {
        setCursorPos(prev => {
            let next = prev + (direction * speed);
            if (next >= 100 || next <= 0) {
                setDirection(d => d * -1);
                next = Math.max(0, Math.min(100, next));
            }
            return next;
        });
        requestRef.current = requestAnimationFrame(gameLoop);
    };

    useEffect(() => {
        if (phase === 'GAME') {
            if (isPlaying) {
                requestRef.current = requestAnimationFrame(gameLoop);
            } else {
                cancelAnimationFrame(requestRef.current);
            }
        }
        return () => cancelAnimationFrame(requestRef.current);
    }, [isPlaying, direction, speed, phase]);

    const handleHit = () => {
        if (!isPlaying) return;

        const distance = Math.abs(cursorPos - targetPos);
        if (distance < 10) {
            // Success
            soundManager.playSuccess();
            setScore(s => s + 100);
            setHits(h => h + 1);
            setSpeed(s => Math.min(4, s + 0.2)); // Get faster
            setTargetPos(20 + Math.random() * 60); // Move target
            setGameMessage("PERFECT!");
        } else {
            // Miss
            soundManager.playError();
            setGameMessage("MISSED! TRY AGAIN.");
            setSpeed(1.5); // Reset speed penalty
        }
    };

    // Keyboard listener for Spacebar
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Space' && phase === 'GAME') {
                e.preventDefault(); // Prevent scrolling
                if (isPlaying) handleHit();
                else startGame();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isPlaying, cursorPos, targetPos, phase]);

    const finishSession = () => {
        setIsPlaying(false);
        setPhase('RESULTS');
    };

    if (phase === 'WARMUP') {
        return (
            <CutsceneOverlay 
                data={{
                    id: 'practice_warmup',
                    type: 'PRACTICE',
                    text: 'Warm Up',
                    duration: 99999 // Managed by user interaction
                }} 
                onComplete={handleWarmupComplete} 
            />
        );
    }

    if (phase === 'RESULTS') {
        return (
            <div className="h-full bg-slate-900 text-white flex flex-col items-center justify-center font-mono">
                <h1 className="text-4xl text-green-400 mb-4">SESSION COMPLETE</h1>
                <div className="text-2xl mb-8">Final Score: {score}</div>
                <p className="text-gray-400 mb-8">Skill Increased!</p>
                <Button onClick={onBack}>RETURN TO HUB</Button>
            </div>
        );
    }

    return (
        <div className="h-full bg-slate-900 text-white p-8 font-mono flex flex-col items-center justify-center">
            <h1 className="text-4xl text-green-400 mb-8 font-pixel">RHYTHM TUNING</h1>
            
            <div className="bg-black border-4 border-gray-500 p-8 w-full max-w-2xl text-center relative shadow-2xl">
                <div className="text-2xl font-bold mb-4 text-yellow-400">{gameMessage}</div>
                
                {/* The Bar */}
                <div className="w-full h-12 bg-gray-800 border-4 border-white relative mb-8 rounded-full overflow-hidden">
                    {/* Target Zone */}
                    <div 
                        className="absolute top-0 bottom-0 bg-green-500 opacity-80 border-x-2 border-white"
                        style={{ left: `${targetPos - 10}%`, width: '20%' }}
                    ></div>
                    
                    {/* Cursor */}
                    <div 
                        className="absolute top-0 bottom-0 w-2 bg-red-500 border-x border-black z-10"
                        style={{ left: `${cursorPos}%` }}
                    ></div>
                </div>

                <div className="flex justify-between items-center text-xl font-bold">
                    <div>SCORE: {score}</div>
                    <div>COMBO: {hits}</div>
                </div>

                {!isPlaying && (
                    <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
                        <Button onClick={startGame} className="text-xl animate-pulse">PRESS SPACE TO START</Button>
                    </div>
                )}
            </div>

            <div className="mt-8 text-center space-x-4">
                <Button onClick={handleHit} disabled={!isPlaying} className="w-64 h-24 text-2xl font-black bg-blue-600 border-blue-400 shadow-[0_8px_0_#1e3a8a] active:shadow-none active:translate-y-2 transition-all">
                    HIT! (SPACE)
                </Button>
            </div>
            
            <button onClick={finishSession} className="mt-12 text-gray-500 hover:text-white underline text-sm">
                End Practice Session
            </button>
        </div>
    );
};
