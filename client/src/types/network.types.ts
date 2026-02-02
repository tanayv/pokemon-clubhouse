// Network-related types

import { Direction } from './game.types';

export interface PlayerData {
  id: string;
  x: number;
  y: number;
  direction: Direction;
  isMoving: boolean;
  spriteId: number;
  mapId: number;
}

export interface MoveData {
  x: number;
  y: number;
  direction: Direction;
  isMoving: boolean;
}

// Server message types
export interface InitMessage {
  type: 'INIT';
  id: string;
  players: PlayerData[];
}

export interface PlayerJoinMessage {
  type: 'PLAYER_JOIN';
  player: PlayerData;
}

export interface PlayerMoveMessage {
  type: 'PLAYER_MOVE';
  id: string;
  x: number;
  y: number;
  direction: Direction;
  isMoving: boolean;
  mapId?: number;
}

export interface PlayerLeaveMessage {
  type: 'PLAYER_LEAVE';
  id: string;
}

export type ServerMessage =
  | InitMessage
  | PlayerJoinMessage
  | PlayerMoveMessage
  | PlayerLeaveMessage;

// Callbacks for network events
export interface NetworkCallbacks {
  onInitLocalPlayer: (data: PlayerData) => void;
  onAddRemotePlayer: (data: PlayerData) => void;
  onRemoveRemotePlayer: (id: string) => void;
  onUpdateRemotePlayer: (id: string, data: MoveData) => void;
}
