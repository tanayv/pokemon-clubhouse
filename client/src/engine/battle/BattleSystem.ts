import { Pokemon, PokemonMove } from '../../types/pokemon.types';

export type BattleState = 'intro' | 'selection' | 'attack' | 'enemy_turn' | 'victory' | 'defeat' | 'ran_away';

type BattleEndCallback = () => void;

export interface BattleData {
  playerPokemon: Pokemon;
  wildPokemon: Pokemon;
  playerParty: Pokemon[];
  state: BattleState;
  message: string;
  animating: boolean;
}

export class BattleSystem {
  private battleData: BattleData | null = null;
  private onBattleEnd?: BattleEndCallback;
  private messageQueue: string[] = [];
  private messageTimer: number = 0;
  private readonly MESSAGE_DURATION = 1.5;

  constructor() {}

  startBattle(playerParty: Pokemon[], wildPokemon: Pokemon): void {
    // Find first alive Pokemon in party
    const activePokemon = playerParty.find(p => p.currentHP > 0);
    if (!activePokemon) return;

    this.battleData = {
      playerPokemon: activePokemon,
      wildPokemon,
      playerParty,
      state: 'intro',
      message: `Wild ${wildPokemon.species.name} appeared!`,
      animating: false
    };

    console.log(`Battle started: ${activePokemon.species.name} vs ${wildPokemon.species.name}`);
  }

  update(deltaTime: number): void {
    if (!this.battleData) return;

    if (this.battleData.state === 'intro') {
      this.messageTimer += deltaTime;
      if (this.messageTimer >= 2.0) {
        this.battleData.state = 'selection';
        this.battleData.message = `What will ${this.battleData.playerPokemon.species.name} do?`;
        this.messageTimer = 0;
      }
    }

    if (this.messageQueue.length > 0) {
      this.messageTimer += deltaTime;
      if (this.messageTimer >= this.MESSAGE_DURATION) {
        this.messageQueue.shift();
        this.messageTimer = 0;

        if (this.messageQueue.length > 0) {
          this.battleData.message = this.messageQueue[0]!;
        } else {
          this.battleData.animating = false;

          if (this.battleData.wildPokemon.currentHP <= 0) {
            this.battleData.state = 'victory';
            this.battleData.message = `Wild ${this.battleData.wildPokemon.species.name} fainted!`;
            setTimeout(() => this.endBattle(), 2000);
          } else if (this.battleData.playerPokemon.currentHP <= 0) {
            // Check if any other party member is alive
            const nextAlive = this.battleData.playerParty.find(
              p => p !== this.battleData!.playerPokemon && p.currentHP > 0
            );
            if (nextAlive) {
              this.battleData.state = 'selection';
              this.battleData.message = `${this.battleData.playerPokemon.species.name} fainted! Choose a POKéMON.`;
            } else {
              this.battleData.state = 'defeat';
              this.battleData.message = `${this.battleData.playerPokemon.species.name} fainted!`;
              setTimeout(() => this.endBattle(), 2000);
            }
          } else {
            this.battleData.state = 'selection';
            this.battleData.message = `What will ${this.battleData.playerPokemon.species.name} do?`;
          }
        }
      }
    }
  }

  attack(moveIndex: number): void {
    if (!this.battleData || this.battleData.state !== 'selection' || this.battleData.animating) return;

    const move = this.battleData.playerPokemon.moves[moveIndex];
    if (!move) return;

    // Deduct PP
    if (move.pp <= 0) return;
    move.pp--;

    this.battleData.state = 'attack';
    this.battleData.animating = true;
    this.messageQueue = [];
    this.messageTimer = 0;

    // Player attacks
    const damage = this.calculateDamage(
      this.battleData.playerPokemon,
      this.battleData.wildPokemon,
      move
    );

    this.battleData.wildPokemon.currentHP = Math.max(0, this.battleData.wildPokemon.currentHP - damage);

    this.messageQueue.push(`${this.battleData.playerPokemon.species.name} used ${move.name}!`);

    if (damage > 0) {
      this.messageQueue.push(`It dealt ${damage} damage!`);
    }

    if (this.battleData.wildPokemon.currentHP <= 0) {
      this.battleData.message = this.messageQueue[0]!;
      return;
    }

    // Enemy attacks back
    this.queueEnemyAttack();

    this.battleData.message = this.messageQueue[0]!;
  }

