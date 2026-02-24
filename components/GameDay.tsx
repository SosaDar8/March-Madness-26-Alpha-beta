
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Button } from './Button';
import { RhythmGame } from './RhythmGame';
import { GameState, EventType, InstrumentType, BandMember, WeatherCondition, MusicTrack } from '../types';
import { soundManager } from '../services/soundManager';
import { BandMemberVisual } from './BandMemberVisual';
import { DEFAULT_UNIFORMS, getSchoolSongs, getRandomAppearance, generateOpponentIdentity, RIVAL_CHANTS, GRID_SIZE } from '../constants';
import { StandBattle } from './StandBattle';

interface GameDayProps {
    gameState: GameState;
    onEndGame: (win: boolean, eventId: string, scores?: { us: number, them: number }) => void;
}

type GamePhase = 'MARCH_IN' | 'GAME_ACTIVE' | 'HALFTIME_SHOW' | 'MARCH_OUT' | 'RESULTS' | 'CONCERT_WALK' | 'BATTLE_ACTIVE';
type Quarter = 1 | 2 | 3 | 4 | 5; // 5 = OT

interface PlayerEntity {
    id: number;
    team: 'HOME' | 'AWAY';
    x: number;
    y: number;
    possession: boolean;
}

// Simulation Constants
const REAL_TIME_PER_TICK_MS = 6000; // 6 seconds per tick (slowed down)
const QUARTER_LENGTH_SECONDS = 900; // 15 mins

