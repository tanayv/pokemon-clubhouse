import React, { useEffect, useRef, useState } from 'react';
import { BattleData } from '../engine/battle/BattleSystem';
import './BattleScreen.css';

const BATTLE_WIDTH = 480;
const BATTLE_HEIGHT = 320;

type MenuScreen = 'main' | 'fight' | 'pokemon' | 'bag';

interface BattleScreenProps {
  battleData: BattleData;
  displayWidth: number;
  displayHeight: number;
  onAttack: (moveIndex: number) => void;
  onRun: () => void;
  onSwitchPokemon: (partyIndex: number) => void;
  onAdvance: () => void;
}

export const BattleScreen: React.FC<BattleScreenProps> = ({
  battleData,
  displayWidth,
  displayHeight,
  onAttack,
  onRun,
  onSwitchPokemon,
  onAdvance,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedMove, setSelectedMove] = useState(0);
  const [selectedAction, setSelectedAction] = useState<number>(0); // 0=fight, 1=bag, 2=pokemon, 3=run
  const [selectedPartyIndex, setSelectedPartyIndex] = useState(0);
  const [menuScreen, setMenuScreen] = useState<MenuScreen>('main');
  const [wildSprite, setWildSprite] = useState<HTMLImageElement | null>(null);
  const [playerSprite, setPlayerSprite] = useState<HTMLImageElement | null>(null);

  const { playerPokemon, wildPokemon, playerParty, state, message } = battleData;

  const scaleX = displayWidth / BATTLE_WIDTH;
  const scaleY = displayHeight / BATTLE_HEIGHT;

  // Load Pokemon sprites
  useEffect(() => {
    const wildImg = new Image();
    wildImg.src = `/pokemon/${wildPokemon.species.id}_front.png`;
    wildImg.onload = () => setWildSprite(wildImg);
    wildImg.onerror = () => setWildSprite(null);

    const playerImg = new Image();
    playerImg.src = `/pokemon/${playerPokemon.species.id}_back.png`;
    playerImg.onload = () => setPlayerSprite(playerImg);
    playerImg.onerror = () => setPlayerSprite(null);
  }, [wildPokemon.species.id, playerPokemon.species.id]);

  // Reset menu when returning to selection state
  useEffect(() => {
    if (state === 'selection') {
      setMenuScreen('main');
      setSelectedAction(0);
    }
  }, [state]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // When not in interactive selection, X/Z/Enter advance through messages
      if (state !== 'selection' || battleData.animating) {
        if (e.key === 'z' || e.key === 'x' || e.key === 'Enter') {
          onAdvance();
        }
        return;
      }

      if (menuScreen === 'fight') {
        handleFightKeys(e);
      } else if (menuScreen === 'pokemon') {
        handlePokemonKeys(e);
      } else if (menuScreen === 'bag') {
        handleBagKeys(e);
      } else {
        handleMainKeys(e);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state, battleData.animating, menuScreen, selectedMove, selectedAction, selectedPartyIndex, onAttack, onRun, onSwitchPokemon, onAdvance, playerPokemon.moves, playerParty]);

  function handleMainKeys(e: KeyboardEvent) {
    // 2x2 grid: [0=FIGHT, 1=BAG], [2=POKéMON, 3=RUN]
    switch (e.key) {
      case 'ArrowUp':
        setSelectedAction(prev => prev >= 2 ? prev - 2 : prev);
        break;
      case 'ArrowDown':
        setSelectedAction(prev => prev < 2 ? prev + 2 : prev);
        break;
      case 'ArrowLeft':
        setSelectedAction(prev => prev % 2 === 1 ? prev - 1 : prev);
        break;
      case 'ArrowRight':
        setSelectedAction(prev => prev % 2 === 0 ? prev + 1 : prev);
        break;
      case 'Enter':
      case 'z':
        if (selectedAction === 0) {
          setMenuScreen('fight');
          setSelectedMove(0);
        } else if (selectedAction === 1) {
          setMenuScreen('bag');
        } else if (selectedAction === 2) {
          setMenuScreen('pokemon');
          setSelectedPartyIndex(0);
        } else if (selectedAction === 3) {
          onRun();
        }
        break;
    }
  }

  function handleFightKeys(e: KeyboardEvent) {
    const moveCount = playerPokemon.moves.length;
    switch (e.key) {
      case 'ArrowUp':
        setSelectedMove(prev => prev >= 2 ? prev - 2 : prev);
        break;
      case 'ArrowDown':
        setSelectedMove(prev => prev + 2 < moveCount ? prev + 2 : prev);
        break;
      case 'ArrowLeft':
        setSelectedMove(prev => prev % 2 === 1 ? prev - 1 : prev);
        break;
      case 'ArrowRight':
        setSelectedMove(prev => prev % 2 === 0 && prev + 1 < moveCount ? prev + 1 : prev);
        break;
      case 'Enter':
      case 'z':
        if (playerPokemon.moves[selectedMove] && playerPokemon.moves[selectedMove].pp > 0) {
          onAttack(selectedMove);
          setMenuScreen('main');
        }
        break;
      case 'Escape':
      case 'x':
        setMenuScreen('main');
        break;
    }
  }

  function handlePokemonKeys(e: KeyboardEvent) {
    const partySize = playerParty.length;
    switch (e.key) {
      case 'ArrowUp':
        setSelectedPartyIndex(prev => Math.max(0, prev - 1));
        break;
      case 'ArrowDown':
        setSelectedPartyIndex(prev => Math.min(partySize - 1, prev + 1));
        break;
      case 'Enter':
      case 'z': {
        const selected = playerParty[selectedPartyIndex];
        if (selected && selected.currentHP > 0 && selected !== playerPokemon) {
          onSwitchPokemon(selectedPartyIndex);
          setMenuScreen('main');
        }
        break;
      }
      case 'Escape':
      case 'x':
        setMenuScreen('main');
        break;
    }
  }

  function handleBagKeys(e: KeyboardEvent) {
    if (e.key === 'Escape' || e.key === 'x') {
      setMenuScreen('main');
    }
  }

  // Render battle scene on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, BATTLE_WIDTH, BATTLE_HEIGHT);

    // Sky gradient background
    const gradient = ctx.createLinearGradient(0, 0, 0, 200);
    gradient.addColorStop(0, '#f0f0e8');
    gradient.addColorStop(0.6, '#d8e0d0');
    gradient.addColorStop(1, '#b0c8a0');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, BATTLE_WIDTH, 200);

    // Grass strip
    ctx.fillStyle = '#68a868';
    ctx.fillRect(0, 192, BATTLE_WIDTH, 8);

    // Enemy platform
    ctx.fillStyle = '#a8d8a0';
    ctx.beginPath();
    ctx.ellipse(360, 150, 80, 20, 0, 0, Math.PI * 2);
    ctx.fill();

    // Player platform
    ctx.fillStyle = '#80b880';
    ctx.beginPath();
    ctx.ellipse(120, 185, 90, 24, 0, 0, Math.PI * 2);
    ctx.fill();

    // Wild Pokemon sprite
    if (wildSprite) {
      ctx.drawImage(wildSprite, 310, 50, 96, 96);
    }

    // Player Pokemon sprite
    if (playerSprite) {
      ctx.drawImage(playerSprite, 40, 70, 128, 128);
    }
  }, [wildSprite, playerSprite]);

  const playerHPPercent = (playerPokemon.currentHP / playerPokemon.maxHP) * 100;
  const wildHPPercent = (wildPokemon.currentHP / wildPokemon.maxHP) * 100;

  const actionLabels = ['FIGHT', 'BAG', 'POKéMON', 'RUN'];

  const currentMove = menuScreen === 'fight' ? playerPokemon.moves[selectedMove] : null;

  return (
    <div className="battle-screen">
      <div
        className="battle-viewport"
        style={{
          width: BATTLE_WIDTH,
          height: BATTLE_HEIGHT,
          transform: `scale(${scaleX}, ${scaleY})`,
          transformOrigin: 'top left',
        }}
      >
        <canvas
          ref={canvasRef}
          width={BATTLE_WIDTH}
          height={BATTLE_HEIGHT}
          className="battle-canvas"
        />

        {/* Wild Pokemon Info Box (Top Left) */}
        <div className="info-box wild-info">
          <div className="info-name-row">
            <span className="pokemon-name">{wildPokemon.species.name}</span>
            <span className="pokemon-level">Lv{wildPokemon.level}</span>
          </div>
          <div className="hp-row">
            <span className="hp-label">HP</span>
            <div className="hp-bar-outer">
              <div
                className={`hp-bar-fill ${wildHPPercent > 50 ? 'high' : wildHPPercent > 20 ? 'medium' : 'low'}`}
                style={{ width: `${wildHPPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Player Pokemon Info Box (Right side) */}
        <div className="info-box player-info">
          <div className="info-name-row">
            <span className="pokemon-name">{playerPokemon.species.name}</span>
            <span className="pokemon-level">Lv{playerPokemon.level}</span>
          </div>
          <div className="hp-row">
            <span className="hp-label">HP</span>
            <div className="hp-bar-outer">
              <div
                className={`hp-bar-fill ${playerHPPercent > 50 ? 'high' : playerHPPercent > 20 ? 'medium' : 'low'}`}
                style={{ width: `${playerHPPercent}%` }}
              />
            </div>
          </div>
          <div className="hp-numbers">
            {playerPokemon.currentHP}<span className="hp-slash">/</span>{playerPokemon.maxHP}
          </div>
          <div className="exp-bar-outer">
            <div className="exp-bar-fill" style={{ width: '60%' }} />
          </div>
        </div>

        {/* Bottom Panel */}
        <div className="bottom-panel">
          {/* Message / Info Area (left side) */}
          <div className="message-box">
            {menuScreen === 'fight' && currentMove ? (
              <div className="move-info">
                <div className="move-info-row">
                  <span className="move-info-label">TYPE/</span>
                  <span className={`move-type-badge type-${currentMove.type}`}>
                    {currentMove.type.toUpperCase()}
                  </span>
                </div>
                <div className="move-info-row">
                  <span className="move-pp">
                    PP {currentMove.pp}/{currentMove.maxPP}
                  </span>
                </div>
              </div>
            ) : menuScreen === 'bag' ? (
              <div className="message-text">No items yet...</div>
            ) : (
              <div className="message-text">{message}</div>
            )}
          </div>

          {/* Action Area (right side) */}
          <div className={`action-box ${menuScreen === 'fight' || menuScreen === 'pokemon' ? 'action-box-wide' : ''}`}>
            {state === 'selection' && !battleData.animating && (
              <>
                {menuScreen === 'main' && (
                  <div className="actions-grid">
                    {actionLabels.map((label, index) => (
                      <div
                        key={label}
                        className={`menu-item action-item ${selectedAction === index ? 'selected' : ''}`}
                        onClick={() => {
                          setSelectedAction(index);
                          if (index === 0) { setMenuScreen('fight'); setSelectedMove(0); }
                          else if (index === 1) setMenuScreen('bag');
                          else if (index === 2) { setMenuScreen('pokemon'); setSelectedPartyIndex(0); }
                          else if (index === 3) onRun();
                        }}
                      >
                        {selectedAction === index && <span className="cursor">▶</span>}
                        {label}
                      </div>
                    ))}
                  </div>
                )}

                {menuScreen === 'fight' && (
                  <div className="moves-grid">
                    {playerPokemon.moves.map((move, index) => (
                      <div
                        key={index}
                        className={`menu-item move-item ${selectedMove === index ? 'selected' : ''} ${move.pp <= 0 ? 'disabled' : ''}`}
                        onClick={() => {
                          setSelectedMove(index);
                          if (move.pp > 0) {
                            onAttack(index);
                            setMenuScreen('main');
                          }
                        }}
                      >
                        {selectedMove === index && <span className="cursor">▶</span>}
                        <span>{move.name}</span>
                      </div>
                    ))}
                  </div>
                )}

                {menuScreen === 'pokemon' && (
                  <div className="party-list">
                    {playerParty.map((pokemon, index) => {
                      const hpPct = (pokemon.currentHP / pokemon.maxHP) * 100;
                      const isActive = pokemon === playerPokemon;
                      const isFainted = pokemon.currentHP <= 0;
                      return (
                        <div
                          key={index}
                          className={`party-item ${selectedPartyIndex === index ? 'selected' : ''} ${isFainted ? 'fainted' : ''} ${isActive ? 'active' : ''}`}
                          onClick={() => {
                            setSelectedPartyIndex(index);
                            if (!isFainted && !isActive) {
                              onSwitchPokemon(index);
                              setMenuScreen('main');
                            }
                          }}
                        >
                          {selectedPartyIndex === index && <span className="cursor">▶</span>}
                          <span className="party-name">{pokemon.species.name}</span>
                          <span className="party-level">Lv{pokemon.level}</span>
                          <div className="party-hp-bar-outer">
                            <div
                              className={`hp-bar-fill ${hpPct > 50 ? 'high' : hpPct > 20 ? 'medium' : 'low'}`}
                              style={{ width: `${hpPct}%` }}
                            />
                          </div>
                          <span className="party-hp-text">{pokemon.currentHP}/{pokemon.maxHP}</span>
                          {isActive && <span className="party-active-tag">IN</span>}
                        </div>
                      );
                    })}
                  </div>
                )}

                {menuScreen === 'bag' && (
                  <div className="bag-placeholder">
                    <div className="menu-item selected">
                      <span className="cursor">▶</span>
                      CLOSE BAG
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
