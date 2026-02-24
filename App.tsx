
import React, { useState, useEffect, useRef } from 'react';
import { Dashboard } from './components/Dashboard';
import { FormationEditor } from './components/FormationEditor';
import { StandBattle } from './components/StandBattle';
import { Management } from './components/Management'; 
import { BandOffice } from './components/BandOffice'; 
import { RecruitmentMenu } from './components/RecruitmentMenu'; 
import { Customization } from './components/Customization';
import { Tutorial } from './components/Tutorial';
import { AvatarEditor } from './components/AvatarEditor';
import { UniformEditor } from './components/UniformEditor';
import { LogoEditor } from './components/LogoEditor';
import { InstrumentDesigner } from './components/InstrumentDesigner';
import { GameDay } from './components/GameDay';
import { PracticeMode } from './components/PracticeMode';
import { TitleScreen } from './components/TitleScreen';
import { QuestMenu } from './components/QuestMenu';
import { AchievementsMenu } from './components/AchievementsMenu';
import { MusicLibrary } from './components/MusicLibrary';
import { BandMedia } from './components/BandMedia';
import { VideoApp } from './components/VideoApp';
import { MomentsGallery } from './components/MomentsGallery';
import { CareerSetup } from './components/CareerSetup';
import { CareerHub } from './components/CareerHub';
import { PepTalk } from './components/PepTalk';
import { LoadingScreen } from './components/LoadingScreen';
import { PhoneUI } from './components/PhoneUI';
import { CutsceneOverlay } from './components/CutsceneOverlay';
import { BookerStore } from './components/BookerStore';
import { CampusMap } from './components/CampusMap';
import { AdvisorOffice } from './components/AdvisorOffice';
import { Credits } from './components/Credits';
import { AuditionScene } from './components/AuditionScene';
import { AlumniHub } from './components/AlumniHub';
import { BoardMeeting } from './components/BoardMeeting';
import { DirectorWalkIn } from './components/DirectorWalkIn';
import { BusRide } from './components/BusRide';

import { GamePhase, GameState, BandStyle, BandMember, Drill, Director, BandIdentity, DirectorTrait, Uniform, Settings, CareerState, GameBuff, Transaction, Moment, Message, CutsceneData, PhoneSettings, InstrumentType, ShopItem, Job, CampusLocationId, MusicTrack, EventType, ScheduleEvent, VideoContent, Notification, SequencerTrack, SongCategory } from './types';
import { OG_MEMBERS, INITIAL_FUNDS, INITIAL_FANS, DEFAULT_APPEARANCE, DEFAULT_UNIFORMS, DEFAULT_OUTFITS, INITIAL_SETTINGS, INITIAL_DRILL, BASE_HS_SCHEDULE, BASE_COLLEGE_SCHEDULE, INITIAL_QUESTS, INITIAL_ACHIEVEMENTS, INITIAL_TRACKS, INITIAL_MEDIA, INITIAL_MOMENTS, INITIAL_PHONE_SETTINGS, generateBalancedRoster, getRandomAppearance, MOCK_RECRUITS, DEFAULT_INSTRUMENT_DESIGNS, DEFAULT_DM_UNIFORM, SCHOOLS_DATA, RECRUIT_NAMES, RECRUIT_SURNAMES, GAME_NAME, generateRandomSchedule, GAME_VERSION, MINI_ACHIEVEMENTS, generateOpponentIdentity, RIVAL_DIRECTOR_NAMES, SCHOOL_PREFIXES, SCHOOL_NOUNS } from './constants';
import { generateBatchPosts, generatePost } from './services/socialGenerator';
import { INITIAL_DIRECTOR_MESSAGES, INITIAL_CAREER_MESSAGES, generateRandomMessage } from './services/messageGenerator';

// Helper to generate a unique song sequence based on category
const generateProceduralMusic = (category: SongCategory, bpm: number): SequencerTrack[] => {
    // 64-step grid (4 measures of 16th notes)
    const steps = 64;
    const tracks: SequencerTrack[] = [
        { instrument: 'kick', notes: Array(steps).fill(0) },
        { instrument: 'snare', notes: Array(steps).fill(0) },
        { instrument: 'hat', notes: Array(steps).fill(0) },
        { instrument: 'bass', notes: Array(steps).fill(0) },
        { instrument: 'melody', notes: Array(steps).fill(0) }
    ];

    // Determine scale key (randomly for this session)
    const root = 36 + Math.floor(Math.random() * 12); // Bass root C2 to B2
    const scale = [0, 2, 4, 7, 9]; // Pentatonic offsets

    // Populate patterns
    for (let i = 0; i < steps; i++) {
        // Kick
        if (category === 'HYPE') {
            if (i % 8 === 0 || (i % 16 === 10 && Math.random() > 0.3)) tracks[0].notes[i] = 1;
        } else if (category === 'CADENCE') {
            if (i % 4 === 0) tracks[0].notes[i] = 1;
        } else if (category === 'SHOW') {
            if (i % 8 === 0) tracks[0].notes[i] = 1;
        }

        // Snare
        if (i % 8 === 4) tracks[1].notes[i] = 1; // Backbeat
        if (category === 'CADENCE' && Math.random() > 0.6) tracks[1].notes[i] = 1; // Busy snare for cadence

        // Hat
        if (i % 2 === 0) tracks[2].notes[i] = 1;
        if (category === 'HYPE' && i % 4 !== 0) tracks[2].notes[i] = 1; // Fast hats

        // Melody & Bass (Only if not just drum cadence)
        if (category !== 'CADENCE') {
            // Bass line follows kick mostly
            if (tracks[0].notes[i] === 1) {
                tracks[3].notes[i] = root; 
            }
            // Melody - Sparse but musical
            if (i % 4 === 0 && Math.random() > 0.4) {
                const noteOffset = scale[Math.floor(Math.random() * scale.length)];
                tracks[4].notes[i] = root + 24 + noteOffset; // +2 Octaves for lead
            }
        }
    }
    
    return tracks;
};

