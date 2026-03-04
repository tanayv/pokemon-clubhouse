export interface PokemonStats {
  hp: number;
  attack: number;
  defense: number;
  speed: number;
}

export interface PokemonMove {
  name: string;
  power: number;
  type: PokemonType;
  pp: number;
  maxPP: number;
}

export interface LearnableMove {
  level: number;
  move: Omit<PokemonMove, 'pp' | 'maxPP'> & { maxPP: number };
}

export type PokemonType =
  | 'normal' | 'fire' | 'water' | 'electric' | 'grass' | 'ice'
  | 'fighting' | 'poison' | 'ground' | 'flying' | 'psychic'
  | 'bug' | 'rock' | 'ghost' | 'dragon' | 'dark' | 'steel' | 'fairy';

export interface PokemonSpecies {
  id: number;
  name: string;
  type1: PokemonType;
  type2?: PokemonType;
  baseStats: PokemonStats;
  learnset: LearnableMove[];
  spriteUrl?: string;
}

export interface Pokemon {
  species: PokemonSpecies;
  level: number;
  currentHP: number;
  maxHP: number;
  stats: PokemonStats;
  moves: PokemonMove[];
  nickname?: string;
}

export interface EncounterTable {
  [mapId: number]: {
    encounterRate: number;
    pokemon: {
      speciesId: number;
      minLevel: number;
      maxLevel: number;
      weight: number;
    }[];
  };
}
