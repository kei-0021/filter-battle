export type Phase = "submit" | "reveal" | "voting" | "results";

export interface Player {
  id: string;
  name: string;
}

export interface TopicWithFilters {
  title: string;
  filters: string[];
}

export type CardsMap = {
  [playerId: string]: string;
};

export type ResultMap = {
  [playerId: string]: number;
};
