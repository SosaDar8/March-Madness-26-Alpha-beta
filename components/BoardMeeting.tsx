
import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { FORMER_DIRECTORS, FIRING_REASONS, containsProfanity } from '../constants';

interface BoardMeetingProps {
    onComplete: (directorName: string, loyaltyMod: number, wantsTutorial: boolean) => void;
}

export const BoardMeeting: React.FC<BoardMeetingProps> = ({ onComplete }) => {
    const [step, setStep] = useState(0);
    const [directorName, setDirectorName] = useState("");
    const [prevDirector] = useState(() => FORMER_DIRECTORS[Math.floor(Math.random() * FORMER_DIRECTORS.length)]);
    const [reason] = useState(() => FIRING_REASONS[Math.floor(Math.random() * FIRING_REASONS.length)]);
    const [loyaltyMod] = useState(() => 0.5 + Math.random() * 0.5); // 0.5 to 1.0
    const [errorMsg, setErrorMsg] = useState("");
    const [showChoice, setShowChoice] = useState(false);

    const dialogue = [
        { speaker: "President", text: `Thank you for coming on such short notice. As you know, the university is in a state of chaos.` },
        { speaker: "President", text: `Our previous director, ${prevDirector}, was relieved of duties this morning after being caught ${reason}.` },
        { speaker: "Staff", text: `We need stability. We need a new vision. We need someone who can lead.` },
        { speaker: "Staff", text: `...Wait, you're the new applicant? What was your name again?`, isInput: true },
        { speaker: "President", text: `Right, Director ${directorName}. Well, don't get comfortable.` },
        { speaker: "President", text: `Half the band quit in protest of ${prevDirector}'s firing. Only about ${Math.floor(loyaltyMod * 100)}% of the veterans stuck around.` },
        { speaker: "Staff", text: `Good luck, Director. You'll need it.` },
        // Alumni Enters
        { speaker: "???", text: "Hold on a minute!" },
        { speaker: "Alumni", text: "I'm the Alumni Association Pres. I graduated '98, marched with the legendary Drum Major Dave.", isAlumni: true },
        { speaker: "Alumni", text: "Dave still comes back every year to act as Drum Major. He graduated decades ago but he's still out there leading the band, purely out of the love of the game.", isAlumni: true },
        { speaker: "Alumni", text: "If Dave hasn't given up on this program, neither should you. Do you need a refresher on how we run things?", isAlumni: true, isChoice: true }
    ];

    const currentLine = dialogue[step];

    const validateName = () => {
        if (!directorName) return false;
        if (containsProfanity(directorName)) {
            setErrorMsg("President: We can't put THAT on the program. Be professional.");
            return false;
        }
        return true;
    };

    const handleNext = () => {
        if (currentLine.isInput) {
            if (!validateName()) return;
            setErrorMsg("");
        }

        if (step < dialogue.length - 1) {
            setStep(step + 1);
        } else if (!currentLine.isChoice) {
            // Fallback finish if no choice
            onComplete(directorName, loyaltyMod, false);
        }
    };

    const handleChoice = (wantsTutorial: boolean) => {
        onComplete(directorName, loyaltyMod, wantsTutorial);
    };

    return (
        <div className="h-full bg-black flex items-center justify-center p-8 font-mono relative">
            {/* Background */}
            <div className="absolute inset-0 bg-[#2c1a0e] flex flex-col items-center justify-end">
                {/* Window */}
                <div className="absolute top-10 w-1/2 h-1/3 bg-[#87ceeb] border-8 border-[#1a0f08] opacity-50">
                    <div className="absolute bottom-0 w-full h-10 bg-green-800"></div>
                </div>
                
                {/* Table */}
                <div className="w-full h-1/3 bg-[#5d4037] border-t-8 border-[#3e2723] shadow-2xl relative z-10 flex justify-around items-end pb-10">
                    {/* Silhouettes */}
                    <div className="w-32 h-64 bg-black opacity-90 rounded-t-full transform -translate-y-10"></div>
                    <div className="w-40 h-72 bg-black opacity-95 rounded-t-full transform -translate-y-20 border-b-4 border-white/10"></div>
                    
                    {/* Alumni Visual */}
                    {currentLine.isAlumni && (
                        <div className="w-32 h-64 bg-blue-900 border-2 border-black rounded-t-full transform -translate-y-10 animate-bounce-in relative">
                            <div className="absolute top-4 left-1/2 -translate-x-1/2 w-20 h-20 bg-[#8d5524] rounded-full border-2 border-black"></div>
                            <div className="absolute bottom-10 w-full text-center text-white text-xs font-bold bg-black/50">CLASS OF '98</div>
                        </div>
                    )}
                    {!currentLine.isAlumni && <div className="w-32 h-64 bg-black opacity-90 rounded-t-full transform -translate-y-10"></div>}
                </div>
            </div>

            {/* Dialogue Box */}
            <div className="absolute bottom-10 w-full max-w-4xl bg-blue-900 border-4 border-white p-6 shadow-[0_0_0_4px_black] z-20 flex flex-col gap-4">
                <div className="flex justify-between items-center border-b-2 border-blue-700 pb-2 mb-2">
                    <span className={`font-bold text-xl uppercase ${currentLine.isAlumni ? 'text-green-400' : 'text-yellow-400'}`}>{currentLine.speaker}</span>
                </div>
                
                {currentLine.isInput ? (
                    <div className="flex flex-col gap-4">
                        <p className="text-white text-lg">{currentLine.text}</p>
                        <input 
                            type="text" 
                            autoFocus
                            value={directorName}
                            onChange={(e) => setDirectorName(e.target.value)}
                            placeholder="Enter Name (e.g. Smith)"
                            className="bg-black border-2 border-white p-2 text-white text-xl font-bold uppercase w-full"
                            onKeyDown={(e) => e.key === 'Enter' && directorName && handleNext()}
                        />
                        {errorMsg && <p className="text-red-400 font-bold animate-pulse">{errorMsg}</p>}
                        <div className="flex justify-end">
                            <Button onClick={handleNext} disabled={!directorName}>CONFIRM IDENTITY</Button>
                        </div>
                    </div>
                ) : currentLine.isChoice ? (
                    <div className="flex flex-col gap-4">
                        <p className="text-white text-lg">{currentLine.text}</p>
                        <div className="flex gap-4 justify-end">
                            <Button onClick={() => handleChoice(true)} variant="success">YES, SHOW ME THE ROPES (TUTORIAL)</Button>
                            <Button onClick={() => handleChoice(false)} variant="secondary">NO, I KNOW MY STUFF (SKIP)</Button>
                        </div>
                    </div>
                ) : (
                    <>
                        <p className="text-white text-lg typing-effect">{currentLine.text}</p>
                        <div className="flex justify-end mt-4">
                            <button onClick={handleNext} className="text-yellow-400 animate-pulse text-2xl">▼</button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