const SplashScreen: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
    const [step, setStep] = useState(0);
    useEffect(() => {
        setTimeout(() => setStep(1), 1000);
        setTimeout(() => setStep(2), 3000);
        setTimeout(onComplete, 5000);
    }, []);
    return (
        <div className="absolute inset-0 bg-black z-[100] flex items-center justify-center text-white">
            {step === 1 && <div className="text-4xl font-mono text-gray-400">PUBLIC TEST BUILD</div>}
            {step === 2 && (
                <div className="text-center">
                    <h1 className="text-7xl font-pixel bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600">{GAME_NAME}</h1>
                    <p className="mt-4 font-mono text-gray-500">{GAME_VERSION}</p>
                </div>
            )}
        </div>
    );
};

const GameScaler: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [scale, setScale] = useState(1);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleResize = () => {
            if (!containerRef.current) return;
            const targetWidth = 1280; // Base design width
            const targetHeight = 720; // Base design height
            
            const windowW = window.innerWidth;
            const windowH = window.innerHeight;

            const scaleW = windowW / targetWidth;
            const scaleH = windowH / targetHeight;

            // Pick the smaller scale to ensure fit
            const newScale = Math.min(scaleW, scaleH);
            setScale(newScale);
        };

        window.addEventListener('resize', handleResize);
        handleResize(); // Initial call

        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <div className="w-screen h-screen bg-black flex items-center justify-center overflow-hidden">
            <div 
                ref={containerRef}
                style={{ 
                    width: '1280px', 
                    height: '720px', 
                    transform: `scale(${scale})`, 
                    transformOrigin: 'center center',
                    position: 'relative',
                    boxShadow: '0 0 50px rgba(0,0,0,0.8)' // Adding shadow to visualize frame
                }}
            >
                {children}
            </div>
        </div>
    );
};