  switchPokemon(partyIndex: number): void {
    if (!this.battleData || this.battleData.state !== 'selection' || this.battleData.animating) return;

    const newPokemon = this.battleData.playerParty[partyIndex];
    if (!newPokemon || newPokemon.currentHP <= 0 || newPokemon === this.battleData.playerPokemon) return;

    this.battleData.state = 'attack';
    this.battleData.animating = true;
    this.messageQueue = [];
    this.messageTimer = 0;

    const oldName = this.battleData.playerPokemon.species.name;
    const newName = newPokemon.species.name;

    this.messageQueue.push(`${oldName}, come back!`);
    this.messageQueue.push(`Go! ${newName}!`);

    // Switch the active pokemon
    this.battleData.playerPokemon = newPokemon;

    // Wild Pokemon gets a free attack (switching costs a turn)
    this.queueEnemyAttack();

    this.battleData.message = this.messageQueue[0]!;
  }

  run(): void {
    if (!this.battleData || this.battleData.state !== 'selection') return;

    this.battleData.state = 'ran_away';
    this.battleData.message = 'Got away safely!';

    setTimeout(() => this.endBattle(), 1500);
  }

  private queueEnemyAttack(): void {
    if (!this.battleData) return;

    const enemyMove = this.getRandomMove(this.battleData.wildPokemon);
    const enemyDamage = this.calculateDamage(
      this.battleData.wildPokemon,
      this.battleData.playerPokemon,
      enemyMove
    );

    this.battleData.playerPokemon.currentHP = Math.max(0, this.battleData.playerPokemon.currentHP - enemyDamage);

    this.messageQueue.push(`Wild ${this.battleData.wildPokemon.species.name} used ${enemyMove.name}!`);

    if (enemyDamage > 0) {
      this.messageQueue.push(`It dealt ${enemyDamage} damage!`);
    }
  }

  private calculateDamage(attacker: Pokemon, defender: Pokemon, move: PokemonMove): number {
    if (move.power === 0) return 0;

    const level = attacker.level;
    const attack = attacker.stats.attack;
    const defense = defender.stats.defense;
    const power = move.power;

    const baseDamage = ((2 * level / 5 + 2) * power * attack / defense) / 50 + 2;
    const randomMultiplier = 0.85 + Math.random() * 0.15;

    return Math.floor(baseDamage * randomMultiplier);
  }

  private getRandomMove(pokemon: Pokemon): PokemonMove {
    const moves = pokemon.moves.filter(m => m.power > 0);
    if (moves.length === 0) {
      return pokemon.moves[0]!;
    }
    return moves[Math.floor(Math.random() * moves.length)]!;
  }

  private endBattle(): void {
    console.log('Battle ended');
    this.battleData = null;
    this.messageQueue = [];
    this.messageTimer = 0;

    if (this.onBattleEnd) {
      this.onBattleEnd();
    }
  }

  advanceMessage(): void {
    if (!this.battleData) return;
    // Skip intro timer
    if (this.battleData.state === 'intro') {
      this.messageTimer = 2.0;
      return;
    }
    // Skip current message in queue
    if (this.messageQueue.length > 0) {
      this.messageTimer = this.MESSAGE_DURATION;
    }
  }

  setOnBattleEnd(callback: BattleEndCallback): void {
    this.onBattleEnd = callback;
  }

  getBattleData(): BattleData | null {
    return this.battleData;
  }

  isBattleActive(): boolean {
    return this.battleData !== null;
  }
}