export const GameDay: React.FC<GameDayProps> = ({ gameState, onEndGame }) => {
    const currentEvent = gameState.schedule.find(e => e.id === gameState.activeEventId) || gameState.schedule[0];
    const isFootball = currentEvent.type === EventType.FOOTBALL_GAME || currentEvent.type === EventType.HOMECOMING;
    const isParade = currentEvent.type === EventType.PARADE;
    const isBattle = currentEvent.type === EventType.BATTLE;
    const isConcert = currentEvent.type === EventType.CONCERT;
    const isHomecoming = currentEvent.type === EventType.HOMECOMING;

    // Simulation State
    const [phase, setPhase] = useState<GamePhase>(isConcert ? 'CONCERT_WALK' : 'MARCH_IN');
    const [quarter, setQuarter] = useState<Quarter>(1);
    const [gameSeconds, setGameSeconds] = useState(QUARTER_LENGTH_SECONDS);
    const [homeScore, setHomeScore] = useState(0);
    const [awayScore, setAwayScore] = useState(0);
    const [simSpeed, setSimSpeed] = useState<1 | 2>(1);
    
    // Football Stats & Entities
    const [down, setDown] = useState(1);
    const [yardsToGo, setYardsToGo] = useState(10);
    const [ballOn, setBallOn] = useState(25); // 0-100. 0 = Home Endzone, 100 = Away Endzone.
    const [possession, setPossession] = useState<'HOME'|'AWAY'>('HOME');
    const [players, setPlayers] = useState<PlayerEntity[]>([]);
    
    // Halftime State
    const [drillFrameIndex, setDrillFrameIndex] = useState(0);
    const activeDrill = gameState.drills.find(d => d.id === gameState.activeDrillId) || gameState.drills[0];

    // Weather System
    const [weather, setWeather] = useState<WeatherCondition>('CLEAR');

    const [playDescription, setPlayDescription] = useState("Kickoff to start the game.");

    // Battle / Band State
    const [standBattleState, setStandBattleState] = useState<'NONE' | 'CHALLENGE_PENDING' | 'BATTLE_SETUP' | 'BATTLE_RESULTS'>('NONE');
    const [battleType, setBattleType] = useState<'ZERO_QUARTER' | 'FIFTH_QUARTER'>('ZERO_QUARTER');
    const [challengeText, setChallengeText] = useState("");
    const [battleOpponentScore, setBattleOpponentScore] = useState(0);
    const battleCooldown = useRef(false);
    const [isPlayingTune, setIsPlayingTune] = useState(false);
    const [tuneType, setTuneType] = useState<string>('STAND');
    const [momentum, setMomentum] = useState(50);
    const [eventLog, setEventLog] = useState<string[]>([]);
    const [paradeScroll, setParadeScroll] = useState(0);
    const [opponentScore, setOpponentScore] = useState(0); // For Battle Mode
    const [battlePhase, setBattlePhase] = useState<'INTRO' | 'OPPONENT' | 'PLAYER' | 'RESULTS'>(isBattle ? 'INTRO' : 'PLAYER');
    const [isWatchingOpponent, setIsWatchingOpponent] = useState(false);
    const [gameResult, setGameResult] = useState<'WIN'|'LOSS'|null>(null);

    // Chant Popup State
    const [activeChant, setActiveChant] = useState<string | null>(null);

    const opponentData = useMemo(() => generateOpponentIdentity(currentEvent.opponent || 'RIVAL'), [currentEvent.opponent]);

    // Check for valid field show (Drill)
    const hasFieldShow = useMemo(() => {
        return activeDrill && activeDrill.frames.length > 1; 
    }, [activeDrill]);

    // DM Uniform Logic
    const dmUniform = useMemo(() => {
        return gameState.uniforms.find(u => u.isDrumMajor) || { ...gameState.uniforms[0], isDrumMajor: true };
    }, [gameState.uniforms]);

    useEffect(() => {
        // Stop background music immediately
        soundManager.stopMusicCycle();
        soundManager.startCrowdAmbience();
        if (isHomecoming) setEventLog(l => ["HOMECOMING CROWD IS ELECTRIC!", ...l]);
        
        // Random Weather
        const rand = Math.random();
        if (rand < 0.1) setWeather('SNOW');
        else if (rand < 0.25) setWeather('RAIN');
        else if (rand < 0.4) setWeather('NIGHT');
        else setWeather('CLEAR');

        if (isConcert) {
            setTimeout(() => { if(phase === 'CONCERT_WALK') setPhase('GAME_ACTIVE'); }, 4000);
        }

        // Init players
        if (isFootball) {
            initPlayers();
        }

        return () => {
            soundManager.stopCrowdAmbience();
            soundManager.stopSequence();
            // Optional: Restart music cycle if going back to menu, but that's handled by dashboard usually
        };
    }, []);

    // Halftime Animation Loop
    useEffect(() => {
        let interval: any;
        if (phase === 'HALFTIME_SHOW' && !isWatchingOpponent && hasFieldShow) {
            interval = setInterval(() => {
                setDrillFrameIndex(prev => {
                    const next = prev + 1;
                    if (next >= activeDrill.frames.length) {
                        return 0; // Loop or stay at end
                    }
                    return next;
                });
            }, 3000); // Switch frames every 3s
        }
        return () => clearInterval(interval);
    }, [phase, isWatchingOpponent, hasFieldShow, activeDrill]);

    const initPlayers = () => {
        const p: PlayerEntity[] = [];
        // Home Team (11)
        for(let i=0; i<11; i++) {
            p.push({ id: i, team: 'HOME', x: 20, y: 10 + i*8, possession: false });
        }
        // Away Team (11)
        for(let i=0; i<11; i++) {
            p.push({ id: i+20, team: 'AWAY', x: 25, y: 10 + i*8, possession: false });
        }
        setPlayers(p);
    };

    // Simulation Loop with Speed Control
    useEffect(() => {
        if (!isFootball || phase !== 'GAME_ACTIVE' || isPlayingTune || standBattleState !== 'NONE') return;

        const interval = setInterval(() => {
            simulateFootballTick();
        }, REAL_TIME_PER_TICK_MS / simSpeed);

        return () => clearInterval(interval);
    }, [phase, isPlayingTune, standBattleState, gameSeconds, quarter, possession, down, ballOn, yardsToGo, simSpeed]);

    // Update Player Visuals when ball moves
    useEffect(() => {
        if (!isFootball) return;
        setPlayers(prev => prev.map(p => {
            // Position players relative to line of scrimmage (ballOn)
            const lineX = ballOn;
            const isOffense = p.team === possession;
            
            const offsetY = (Math.random() - 0.5) * 5; 
            const offsetX = (Math.random() * 5);

            let targetX = lineX;
            if (possession === 'HOME') {
                if (isOffense) targetX = lineX - 2 - offsetX;
                else targetX = lineX + 2 + offsetX;
            } else {
                if (isOffense) targetX = lineX + 2 + offsetX;
                else targetX = lineX - 2 - offsetX;
            }

            targetX = Math.max(5, Math.min(95, targetX));
            return { ...p, x: targetX, y: p.y + offsetY };
        }));
    }, [ballOn, possession, isFootball]);

    const addLog = (text: string) => {
        setEventLog(prev => [text, ...prev].slice(0, 50));
    };

    const simulateFootballTick = () => {
        if (Math.random() < 0.02 && !battleCooldown.current && !isPlayingTune) {
            triggerStandChallenge();
            return; 
        }

        let timeRunoff = Math.floor(Math.random() * 20) + 15; 
        let newTime = gameSeconds - timeRunoff;

        if (newTime <= 0) {
            handleQuarterEnd();
            return;
        }
        setGameSeconds(newTime);

        const isHomeOffense = possession === 'HOME';
        const homeFieldAdvantage = currentEvent.isHome ? 5 : 0;
        
        // Rebalanced difficulty logic: Base strength higher for home team
        const teamSkill = isHomeOffense ? (65 + momentum/4 + homeFieldAdvantage) : (60 + homeFieldAdvantage);
        const oppSkill = isHomeOffense ? 55 : (50 - momentum/4);
        
        let fumbleChance = 0.03;
        if (weather === 'RAIN') fumbleChance = 0.08;
        if (weather === 'SNOW') fumbleChance = 0.06;

        const dist = yardsToGo;
        let playType = 'RUN';
        if (down === 4) {
            if (ballOn > 65) playType = 'FG';
            else playType = 'PUNT';
        } else {
            if (dist > 8) playType = 'PASS';
            else playType = Math.random() > 0.5 ? 'RUN' : 'PASS';
        }

        let yardsGained = 0;
        let resultText = "";
        let turnover = false;
        let scorePoints = 0;

        if (playType === 'PUNT') {
            const puntDist = 35 + Math.floor(Math.random() * 15);
            setBallOn(100 - (ballOn + puntDist));
            setPossession(prev => prev === 'HOME' ? 'AWAY' : 'HOME');
            setDown(1);
            setYardsToGo(10);
            resultText = `4th Down. ${isHomeOffense ? 'Home' : 'Away'} punts ${puntDist} yards.`;
            addLog(resultText);
            setPlayDescription(resultText);
            return;
        }

        if (playType === 'FG') {
            let successChance = 0.8;
            if (weather === 'SNOW' || weather === 'RAIN') successChance = 0.6;
            
            if (Math.random() < successChance) {
                scorePoints = 3;
                resultText = `KICK IS GOOD! ${isHomeOffense ? 'Home' : 'Away'} FG!`;
                soundManager.playSuccess();
            } else {
                resultText = `Kick is wide left! No good.`;
                soundManager.playError();
            }
            if (scorePoints > 0) {
                if (isHomeOffense) setHomeScore(s => s + 3); else setAwayScore(s => s + 3);
            }
            resetAfterScore(isHomeOffense);
            addLog(resultText);
            setPlayDescription(resultText);
            return;
        }

        let successRoll = Math.random() * 100 + (teamSkill - oppSkill);
        
        if (Math.random() < 0.05) {
            const penalty = Math.random() > 0.5 ? "Holding" : "False Start";
            setYardsToGo(y => y + 5);
            setBallOn(b => Math.max(1, b - 5));
            resultText = `FLAG! ${penalty} on the offense. 5 yard penalty.`;
            addLog(resultText);
            setPlayDescription(resultText);
            soundManager.playWhistle();
            return;
        }

        if (playType === 'RUN') {
            yardsGained = Math.floor((Math.random() * 8) - 2); 
            if (successRoll > 70) yardsGained += Math.floor(Math.random() * 15); // Easier breakaway
            resultText = `Handoff up the middle for ${yardsGained} yards.`;
        } else {
            if (successRoll < 35) { // Harder to fail
                if (Math.random() > 0.7) {
                    yardsGained = -Math.floor(Math.random() * 8);
                    resultText = "SACKED in the backfield!";
                } else {
                    yardsGained = 0;
                    resultText = "Pass incomplete.";
                    setGameSeconds(t => t - 5);
                }
            } else {
                yardsGained = Math.floor(Math.random() * 15) + 5;
                if (successRoll > 85) yardsGained += 40; // Easier big play
                resultText = `Pass complete! Gain of ${yardsGained}.`;
            }
        }

        if (Math.random() < fumbleChance) {
            turnover = true;
            resultText = `FUMBLE! Recovered by defense! ${weather === 'RAIN' ? '(Slippery ball!)' : ''}`;
            soundManager.playDrumHit();
        } else if (playType === 'PASS' && successRoll < 15 && Math.random() < 0.3) {
            turnover = true;
            resultText = "INTERCEPTED! Turnover!";
            soundManager.playDrumHit();
        }

        if (turnover) {
            setPossession(prev => prev === 'HOME' ? 'AWAY' : 'HOME');
            setBallOn(100 - ballOn);
            setDown(1);
            setYardsToGo(10);
            addLog(resultText);
            setPlayDescription(resultText);
            return;
        }

        const newLocation = ballOn + yardsGained;
        if (newLocation >= 100) {
            scorePoints = 7;
            resultText = `TOUCHDOWN ${isHomeOffense ? 'HOME' : 'AWAY'}!!!`;
            if (isHomeOffense) {
                setHomeScore(s => s + 7);
                soundManager.playAirhorn();
            } else {
                setAwayScore(s => s + 7);
                soundManager.playWhistle();
            }
            resetAfterScore(isHomeOffense);
        } else {
            setBallOn(newLocation);
            if (yardsGained >= yardsToGo) {
                setDown(1);
                setYardsToGo(10);
                resultText += " 1ST DOWN!";
            } else {
                setDown(d => d + 1);
                setYardsToGo(y => y - yardsGained);
            }
        }

        addLog(`Q${quarter} ${formatTime(newTime)}: ${resultText}`);
        setPlayDescription(resultText);
    };

    const resetAfterScore = (scoringTeamHome: boolean) => {
        setPossession(scoringTeamHome ? 'AWAY' : 'HOME');
        setBallOn(25);
        setDown(1);
        setYardsToGo(10);
    };

    const handleQuarterEnd = () => {
        if (quarter === 1) {
            setQuarter(2);
            setGameSeconds(QUARTER_LENGTH_SECONDS);
            addLog("END OF 1ST QUARTER");
        } else if (quarter === 2) {
            setPhase('HALFTIME_SHOW');
            addLog("HALFTIME! BANDS TAKE THE FIELD.");
        } else if (quarter === 3) {
            setQuarter(4);
            setGameSeconds(QUARTER_LENGTH_SECONDS);
            addLog("END OF 3RD QUARTER. 4TH QUARTER BEGINS!");
        } else if (quarter === 4) {
            if (homeScore === awayScore) {
                setQuarter(5); 
                setGameSeconds(300);
                addLog("OVERTIME!");
            } else {
                endGame();
            }
        } else {
            endGame(); 
        }
    };

    const endGame = () => {
        setPhase('MARCH_OUT');
        setGameResult(homeScore > awayScore ? 'WIN' : 'LOSS');
        addLog(`GAME OVER. FINAL: ${homeScore} - ${awayScore}`);
    };

    const formatTime = (secs: number) => {
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const triggerStandChallenge = () => {
        const isFifth = quarter >= 3;
        setBattleType(isFifth ? 'FIFTH_QUARTER' : 'ZERO_QUARTER');
        setChallengeText(RIVAL_CHANTS[Math.floor(Math.random() * RIVAL_CHANTS.length)].replace('{bandName}', gameState.bandName).replace('{mascot}', gameState.identity.mascot));
        setStandBattleState('CHALLENGE_PENDING');
        soundManager.playWhistle();
    };

    const handleAcceptChallenge = () => {
        setStandBattleState('NONE');
        setPhase('BATTLE_ACTIVE');
        battleCooldown.current = true;
        setTimeout(() => { battleCooldown.current = false; }, 60000); 
    };

    const handleDeclineChallenge = () => {
        setStandBattleState('NONE');
        addLog("Declined stand battle. Crowd boos slightly.");
        setMomentum(m => Math.max(0, m - 5));
    };

    const handlePlayerCallout = () => {
        if (battleCooldown.current) {
            addLog("Band needs to catch their breath! (Cooldown)");
            return;
        }
        const isFifth = quarter >= 3;
        setBattleType(isFifth ? 'FIFTH_QUARTER' : 'ZERO_QUARTER');
        setPhase('BATTLE_ACTIVE');
        const typeName = isFifth ? "5th Quarter" : "Zero Quarter";
        addLog(`⚔️ You issued a ${typeName} Challenge to ${opponentData.identity.schoolName}!`);
        soundManager.playAirhorn();
        battleCooldown.current = true;
        setTimeout(() => { battleCooldown.current = false; }, 90000); 
    };

    const startShow = () => {
        if (isFootball) {
            if (phase === 'HALFTIME_SHOW') {
                if (!hasFieldShow) {
                    addLog("No Field Show ready. Watching opponent perform...");
                    setIsWatchingOpponent(true);
                    setTimeout(() => {
                        addLog(`${opponentData.identity.schoolName} finished their show. Not bad.`);
                        handleHalftimeComplete();
                    }, 5000);
                    return;
                }
                setTuneType('FIELD_SHOW');
                setIsPlayingTune(true);
            } else {
                setTuneType('STAND');
                setIsPlayingTune(true);
            }
        } else if (isBattle) {
            setPhase('BATTLE_ACTIVE');
        } else {
            setTuneType(isConcert ? 'SHOW' : 'STAND'); 
            setIsPlayingTune(true);
        }
    };

    const handleBattleWin = (reward: number) => {
        addLog(`🏆 WON THE BATTLE! THE CROWD LOVES IT!`);
        setMomentum(m => Math.min(100, m + 30));
        setHomeScore(s => s + 3);
        if(isBattle) {
            setPhase('RESULTS');
            setGameResult('WIN');
            setHomeScore(100); setAwayScore(0);
        } else {
            setPhase('GAME_ACTIVE');
        }
        soundManager.playSuccess();
    };

    const handleBattleLose = () => {
        addLog(`💀 LOST THE BATTLE. ${opponentData.identity.schoolName} takes the glory.`);
        setMomentum(m => Math.max(0, m - 20));
        if(isBattle) {
            setPhase('RESULTS');
            setGameResult('LOSS');
            setHomeScore(0); setAwayScore(100);
        } else {
            setPhase('GAME_ACTIVE');
        }
        soundManager.playError();
    };

    const handleRhythmComplete = (score: number) => {
        if (phase === 'MARCH_IN') {
            setIsPlayingTune(false);
            soundManager.stopSequence();
            addLog("March-In Complete. Taking positions.");
            setPhase('GAME_ACTIVE');
            return;
        } else if (phase === 'MARCH_OUT') {
            setIsPlayingTune(false);
            soundManager.stopSequence();
            addLog("March-Out Complete. Band dismissed.");
            setPhase('RESULTS');
            return;
        }

        setIsPlayingTune(false);
        soundManager.stopSequence();
        
        const pointsAdded = Math.floor(score / 500);
        if (isFootball) {
             setMomentum(m => Math.min(100, m + 10));
        } else {
             setHomeScore(s => s + score); 
        }

        addLog(`Performance Complete! Score: ${score}`);
        
        if (isFootball && phase === 'HALFTIME_SHOW') {
            handleHalftimeComplete();
        } else if (!isFootball && !isBattle) {
            setPhase('RESULTS');
            setGameResult('WIN'); 
        }
    };

    const handleHalftimeComplete = () => {
        setIsWatchingOpponent(false);
        setPhase('GAME_ACTIVE');
        setQuarter(3);
        setGameSeconds(QUARTER_LENGTH_SECONDS);
        addLog("Halftime over. Q3 Kickoff.");
    };

    const triggerHypeSong = () => {
        // Logic to pick a custom song if available, or default
        const customHype = gameState.musicLibrary.filter(t => t.category === 'HYPE' || t.category === 'CHANT');
        if (customHype.length > 0) {
            const track = customHype[Math.floor(Math.random() * customHype.length)];
            
            if (track.category === 'CHANT') {
                // CHANT Logic: Show text popup, instant morale boost, NO RHYTHM GAME
                setActiveChant(track.lyrics || "LET'S GO!");
                setMomentum(m => Math.min(100, m + 15));
                addLog(`📣 CHANT: ${track.title}! Morale Boost!`);
                soundManager.playDefenseChant(); // Simple audio effect
                setTimeout(() => setActiveChant(null), 3000);
            } else {
                setTuneType('STAND');
                setIsPlayingTune(true);
            }
        } else {
            setMomentum(m => Math.min(100, m + 10));
            addLog("Playing Hype Song!");
            soundManager.playDefenseChant();
        }
    };

    const renderConfetti = () => {
        if (!gameResult) return null;
        const colors = gameResult === 'WIN' 
            ? [gameState.identity.primaryColor, gameState.identity.secondaryColor, '#ffffff'] 
            : ['#555', '#333', '#111']; 
        
        return (
            <div className="absolute inset-0 pointer-events-none z-[70] overflow-hidden">
                {gameResult === 'LOSS' && <div className="absolute inset-0 bg-blue-900/30 mix-blend-multiply pointer-events-none"></div>} 
                {[...Array(50)].map((_, i) => (
                    <div 
                        key={i}
                        className={`absolute w-3 h-3 ${gameResult === 'WIN' ? 'animate-[spin_2s_linear_infinite]' : ''}`}
                        style={{
                            backgroundColor: colors[i % colors.length],
                            left: `${Math.random() * 100}%`,
                            top: `-10px`,
                            animation: `fall ${2 + Math.random() * 3}s linear infinite`,
                            animationDelay: `${Math.random() * 5}s`
                        }}
                    ></div>
                ))}
            </div>
        );
    };

    const FootballPlayer = ({ id, color, team, possession }: { id: number, color: string, team: 'HOME' | 'AWAY', possession: boolean }) => (
        <div 
            className={`relative flex flex-col items-center z-20 transition-all duration-[${3000/simSpeed}ms] ${possession ? 'z-30' : ''}`}
            style={{ animation: `bounce ${1/simSpeed}s infinite ${id * 0.1}s` }}
        >
            <div className="w-3 h-3 rounded-full border border-black z-20" style={{ backgroundColor: color }}></div>
            <div className="w-4 h-3 bg-white -mt-1 border-x border-black z-10" style={{ backgroundColor: color }}>
                <div className="absolute -left-1 top-0 w-6 h-1 bg-black/30 rounded-full"></div>
            </div>
            <div className="flex gap-0.5 mt-0">
                <div className="w-1.5 h-3 bg-gray-200 border border-black/20"></div>
                <div className="w-1.5 h-3 bg-gray-200 border border-black/20"></div>
            </div>
            {possession && (
                <div className="absolute top-2 -right-3 w-4 h-2.5 bg-[#8B4513] rounded-full border border-black rotate-[-20deg] z-40 flex items-center justify-center">
                    <div className="w-full h-[1px] bg-white/50"></div>
                    <div className="absolute h-full w-[1px] bg-white/50"></div>
                </div>
            )}
        </div>
    );

    const Cheerleader = ({ color, skirtColor }: { color: string, skirtColor: string }) => (
        <div className="relative flex flex-col items-center animate-[bounce_0.8s_infinite]">
            <div className="w-3 h-3 bg-[#dca586] rounded-full mb-0.5"></div>
            <div className="absolute -top-1 -left-3 w-3 h-3 bg-white rounded-full border border-black/10"></div>
            <div className="absolute -top-1 -right-3 w-3 h-3 bg-white rounded-full border border-black/10"></div>
            <div className="w-3 h-4 bg-white" style={{backgroundColor: color}}></div>
            <div className="w-5 h-3 bg-white border-t border-black/10" style={{backgroundColor: skirtColor, clipPath: 'polygon(0 0, 100% 0, 80% 100%, 20% 100%)'}}></div>
            <div className="flex gap-0.5">
                <div className="w-1 h-3 bg-[#dca586]"></div>
                <div className="w-1 h-3 bg-[#dca586]"></div>
            </div>
        </div>
    );

    const renderChallengeOverlay = () => (
        <div className="absolute inset-0 z-50 bg-red-900/90 flex flex-col items-center justify-center animate-bounce-in border-y-8 border-yellow-500">
            <h2 className="text-5xl font-black text-white italic drop-shadow-[4px_4px_0_black] mb-4">
                {battleType === 'FIFTH_QUARTER' ? '🔥 5TH QUARTER BATTLE 🔥' : '⚔️ ZERO QUARTER CHALLENGE ⚔️'}
            </h2>
            <div className="bg-black p-6 border-4 border-white mb-8 text-center max-w-lg">
                <div className="text-yellow-400 text-xs font-bold uppercase mb-2">RIVAL BAND SAYS:</div>
                <p className="text-2xl text-white font-mono uppercase">"{challengeText}"</p>
            </div>
            <div className="flex gap-4">
                <Button onClick={handleAcceptChallenge} variant="success" className="text-xl px-8 py-4 animate-pulse">BRING IT ON!</Button>
                <Button onClick={handleDeclineChallenge} variant="secondary" className="text-xl px-8 py-4">IGNORE THEM</Button>
            </div>
        </div>
    );

    return (
        <div className="h-full flex flex-col bg-black text-white font-mono relative">
            {renderConfetti()}

            {/* Chant Popup */}
            {activeChant && (
                <div className="absolute inset-0 z-[100] flex items-center justify-center pointer-events-none">
                    <div className="bg-black/90 border-4 border-orange-500 p-8 transform rotate-2 animate-bounce-in shadow-[0_0_50px_rgba(234,88,12,0.8)]">
                         <div className="text-white text-6xl font-black text-center uppercase tracking-tighter italic drop-shadow-xl animate-pulse">
                             {activeChant}
                         </div>
                    </div>
                </div>
            )}

            {/* BROADCAST HEADER */}
            <div className="bg-black p-4 border-b-4 border-red-600 flex justify-between items-center z-10 shadow-2xl relative overflow-hidden">
                 <div className="flex flex-col items-center z-10 w-24">
                     <div className="text-[10px] text-gray-500 uppercase tracking-widest">{gameState.identity.schoolName}</div>
                     <div className="text-5xl font-black italic text-red-500 drop-shadow-md">{homeScore}</div>
                 </div>
                 
                 <div className="text-center z-10 flex-grow">
                     <div className="bg-red-600 text-white px-3 py-0.5 text-[10px] font-black italic mb-1 inline-block">LIVE CHAMPIONSHIP</div>
                     <div className="text-4xl text-yellow-400 font-pixel">
                         {isFootball ? (
                             phase === 'HALFTIME_SHOW' ? 'HALFTIME' : 
                             phase === 'BATTLE_ACTIVE' ? 'STAND BATTLE' :
                             phase === 'MARCH_IN' ? 'PRE-GAME SHOW' :
                             phase === 'MARCH_OUT' ? 'POST-GAME SHOW' :
                             `Q${quarter} ${formatTime(gameSeconds)}`
                         ) : (
                             isConcert ? "ON STAGE" : "PARADE ROUTE"
                         )}
                     </div>
                     <div className="text-xs text-blue-300 font-bold uppercase mt-1 tracking-widest flex items-center justify-center gap-2">
                         {weather === 'RAIN' && <span>🌧️ RAINING</span>}
                         {weather === 'SNOW' && <span>❄️ SNOWING</span>}
                         {weather === 'NIGHT' && <span>🌙 NIGHT GAME</span>}
                     </div>
                     {isFootball && (
                         <div className="flex justify-center gap-4 text-xs font-bold text-gray-300 mt-1">
                             <span className={possession === 'HOME' ? 'text-yellow-400' : 'text-gray-600'}>🏈 HOME</span>
                             <span>DOWN: {down} & {yardsToGo}</span>
                             <span>BALL ON: {ballOn > 50 ? `OPP ${100-ballOn}` : `OWN ${ballOn}`}</span>
                             <span className={possession === 'AWAY' ? 'text-yellow-400' : 'text-gray-600'}>AWAY 🏈</span>
                         </div>
                     )}
                 </div>

                 <div className="flex flex-col items-center z-10 w-24">
                     <div className="text-[10px] text-gray-500 uppercase tracking-widest" style={{ color: opponentData.identity.primaryColor }}>{isFootball ? opponentData.identity.schoolName : "AUDIENCE"}</div>
                     <div className="text-5xl font-black italic text-gray-400 drop-shadow-md">{awayScore}</div>
                 </div>
            </div>

            {/* MAIN ENVIRONMENT */}
            <div className="flex-grow relative bg-[#2e7d32] overflow-hidden flex flex-col items-center justify-center">
                 {weather === 'RAIN' && <div className="rain-overlay"></div>}
                 {weather === 'SNOW' && <div className="snow-overlay"></div>}
                 {weather === 'NIGHT' && <div className="absolute inset-0 bg-blue-900/40 mix-blend-multiply pointer-events-none z-30"></div>}

                 {(phase === 'MARCH_IN' || phase === 'MARCH_OUT') && (
                     <div className="absolute inset-0 z-50">
                         <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/80 px-4 py-2 text-yellow-400 font-black uppercase text-xl z-20 border-2 border-yellow-500">
                             {phase === 'MARCH_IN' ? 'MARCHING IN' : 'MARCHING OUT'}
                         </div>
                         <RhythmGame
                            difficulty="easy"
                            onComplete={handleRhythmComplete}
                            uniform={gameState.uniforms[0]}
                            dmUniform={dmUniform}
                            members={gameState.members.slice(0,10)}
                            environment="STADIUM"
                            tuneType="CADENCE"
                            allowedCategories={['CADENCE']}
                            musicLibrary={gameState.musicLibrary}
                            instrumentDesigns={gameState.instrumentDesigns}
                         />
                     </div>
                 )}

                 {standBattleState === 'CHALLENGE_PENDING' && renderChallengeOverlay()}

                 {phase === 'BATTLE_ACTIVE' && (
                     <div className="absolute inset-0 z-50">
                         <StandBattle 
                            onWin={handleBattleWin}
                            onLose={handleBattleLose}
                            playerUniform={gameState.uniforms[0]}
                            directorTrait={gameState.director.trait}
                            identity={gameState.identity}
                            opponentName={opponentData.identity.schoolName}
                            members={gameState.members}
                         />
                     </div>
                 )}

                 {isParade ? (
                    <div className="w-full h-full bg-[#333] relative overflow-hidden flex flex-col justify-center">
                        <div className="flex gap-40 absolute w-[2000px] h-2 top-1/2 -translate-y-1/2" style={{ transform: `translateX(-${paradeScroll}px)` }}>
                            {[...Array(20)].map((_, i) => <div key={i} className="w-20 h-full bg-yellow-500 opacity-50 shadow-[0_0_10px_yellow]"></div>)}
                        </div>
                        <div className="z-20 flex gap-12 justify-center items-center scale-150">
                            <BandMemberVisual instrument={InstrumentType.MACE} uniform={dmUniform} appearance={gameState.director.appearance} isPlaying={true} maceConfig={gameState.instrumentDesigns.mace} />
                            <BandMemberVisual instrument={InstrumentType.SNARE} uniform={gameState.uniforms[0]} appearance={getRandomAppearance()} isPlaying={true} instrumentConfig={gameState.instrumentDesigns.percussion} />
                        </div>
                    </div>
                 ) : isConcert ? (
                    <div className="w-full h-full bg-[#111] flex items-center justify-center relative">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.1),_transparent)]"></div>
                        <div className="grid grid-cols-5 gap-8 scale-110">
                            {gameState.members.slice(0, 10).map(m => (
                                <BandMemberVisual 
                                    key={m.id} 
                                    instrument={m.instrument} 
                                    uniform={gameState.uniforms[0]} 
                                    appearance={m.appearance} 
                                    isPlaying={phase === 'GAME_ACTIVE' && isPlayingTune} 
                                    instrumentConfig={m.instrument.includes('BRASS') ? gameState.instrumentDesigns.brass : m.instrument.includes('WOOD') ? gameState.instrumentDesigns.woodwind : gameState.instrumentDesigns.percussion}
                                />
                            ))}
                        </div>
                    </div>
                 ) : (
                     <div className="w-full h-full relative flex items-center justify-center perspective-[1000px]">
                         <div className="absolute inset-0" 
                              style={{ 
                                  backgroundImage: `repeating-linear-gradient(90deg, transparent 0%, transparent 9%, rgba(255,255,255,0.3) 9.5%, rgba(255,255,255,0.3) 10%), repeating-linear-gradient(0deg, #2e7d32 0%, #2e7d32 50%, #388e3c 50%, #388e3c 100%)`, 
                                  backgroundSize: '100% 100%, 100px 50px' 
                              }}>
                         </div>
                         
                         {phase === 'GAME_ACTIVE' && !isPlayingTune && (
                             <div className="absolute top-10 left-1/2 -translate-x-1/2 bg-black/80 text-yellow-400 font-pixel text-center px-6 py-2 border-2 border-yellow-600 shadow-lg z-20 max-w-xl animate-pulse">
                                 {playDescription}
                             </div>
                         )}

                         {isFootball && phase === 'GAME_ACTIVE' && (
                             <div className="absolute h-full w-1 bg-blue-500 opacity-50 z-10" style={{ left: `${ballOn}%` }}></div>
                         )}
                         {isFootball && phase === 'GAME_ACTIVE' && (
                             <div className="absolute h-full w-1 bg-yellow-500 opacity-50 z-10" style={{ left: `${ballOn + (possession==='HOME'?yardsToGo:-yardsToGo)}%` }}></div>
                         )}

                         {isFootball && phase === 'GAME_ACTIVE' && (
                             <>
                                 {[1,2,3,4,5].map(i => (
                                     <div key={`cheer-top-${i}`} className="absolute top-4 z-20" style={{ left: `${20 + i * 15}%` }}>
                                         <Cheerleader color={gameState.identity.primaryColor} skirtColor={gameState.identity.secondaryColor} />
                                     </div>
                                 ))}
                                 {[1,2,3,4,5].map(i => (
                                     <div key={`cheer-bot-${i}`} className="absolute bottom-4 z-20" style={{ left: `${25 + i * 15}%` }}>
                                         <Cheerleader color={opponentData.identity.primaryColor} skirtColor={opponentData.identity.secondaryColor} />
                                     </div>
                                 ))}
                             </>
                         )}

                         {isFootball && phase !== 'HALFTIME_SHOW' && phase !== 'BATTLE_ACTIVE' && standBattleState === 'NONE' && phase !== 'MARCH_IN' && phase !== 'MARCH_OUT' && players.map(p => (
                             <div key={p.id} className="absolute transition-all ease-in-out" style={{ left: `${p.x}%`, top: `${p.y}%`, transitionDuration: `${2000/simSpeed}ms` }}>
                                 <FootballPlayer 
                                    id={p.id}
                                    color={p.team === 'HOME' ? gameState.identity.primaryColor : opponentData.identity.primaryColor} 
                                    team={p.team} 
                                    possession={p.possession} 
                                />
                             </div>
                         ))}
                         
                         {/* HALFTIME SHOW VISUALIZATION */}
                         {phase === 'HALFTIME_SHOW' && !isWatchingOpponent && hasFieldShow && (
                             <div className="absolute inset-0 z-30 pointer-events-none">
                                <div className="absolute top-4 right-4 bg-black/80 p-2 text-white text-xs border border-white">
                                    DRILL SET: {activeDrill.frames[drillFrameIndex]?.name || `Set ${drillFrameIndex + 1}`}
                                </div>
                                <div className="relative w-full h-full flex items-center justify-center">
                                    <div className="relative" style={{ width: '500px', height: '500px' }}>
                                        {activeDrill.frames[drillFrameIndex].points.map((p, i) => {
                                            const member = gameState.members.find(m => m.id === p.memberId);
                                            // Map 16x16 grid to percentage
                                            const left = (p.x / (GRID_SIZE - 1)) * 100;
                                            const top = (p.y / (GRID_SIZE - 1)) * 100;
                                            
                                            return (
                                                <div 
                                                    key={p.id}
                                                    className="absolute transition-all duration-[3000ms] ease-in-out"
                                                    style={{ 
                                                        left: `${left}%`, 
                                                        top: `${top}%`,
                                                        transform: 'translate(-50%, -50%)'
                                                    }}
                                                >
                                                    <BandMemberVisual 
                                                        instrument={member ? member.instrument : InstrumentType.TRUMPET} 
                                                        uniform={member?.instrument === InstrumentType.MACE ? dmUniform : gameState.uniforms[0]} 
                                                        appearance={member ? member.appearance : getRandomAppearance()} 
                                                        scale={0.5} 
                                                        isPlaying={true}
                                                        maceConfig={gameState.instrumentDesigns.mace}
                                                        instrumentConfig={gameState.instrumentDesigns.brass} // Simplified
                                                    />
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                             </div>
                         )}

                         {phase === 'HALFTIME_SHOW' && !isWatchingOpponent && !hasFieldShow && (
                             <div className="absolute inset-0 flex items-center justify-center z-30">
                                 <div className="grid grid-cols-5 gap-8 animate-pulse">
                                     {gameState.members.slice(0, 15).map(m => (
                                         <BandMemberVisual 
                                            key={m.id} 
                                            instrument={m.instrument} 
                                            uniform={m.instrument === InstrumentType.MACE ? dmUniform : gameState.uniforms[0]} 
                                            appearance={m.appearance} 
                                            scale={1.2} 
                                            maceConfig={gameState.instrumentDesigns.mace}
                                         />
                                     ))}
                                 </div>
                             </div>
                         )}
                         {isWatchingOpponent && (
                             <div className="absolute inset-0 z-40 bg-black/50 flex flex-col items-center justify-center">
                                 <h2 className="text-3xl text-white font-pixel mb-4 text-center">OPPONENT PERFORMING...</h2>
                                 <div className="flex gap-4 animate-pulse">
                                     {[1,2,3,4].map(i => (
                                         <BandMemberVisual key={i} instrument={InstrumentType.TRUMPET} uniform={opponentData.uniform} appearance={getRandomAppearance()} scale={1.2} isPlaying={true} />
                                     ))}
                                 </div>
                             </div>
                         )}

                         <div className="absolute top-0 left-0 w-full h-16 bg-[#222] flex flex-wrap justify-around p-1 overflow-hidden z-0 shadow-lg">
                             {[...Array(80)].map((_, i) => (
                                 <div key={i} className="w-1.5 h-2 bg-red-800 rounded-full mx-0.5 animate-pulse" style={{ animationDelay: `${Math.random()}s` }}></div>
                             ))}
                         </div>
                     </div>
                 )}

                 {isPlayingTune && phase !== 'BATTLE_ACTIVE' && phase !== 'MARCH_IN' && phase !== 'MARCH_OUT' && (
                     <div className="absolute inset-0 z-50 bg-black animate-fade-in">
                        <RhythmGame 
                            difficulty={'medium'} 
                            onComplete={handleRhythmComplete} 
                            uniform={gameState.uniforms[0]} 
                            dmUniform={dmUniform}
                            members={gameState.members.slice(0, 10)} 
                            environment={isConcert ? 'CONCERT' : isParade ? 'PARADE' : 'STADIUM'}
                            inputMode={gameState.settings.inputMode}
                            tuneType={tuneType}
                            allowedCategories={tuneType === 'FIELD_SHOW' ? ['SHOW'] : ['HYPE', 'CADENCE', 'CALLOUT']}
                            musicLibrary={gameState.musicLibrary}
                            instrumentDesigns={gameState.instrumentDesigns}
                         />
                     </div>
                 )}

                 {phase === 'RESULTS' && !isPlayingTune && (
                    <div className="absolute inset-0 z-[60] bg-black/90 flex flex-col items-center justify-center p-10 text-center animate-bounce-in">
                         <h1 className="text-7xl font-pixel text-yellow-400 mb-6 drop-shadow-lg tracking-tighter">GAME OVER</h1>
                         <div className="text-3xl text-white mb-2 uppercase">FINAL SCORE: {homeScore} - {awayScore}</div>
                         <div className="text-xl mb-8 mt-2 text-gray-300">
                             {isFootball ? (homeScore > awayScore ? "VICTORY!" : "DEFEAT") : "PERFORMANCE COMPLETE"}
                         </div>
                         <Button onClick={() => onEndGame(homeScore > awayScore, currentEvent.id, { us: homeScore, them: awayScore })} className="mt-8 bg-green-600 border-green-400">LEAVE FIELD</Button>
                    </div>
                 )}
            </div>

            {/* INTERACTION BAR */}
            <div className="bg-black p-4 h-32 flex gap-4 border-t-4 border-gray-800 z-20 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
                 <div className="flex-grow bg-[#050505] p-3 border-2 border-gray-700 overflow-y-auto text-[11px] text-gray-400 custom-scrollbar font-mono leading-relaxed">
                     {eventLog.map((log, i) => <div key={i} className={i === 0 ? "text-white font-bold" : "opacity-60"}>{`> ${log}`}</div>)}
                 </div>
                 <div className="flex gap-2 w-80 relative">
                     {phase !== 'GAME_ACTIVE' && phase !== 'HALFTIME_SHOW' && phase !== 'RESULTS' && phase !== 'CONCERT_WALK' && phase !== 'BATTLE_ACTIVE' && (
                         <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-30 text-xs font-bold text-red-500 border-2 border-red-500">
                             WAITING...
                         </div>
                     )}
                     
                     <Button 
                        onClick={startShow} 
                        disabled={isPlayingTune || battlePhase === 'OPPONENT' || isWatchingOpponent || phase === 'BATTLE_ACTIVE'} 
                        className={`h-full flex-grow text-sm border-2 ${isFootball && phase !== 'HALFTIME_SHOW' ? 'bg-blue-900 border-blue-500 hover:bg-blue-800' : 'bg-red-700 border-red-500 hover:bg-red-600'}`}
                     >
                         {isBattle ? "START BATTLE" 
                          : isFootball ? (phase === 'HALFTIME_SHOW' ? (isWatchingOpponent ? "WATCHING..." : "PERFORM FIELD SHOW") : "PLAY STAND TUNE") 
                          : "PERFORM SHOW"}
                     </Button>
                     {isFootball && (
                         <div className="flex flex-col gap-1 flex-1">
                            <div className="flex gap-1">
                                <Button onClick={() => { soundManager.playDefenseChant(); setMomentum(m => Math.min(100, m + 5)); addLog("DEFENSE! DEFENSE!"); }} className="flex-1 text-[9px] bg-blue-900 border-blue-500 px-1" disabled={phase === 'HALFTIME_SHOW' || phase === 'BATTLE_ACTIVE'}>DEFENSE</Button>
                                <Button onClick={() => setSimSpeed(s => s === 1 ? 2 : 1)} className={`w-8 text-[10px] border px-0 ${simSpeed === 2 ? 'bg-green-500 text-black border-white' : 'bg-gray-700 border-gray-500'}`} disabled={phase !== 'GAME_ACTIVE'}>{simSpeed}x</Button>
                            </div>
                            <Button onClick={triggerHypeSong} className="flex-1 text-[10px] bg-yellow-600 border-yellow-400" disabled={phase === 'HALFTIME_SHOW' || phase === 'BATTLE_ACTIVE'}>CHANT / HYPE</Button>
                            <Button onClick={handlePlayerCallout} className="flex-1 text-[10px] bg-red-800 border-red-600 hover:bg-red-700" disabled={phase === 'HALFTIME_SHOW' || standBattleState !== 'NONE' || phase === 'BATTLE_ACTIVE'}>CALLOUT!</Button>
                         </div>
                     )}
                 </div>
            </div>
        </div>
    );
};