const App: React.FC = () => {
  const loadState = (): GameState => {
      // 1. Generate unique music for this session (prevents staleness)
      const sessionMusic: MusicTrack[] = INITIAL_TRACKS.map(track => {
          if (track.category === 'CHANT') return track; // Chants don't need note sequences
          return {
              ...track,
              sequence: generateProceduralMusic(track.category, track.bpm)
          };
      });

      try {
          const saved = localStorage.getItem('MF_GAME_STATE');
          if (saved) {
              const parsed = JSON.parse(saved);
              // Merge saved tracks with session tracks (preserve user custom tracks, update system tracks)
              const mergedLibrary = [
                  ...sessionMusic,
                  ...(parsed.musicLibrary || []).filter((t: MusicTrack) => t.isCustom)
              ];
              return { ...parsed, musicLibrary: mergedLibrary };
          }
      } catch (e) {}
      
      return {
        mode: 'DIRECTOR', funds: INITIAL_FUNDS, transactions: [], fans: INITIAL_FANS, reputation: 0, bandName: "", style: BandStyle.SHOW,
        members: OG_MEMBERS, recruitPool: MOCK_RECRUITS, drills: [INITIAL_DRILL], activeDrillId: INITIAL_DRILL.id, schedule: BASE_COLLEGE_SCHEDULE,
        activeEventId: null, activeBuff: { type: 'NONE', value: 0, description: '' }, quests: INITIAL_QUESTS, achievements: INITIAL_ACHIEVEMENTS,
        musicLibrary: sessionMusic, // Use generated music
        mediaFeed: INITIAL_MEDIA, moments: INITIAL_MOMENTS, messages: INITIAL_DIRECTOR_MESSAGES, tutorialStep: 0,
        director: { name: 'New Director', gender: 'MALE', trait: DirectorTrait.SHOWMAN, appearance: DEFAULT_APPEARANCE, outfits: DEFAULT_OUTFITS, currentOutfitId: DEFAULT_OUTFITS[0].id },
        identity: { schoolName: 'Pixel University', schoolType: 'College', mascot: 'Marchers', primaryColor: '#ef4444', secondaryColor: '#ffffff' },
        uniforms: DEFAULT_UNIFORMS, currentUniformId: DEFAULT_UNIFORMS[0].id, instrumentDesigns: DEFAULT_INSTRUMENT_DESIGNS,
        settings: INITIAL_SETTINGS, phoneSettings: INITIAL_PHONE_SETTINGS, unlockedItems: [], placedDecorations: [], phoneGameHighScores: { career: 0, director: 0 },
        alumniDonations: 0,
        uploadedVideos: [],
        shownNotifications: []
      };
  };

  const [gameState, setGameState] = useState<GameState>(loadState());
  const [currentPhase, setCurrentPhase] = useState<GamePhase | 'SETUP_AVATAR'>(GamePhase.TITLE);
  const [showSplash, setShowSplash] = useState(true);
  const [auditionCandidate, setAuditionCandidate] = useState<BandMember | null>(null);
  
  const [tempDirectorName, setTempDirectorName] = useState("Director Smith");
  const [loyaltyFactor, setLoyaltyFactor] = useState(1.0);
  const [wantsTutorial, setWantsTutorial] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showRivalReveal, setShowRivalReveal] = useState(false);

  useEffect(() => { localStorage.setItem('MF_GAME_STATE', JSON.stringify(gameState)); }, [gameState]);

  // Listener for global events from Phone/Office components
  useEffect(() => {
      const handleAction = (e: CustomEvent) => {
          const { action, data } = e.detail;
          if (action === 'UPLOAD_VIDEO' && data) {
              setGameState(p => ({
                  ...p, 
                  uploadedVideos: [data, ...p.uploadedVideos],
                  // Add a notification/post about the video
                  mediaFeed: [{
                      id: `notif-${Date.now()}`,
                      author: "MeTube",
                      handle: "@system",
                      content: `New video uploaded: "${data.title}"`,
                      likes: 0,
                      timestamp: "Just now",
                      type: 'SOCIAL'
                  }, ...p.mediaFeed]
              }));
              triggerNotification('video_upload');
          } else if (action === 'ADD_FUNDS' && typeof data === 'number') {
              setGameState(p => ({
                  ...p,
                  funds: p.funds + data,
                  transactions: [...p.transactions, { id: `tx-donation-${Date.now()}`, date: 'Today', type: 'INCOME', category: 'DONATION', amount: data, description: "Alumni Donation" }]
              }));
          } else if (action === 'SAVE_TRACK' && data) {
              // Handle saving new track from Laptop
              setGameState(p => ({
                  ...p,
                  musicLibrary: [...p.musicLibrary, data]
              }));
          } else if (action === 'HIRE_MEMBER' && data) {
              // Hire from Laptop Recruit App (direct hire, no audition)
              const member = data;
              setGameState(prev => ({
                  ...prev,
                  funds: prev.funds - member.salary,
                  members: [...prev.members, { ...member, status: 'P4' }], // Default to alternate
                  recruitPool: prev.recruitPool.filter(r => r.id !== member.id),
                  transactions: [...prev.transactions, { id: `tx-rec-${Date.now()}`, date: 'Today', type: 'EXPENSE', category: 'RECRUITMENT', amount: member.salary, description: `Hired ${member.name}` }]
              }));
              triggerNotification('first_recruit');
          }
      };
      
      const handleDecor = (e: CustomEvent) => {
          const { itemId } = e.detail;
          setGameState(prev => {
              const current = prev.placedDecorations || [];
              const exists = current.includes(itemId);
              const updated = exists ? current.filter(id => id !== itemId) : [...current, itemId];
              return { ...prev, placedDecorations: updated };
          });
      };

      window.addEventListener('mf-phone-action', handleAction as EventListener);
      window.addEventListener('mf-place-decoration', handleDecor as EventListener);
      return () => {
          window.removeEventListener('mf-phone-action', handleAction as EventListener);
          window.removeEventListener('mf-place-decoration', handleDecor as EventListener);
      };
  }, []);

  // PASSIVE BACKGROUND ACTIVITY GENERATOR (RIVAL SYSTEM & VIEWS)
  useEffect(() => {
      if (currentPhase === GamePhase.TITLE) return;

      const interval = setInterval(() => {
          const rnd = Math.random();
          
          // 1. UPDATE VIDEO STATS
          setGameState(prev => ({
              ...prev,
              uploadedVideos: prev.uploadedVideos.map(vid => {
                  const ageHours = (Date.now() - vid.uploadedAt) / (1000 * 60 * 60);
                  // Views grow logarithmically with age
                  const viewGrowth = Math.floor(Math.random() * (100 / (ageHours + 1))); 
                  const commentGrowth = Math.random() < 0.2 ? 1 : 0;
                  return { 
                      ...vid, 
                      views: vid.views + viewGrowth,
                      comments: vid.comments + commentGrowth
                  };
              })
          }));

          // 2. RIVAL INTERACTION (15% chance)
          if (rnd < 0.15 && gameState.rivalDirector) {
              const rivalName = gameState.rivalDirector;
              const rivalSchool = gameState.rivalIdentity?.schoolName || "Rival School";
              
              if (Math.random() > 0.5) {
                  // Text Message
                  const newMessage: Message = {
                      id: `msg-rival-${Date.now()}`,
                      contactId: 'rival_dir',
                      sender: rivalName,
                      text: [
                          `Heard you're struggling with the woodwinds. Need some tips?`,
                          `My band just hit a 99.8 score. Try to keep up.`,
                          `See you at the ${rivalSchool} Classic. Bring your A-game.`,
                          `Nice uniform update. Almost looks professional.`
                      ][Math.floor(Math.random() * 4)],
                      timestamp: 'Now',
                      read: false,
                      type: 'TEXT',
                      replies: [{ label: 'Focus on your own band.', action: 'REPLY_NEUTRAL' }]
                  };
                  setGameState(prev => ({ ...prev, messages: [...prev.messages, newMessage] }));
                  triggerNotification('lost_game'); // Just re-using an icon for "Rival Alert" essentially
              } else {
                  // Social Media Post
                  const newPost = generatePost(gameState.bandName, rivalSchool, 'TRASH', undefined, gameState.identity.mascot);
                  setGameState(prev => ({ ...prev, mediaFeed: [newPost, ...prev.mediaFeed] }));
              }
          }

          // 3. REGULAR MESSAGES/POSTS
          if (rnd > 0.8) {
              const newPost = generatePost(gameState.bandName, undefined, 'HYPE', undefined, gameState.identity.mascot);
              setGameState(prev => ({ ...prev, mediaFeed: [newPost, ...prev.mediaFeed] }));
          }
      }, 30000); 

      return () => clearInterval(interval);
  }, [currentPhase, gameState.bandName, gameState.identity.mascot, gameState.mode]);

  const triggerNotification = (achievementId: string) => {
      // Check if already shown this session or in history
      if (gameState.shownNotifications?.includes(achievementId)) return;

      const ach = MINI_ACHIEVEMENTS.find(a => a.id === achievementId);
      if (ach) {
          const notif: Notification = {
              id: `n-${Date.now()}`,
              title: ach.title,
              icon: ach.icon,
              color: 'bg-yellow-500'
          };
          setNotifications(prev => [...prev, notif]);
          
          // Update game state to remember it was shown
          setGameState(prev => ({
              ...prev,
              shownNotifications: [...(prev.shownNotifications || []), achievementId]
          }));

          setTimeout(() => {
              setNotifications(prev => prev.filter(n => n.id !== notif.id));
          }, 4000);
      }
  };

  const handleStartGame = (mode: 'DIRECTOR' | 'CAREER') => {
      if (mode === 'CAREER') setCurrentPhase(GamePhase.CAREER_SETUP);
      else setCurrentPhase(GamePhase.BOARD_MEETING); 
  };

  const handleBoardMeetingComplete = (name: string, loyalty: number, tutorial: boolean) => {
      setTempDirectorName(name);
      setLoyaltyFactor(loyalty);
      setWantsTutorial(tutorial);
      setCurrentPhase(GamePhase.CUSTOMIZATION);
  };

  const handleCustomizationComplete = (director: Director, identity: BandIdentity, bandName: string, initialLineup?: BandMember[], initialUniform?: Uniform) => {
      const schedule = generateRandomSchedule(identity.schoolType === 'High School' ? 'HS' : 'COLLEGE');
      
      // GENERATE PERSISTENT RIVAL WITH CORRECT SCHOOL LEVEL AND RANDOMNESS
      let rivalSchoolName = "";
      if (identity.schoolType === 'High School') {
          // Dynamic HS Name Generation
          const prefix = SCHOOL_PREFIXES[Math.floor(Math.random() * SCHOOL_PREFIXES.length)];
          // Force high school suffixes
          const suffix = Math.random() > 0.5 ? "High School" : "Academy";
          rivalSchoolName = `${prefix} ${suffix}`;
      } else {
          // Dynamic College Name Generation
          const prefix = SCHOOL_PREFIXES[Math.floor(Math.random() * SCHOOL_PREFIXES.length)];
          // Force college nouns (exclude high school terms)
          const validNouns = SCHOOL_NOUNS.filter(n => n !== 'High' && n !== 'Academy');
          const noun = validNouns[Math.floor(Math.random() * validNouns.length)];
          rivalSchoolName = `${prefix} ${noun}`;
      }
      
      // Ensure rival isn't same as player (rare collision check)
      if (rivalSchoolName === identity.schoolName) rivalSchoolName += (identity.schoolType === 'High School' ? " North" : " A&M");

      const rivalData = generateOpponentIdentity(rivalSchoolName);
      
      // Force correct level on rival data
      rivalData.identity.schoolType = identity.schoolType;

      const rivalDirectorName = RIVAL_DIRECTOR_NAMES[Math.floor(Math.random() * RIVAL_DIRECTOR_NAMES.length)];

      setGameState(prev => ({
          ...prev,
          mode: 'DIRECTOR',
          director,
          identity,
          bandName: bandName || identity.schoolName + " Band",
          members: initialLineup || OG_MEMBERS,
          schedule: schedule,
          uniforms: initialUniform ? [initialUniform] : prev.uniforms,
          currentUniformId: initialUniform ? initialUniform.id : prev.currentUniformId,
          rivalIdentity: rivalData.identity,
          rivalDirector: rivalDirectorName
      }));
      // New Flow: Customization -> Avatar Setup -> Walk In
      setCurrentPhase('SETUP_AVATAR');
  };

  const handleWalkInComplete = (bonus: 'FUNDS' | 'FANS' | 'SKILL') => {
      setGameState(prev => {
          let updates = { ...prev };
          if (bonus === 'FUNDS') updates.funds += 500;
          else if (bonus === 'FANS') updates.fans += 100;
          else if (bonus === 'SKILL') {
              updates.members = prev.members.map(m => ({ ...m, marchSkill: Math.min(100, m.marchSkill + 10) }));
          }
          return updates;
      });
      
      // Show Rival Reveal before starting properly
      setShowRivalReveal(true);
  };

  const closeRivalReveal = () => {
      setShowRivalReveal(false);
      if (wantsTutorial) {
          setCurrentPhase(GamePhase.TUTORIAL);
      } else {
          setCurrentPhase(GamePhase.HOME);
      }
  };

  const handleCareerComplete = (careerState: CareerState, identity: BandIdentity) => {
      const roster = generateBalancedRoster(20); 
      // Use dynamic schedule generation here too
      const schedule = generateRandomSchedule(identity.schoolType === 'High School' ? 'HS' : 'COLLEGE');
      
      setGameState(prev => ({ 
          ...prev, 
          mode: 'CAREER',
          career: careerState, 
          identity, 
          members: roster, 
          schedule, 
          activeEventId: null,
          bandName: identity.schoolName
      }));
      setCurrentPhase(GamePhase.CAREER_HUB);
  };

  const handleAuditionStart = (member: BandMember) => {
      setAuditionCandidate(member);
      setCurrentPhase(GamePhase.AUDITION);
  };

  const handleAuditionComplete = (member: BandMember, status: 'P1' | 'P2' | 'P3' | 'P4' | 'P5') => {
      if (status !== 'P5') {
          const hiredMember = { ...member, status };
          setGameState(prev => ({
              ...prev,
              funds: prev.funds - member.salary,
              members: [...prev.members, hiredMember],
              recruitPool: prev.recruitPool.filter(r => r.id !== member.id),
              transactions: [...prev.transactions, { id: `tx-rec-${Date.now()}`, date: 'Today', type: 'EXPENSE', category: 'RECRUITMENT', amount: member.salary, description: `Hired ${member.name} (${status})` }]
          }));
          triggerNotification('first_recruit');
      }
      setAuditionCandidate(null);
      setCurrentPhase(GamePhase.BAND_OFFICE);
  };

  const handleRecruitStrategy = (cost: number, tier: 'LOW' | 'MID' | 'HIGH') => {
      const count = tier === 'HIGH' ? 3 : tier === 'MID' ? 2 : 1;
      const newRecruits = generateBalancedRoster(count);
      
      setGameState(prev => ({
          ...prev,
          funds: prev.funds - cost,
          recruitPool: [...prev.recruitPool, ...newRecruits],
          transactions: [...prev.transactions, { id: `tx-scout-${Date.now()}`, date: 'Today', type: 'EXPENSE', category: 'RECRUITMENT', amount: cost, description: `Scouting: ${tier}` }]
      }));
  };

  const handlePurchase = (item: ShopItem) => {
      setGameState(prev => ({
          ...prev,
          funds: prev.funds - item.price,
          unlockedItems: [...prev.unlockedItems, item.id],
          transactions: [...prev.transactions, { id: `tx-shop-${Date.now()}`, date: 'Today', type: 'EXPENSE', category: 'SHOP', amount: item.price, description: `Bought ${item.name}` }]
      }));
      triggerNotification('big_spender');
  };

  const handleDrillSave = (drill: Drill) => {
      setGameState(prev => ({
          ...prev,
          drills: prev.drills.map(d => d.id === drill.id ? drill : d)
      }));
      triggerNotification('first_drill');
  };

  const handleUniformSave = (uniforms: Uniform[], currentId: string) => {
      setGameState(prev => ({
          ...prev,
          uniforms,
          currentUniformId: currentId
      }));
      triggerNotification('uniform_edit');
  };

  const handleLogoSave = (logo: string[]) => {
      setGameState(prev => ({
          ...prev,
          identity: { ...prev.identity, logo }
      }));
      setCurrentPhase(GamePhase.HOME);
  };

  const handleEventStart = (eventId: string) => {
      setGameState(prev => ({ ...prev, activeEventId: eventId }));
      setCurrentPhase(GamePhase.BUS_RIDE); // New Flow: Bus Ride first
  };

  const handleGameDayComplete = (win: boolean, eventId: string, scores?: { us: number, them: number }) => {
      const baseReward = win ? 1000 : 250;
      const isBattle = gameState.schedule.find(e => e.id === eventId)?.type === EventType.BATTLE;
      
      let newAchievements = [...gameState.achievements];
      let newFunds = gameState.funds + baseReward;
      let newFans = gameState.fans + (win ? 100 : -20);
      
      if (isBattle && win) {
          newAchievements = newAchievements.map(a => a.id === 'a5' ? { ...a, unlocked: true, dateUnlocked: new Date().toLocaleDateString() } : a);
      }

      if(!win) triggerNotification('lost_game');

      const newTweets = generateBatchPosts(5, gameState.bandName, 'Opponent', win ? 'WIN' : 'LOSS', gameState.identity.mascot);

      setGameState(prev => ({
          ...prev,
          schedule: prev.schedule.map(e => e.id === eventId ? { 
              ...e, 
              completed: true,
              result: scores ? { us: scores.us, them: scores.them, win } : undefined
          } : e),
          funds: newFunds,
          fans: newFans,
          achievements: newAchievements,
          mediaFeed: [...newTweets, ...prev.mediaFeed],
          activeEventId: null
      }));
      
      setCurrentPhase(gameState.mode === 'CAREER' ? GamePhase.CAREER_HUB : GamePhase.HOME);
  };

  const handleMessageAction = (action: string, message: Message) => {
      const updatedMessages = gameState.messages.map(m => m.id === message.id ? { ...m, read: true } : m);
      const replyText = message.replies?.find(r => r.action === action)?.label || "Ok";
      const replyMsg: Message = {
          id: `reply-${Date.now()}`,
          contactId: message.contactId,
          sender: "You",
          text: replyText,
          timestamp: "Just now",
          read: true,
          type: 'TEXT',
          isReply: true
      };

      setGameState(prev => ({
          ...prev,
          messages: [...updatedMessages, replyMsg]
      }));

      if (action === 'FIX_TIRE') {
          if (gameState.funds >= 100) {
              setGameState(prev => ({ ...prev, funds: prev.funds - 100 }));
              alert("Tire fixed. Funds deducted.");
          } else {
              alert("Can't afford it!");
          }
      }
  };

  const activeUniform = gameState.uniforms.find(u => u.id === gameState.currentUniformId);

  const renderPhase = () => {
    switch (currentPhase) {
      case GamePhase.TITLE: 
          return (
            <TitleScreen 
                onStart={handleStartGame} 
                onLoad={(s) => setGameState(s)} 
                hasSave={!!gameState.bandName || !!gameState.career} 
                currentSettings={gameState.settings} 
                onSettingsChange={(s) => setGameState(p=>({...p, settings: s}))} 
                onCredits={() => setCurrentPhase(GamePhase.CREDITS)}
            />
          );
      
      case GamePhase.BOARD_MEETING:
          return <BoardMeeting onComplete={handleBoardMeetingComplete} />;

      case GamePhase.CUSTOMIZATION: 
          return <Customization onComplete={handleCustomizationComplete} preSetDirectorName={tempDirectorName} loyaltyMod={loyaltyFactor} />;
      
      case 'SETUP_AVATAR':
          return <AvatarEditor director={gameState.director} onSave={(d) => { setGameState(p => ({...p, director: d})); setCurrentPhase(GamePhase.WALK_IN); }} onBack={() => {}} unlockedItems={gameState.unlockedItems} />;

      case GamePhase.WALK_IN:
          return <DirectorWalkIn director={gameState.director} onComplete={handleWalkInComplete} />;

      case GamePhase.CAREER_SETUP: 
          return <CareerSetup onComplete={handleCareerComplete} onBack={() => setCurrentPhase(GamePhase.TITLE)} />;
      
      case GamePhase.CAREER_HUB: 
          return <CareerHub gameState={gameState} setPhase={(p) => setCurrentPhase(p as GamePhase)} onStartEvent={handleEventStart} updateCareerState={(u)=>setGameState(p=>({...p, career: {...p.career!, ...u}}))} />;
      
      case GamePhase.HOME: 
          return <Dashboard gameState={gameState} setPhase={(p) => setCurrentPhase(p as GamePhase)} onUpdateName={(n)=>setGameState(p=>({...p, bandName: n}))} onStartEvent={handleEventStart} />;
      
      case GamePhase.BAND_OFFICE: 
          return <BandOffice gameState={gameState} setPhase={(p) => setCurrentPhase(p as GamePhase)} onBack={() => setCurrentPhase(GamePhase.HOME)} />;
      case GamePhase.RECRUITMENT: 
          return <RecruitmentMenu gameState={gameState} onRecruit={(m, c) => handleAuditionStart(m)} onRunStrategy={handleRecruitStrategy} onBack={() => setCurrentPhase(GamePhase.BAND_OFFICE)} />;
      case GamePhase.AUDITION:
          return auditionCandidate ? <AuditionScene candidate={auditionCandidate} onDecision={handleAuditionComplete} /> : <div/>;
      case GamePhase.MANAGEMENT: 
          return <Management gameState={gameState} onRecruit={(m) => handleAuditionStart(m)} onBack={() => setCurrentPhase(GamePhase.BAND_OFFICE)} />;
      case GamePhase.STORE: 
          return <BookerStore gameState={gameState} onPurchase={handlePurchase} onBack={() => setCurrentPhase(GamePhase.HOME)} onEquip={(item) => { 
              if(item.category === 'CLOTHING') setCurrentPhase(GamePhase.AVATAR_EDITOR); 
              else if(item.category === 'DECOR') setCurrentPhase(GamePhase.BAND_OFFICE); 
          }} />;
      case GamePhase.ALUMNI_HUB:
          return <AlumniHub gameState={gameState} onBack={() => setCurrentPhase(GamePhase.HOME)} />;

      case GamePhase.EDITOR: 
          return <FormationEditor gameState={gameState} onSave={handleDrillSave} onBack={() => setCurrentPhase(GamePhase.HOME)} />;
      case GamePhase.UNIFORM_EDITOR: 
          return <UniformEditor uniforms={gameState.uniforms} currentId={gameState.currentUniformId} onSave={handleUniformSave} onBack={() => setCurrentPhase(GamePhase.HOME)} identity={gameState.identity} />;
      case GamePhase.LOGO_EDITOR: 
          return <LogoEditor currentLogo={gameState.identity.logo} primaryColor={gameState.identity.primaryColor} secondaryColor={gameState.identity.secondaryColor} onSave={handleLogoSave} onBack={() => setCurrentPhase(GamePhase.HOME)} />;
      case GamePhase.AVATAR_EDITOR: 
          return <AvatarEditor director={gameState.director} onSave={(d) => { setGameState(p => ({...p, director: d})); setCurrentPhase(GamePhase.HOME); }} onBack={() => setCurrentPhase(GamePhase.HOME)} unlockedItems={gameState.unlockedItems} />;
      case GamePhase.INSTRUMENT_DESIGNER: 
          return <InstrumentDesigner gameState={gameState} onSave={(d, u) => { setGameState(p => ({...p, instrumentDesigns: d, uniforms: p.uniforms.map(un => un.id === p.currentUniformId ? {...un, ...u} : un) })); setCurrentPhase(GamePhase.HOME); }} onBack={() => setCurrentPhase(GamePhase.HOME)} />;

      case GamePhase.PRACTICE: 
          return <PracticeMode gameState={gameState} onBack={() => setCurrentPhase(GamePhase.HOME)} />;
      
      case GamePhase.BUS_RIDE:
          return <BusRide gameState={gameState} onComplete={() => setCurrentPhase(GamePhase.PEP_TALK)} />;

      case GamePhase.PEP_TALK: 
          return <PepTalk 
                    director={gameState.director} 
                    identity={gameState.identity} 
                    opponentName={gameState.schedule.find(e => e.id === gameState.activeEventId)?.opponent || "Rivals"} 
                    onComplete={(buff) => { setGameState(p => ({...p, activeBuff: buff})); setCurrentPhase(GamePhase.GAME_DAY); }} 
                    mode={gameState.mode}
                    activeUniform={activeUniform}
                 />;
      case GamePhase.GAME_DAY: 
          return <GameDay gameState={gameState} onEndGame={handleGameDayComplete} />;
      
      case GamePhase.MEDIA: 
          return <BandMedia media={gameState.mediaFeed} onBack={() => setCurrentPhase(GamePhase.HOME)} />;
      case GamePhase.VIDEO_APP: 
          return <VideoApp gameState={gameState} onBack={() => setCurrentPhase(GamePhase.HOME)} />;
      case GamePhase.QUESTS: 
          return <QuestMenu gameState={gameState} onBack={() => setCurrentPhase(GamePhase.HOME)} />;
      case GamePhase.ACHIEVEMENTS: 
          return <AchievementsMenu gameState={gameState} onBack={() => setCurrentPhase(GamePhase.HOME)} />;
      case GamePhase.MUSIC_LIBRARY: 
          return <MusicLibrary 
                    tracks={gameState.musicLibrary} 
                    onImport={(t) => setGameState(p => ({
                        ...p, 
                        musicLibrary: p.musicLibrary.some(tr => tr.id === t.id) 
                            ? p.musicLibrary.map(tr => tr.id === t.id ? t : tr) 
                            : [...p.musicLibrary, t]
                    }))} 
                    onBack={() => setCurrentPhase(GamePhase.HOME)} 
                 />;
      case GamePhase.MOMENTS: 
          return <MomentsGallery moments={gameState.moments} onBack={() => setCurrentPhase(GamePhase.HOME)} />;
      case GamePhase.CREDITS: 
          return <Credits onBack={() => setCurrentPhase(GamePhase.TITLE)} />;
      
      case GamePhase.CAMPUS_MAP: 
          return <CampusMap careerState={gameState.career!} onTravel={(loc) => { setGameState(p => ({...p, career: {...p.career!, currentLocation: loc}})); setCurrentPhase(GamePhase.CAREER_HUB); }} onBack={() => setCurrentPhase(GamePhase.CAREER_HUB)} />;
      case GamePhase.ADVISOR: 
          return <AdvisorOffice careerState={gameState.career!} onTakeJob={(job) => { setGameState(p => ({...p, career: {...p.career!, currentJob: job}})); setCurrentPhase(GamePhase.CAREER_HUB); }} onLeave={() => setCurrentPhase(GamePhase.CAREER_HUB)} />;
      
      case GamePhase.TUTORIAL:
          return <Tutorial gameState={gameState} onComplete={(r) => { handleAuditionStart(r); setCurrentPhase(GamePhase.HOME); }} />;

      case GamePhase.LOADING: 
          return <LoadingScreen onComplete={() => setCurrentPhase(GamePhase.HOME)} />;

      default: return <Dashboard gameState={gameState} setPhase={(p) => setCurrentPhase(p as GamePhase)} onUpdateName={(n)=>setGameState(p=>({...p, bandName: n}))} onStartEvent={handleEventStart} />;
    }
  };

  const isPhoneHidden = () => {
      const hiddenPhases: (GamePhase | string)[] = [
          GamePhase.TITLE,
          GamePhase.BOARD_MEETING,
          GamePhase.CUSTOMIZATION,
          'SETUP_AVATAR',
          GamePhase.WALK_IN,
          GamePhase.CAREER_SETUP,
          GamePhase.LOADING,
          GamePhase.CREDITS,
          GamePhase.TUTORIAL 
      ];
      return hiddenPhases.includes(currentPhase);
  };

  return (
    <GameScaler>
       <div className={`w-full h-full bg-black text-white overflow-hidden select-none relative ${gameState.settings.retroMode ? 'retro-active' : ''}`}>
          {/* Notification System */}
          <div className="absolute top-4 right-4 z-[999] flex flex-col gap-2">
              {notifications.map(n => (
                  <div key={n.id} className={`bg-gray-900 border-l-4 border-yellow-500 p-3 shadow-lg animate-bounce-in flex items-center gap-3 w-64`}>
                      <div className="text-2xl">{n.icon}</div>
                      <div>
                          <div className="text-[10px] text-gray-400 font-bold uppercase">Achievement</div>
                          <div className="font-bold text-sm text-yellow-400">{n.title}</div>
                      </div>
                  </div>
              ))}
          </div>

          {/* Rival Reveal Modal */}
          {showRivalReveal && (
              <div className="absolute inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center p-8 animate-fade-in">
                  <h2 className="text-4xl font-black text-red-600 mb-2 italic">RIVALRY ESTABLISHED</h2>
                  <div className="w-full max-w-lg bg-gray-900 border-4 border-red-600 p-8 text-center shadow-[0_0_50px_rgba(220,38,38,0.5)]">
                      <div className="text-6xl mb-4">🆚</div>
                      <h3 className="text-2xl font-bold text-white mb-1">{gameState.rivalIdentity?.schoolName}</h3>
                      <p className="text-gray-400 text-sm mb-6">Directed by {gameState.rivalDirector}</p>
                      <div className="text-sm text-gray-300 italic mb-8">
                          "You think you can handle this conference? Cute. Stay out of our way."
                      </div>
                      <button onClick={closeRivalReveal} className="bg-red-600 text-white font-bold py-3 px-8 text-xl hover:bg-red-500 w-full uppercase">
                          BRING IT ON
                      </button>
                  </div>
              </div>
          )}

          {showSplash ? <SplashScreen onComplete={() => setShowSplash(false)} /> : (
              <div key={currentPhase} className="w-full h-full animate-fade-in">
                   {renderPhase()}
              </div>
          )}
          
          {!showSplash && !isPhoneHidden() && (
              <PhoneUI 
                   gameState={gameState} 
                   setPhase={(p) => setCurrentPhase(p as GamePhase)} 
                   onTransaction={(t)=>setGameState(p=>({...p, funds: p.funds + (t.type==='INCOME'?t.amount:-t.amount), transactions: [...p.transactions, t]}))} 
                   onStartEvent={handleEventStart}
                   onUpdateSettings={(s) => setGameState(p => ({...p, phoneSettings: s}))}
                   onMessageAction={handleMessageAction}
              />
          )}
       </div>
    </GameScaler>
  );
};
export default App;
