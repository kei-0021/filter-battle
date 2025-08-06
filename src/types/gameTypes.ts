/** ゲームの進行フェーズ */
export type GamePhase = "lobby" | "submit" | "reveal" | "voting" | "results";

/** プレイヤーIDの型 */
export type PlayerId = string;

/** プレイヤー情報（IDと名前） */
export interface Player {
  id: PlayerId;
  name: string;
}

/** お題とそのフィルターリスト */
export interface TopicWithFilters {
  id: number;
  title: string;
  filters: string[];
}

/** プレイヤーIDとカード内容のマップ */
export type CardsMap = {
  [playerId: PlayerId]: string;
};

/** プレイヤーIDとスコアのマップ */
export type ResultMap = {
  [playerId: PlayerId]: number;
};

/** ゲームの全状態を保持するオブジェクト */
export interface GameState {
  players: Player[];
  readyPlayers: Set<PlayerId>;
  currentTopic: TopicWithFilters | null;
  currentFilter: string | null;
  filtererId: PlayerId | null;
  phase: GamePhase;
  cards: CardsMap;
  hiddenCards: CardsMap;
  submittedPlayers: Set<PlayerId>;
  submitTimer: NodeJS.Timeout | null;
  votes: Record<PlayerId, PlayerId>; // 投票者ID -> 投票先ID
  scores: ResultMap;
}
