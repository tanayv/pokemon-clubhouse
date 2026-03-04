import { Pokemon } from '../../types/pokemon.types';
import { getEncounterTable, generateWildPokemon } from '../../data/pokemonDatabase';

type EncounterCallback = (wildPokemon: Pokemon) => void;

export class EncounterSystem {
  private onEncounter?: EncounterCallback;

  constructor() {}

  /**
   * Check if a wild Pokemon encounter should happen
   * Called when player steps on grass tile
   */
  checkEncounter(mapId: number): Pokemon | null {
    const encounterTable = getEncounterTable(mapId);

    // Roll for encounter
    const roll = Math.random() * 100;
    if (roll > encounterTable.encounterRate) {
      return null; // No encounter
    }

    // Select Pokemon from encounter table using weighted random
    const totalWeight = encounterTable.pokemon.reduce((sum, p) => sum + p.weight, 0);
    let randomWeight = Math.random() * totalWeight;

    for (const encounter of encounterTable.pokemon) {
      randomWeight -= encounter.weight;
      if (randomWeight <= 0) {
        // Generate random level within range
        const level = Math.floor(
          Math.random() * (encounter.maxLevel - encounter.minLevel + 1) + encounter.minLevel
        );

        const wildPokemon = generateWildPokemon(encounter.speciesId, level);
        console.log(`🎲 Wild ${wildPokemon.species.name} (Lv${level}) appeared!`);

        return wildPokemon;
      }
    }

    return null;
  }

  /**
   * Set callback for when an encounter happens
   */
  setOnEncounter(callback: EncounterCallback): void {
    this.onEncounter = callback;
  }

  /**
   * Trigger an encounter with a wild Pokemon
   */
  triggerEncounter(wildPokemon: Pokemon): void {
    if (this.onEncounter) {
      this.onEncounter(wildPokemon);
    }
  }
}
