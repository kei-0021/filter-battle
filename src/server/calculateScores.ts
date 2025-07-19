import { type GameState } from "../shared/types";

export function calculateScores(gameState: GameState) {
  const { votes, filtererId, players } = gameState;

  // 投票先ごとの得票数集計
  const voteCounts: Record<string, number> = {};
  Object.values(votes).forEach((votedId) => {
    voteCounts[votedId] = (voteCounts[votedId] || 0) + 1;
  });

  // 一番票を集めたプレイヤーのIDリスト（一人とは限らない）
  const maxVotes = Math.max(...Object.values(voteCounts), 0);
  const mostVotedPlayers = Object.entries(voteCounts)
    .filter(([, count]) => count === maxVotes && maxVotes > 0)
    .map(([playerId]) => playerId);

  // 初期スコアは0で初期化
  const scores: Record<string, number> = {};
  players.forEach(({ id }) => {
    scores[id] = 0;
  });

  // 票を投じたプレイヤーがフィルタラーを当てていたら +2点
  for (const [voterId, votedId] of Object.entries(votes)) {
    if (votedId === filtererId && voterId !== filtererId) {
      scores[voterId] += 2;
    }
  }

  // フィルタラーに対する得点加減
  if (filtererId) {
    const votedForFiltererCount = voteCounts[filtererId] || 0;
    if (votedForFiltererCount > 0) {
      // フィルタラーが当てられたら -3点
      scores[filtererId] -= 3;
    } else {
      // 誰にも当てられなかったら +3点
      scores[filtererId] += 3;
    }
  }

  // 一番票を集めてしまった人は -1点（フィルタラーでも子でも）
  mostVotedPlayers.forEach((id) => {
    scores[id] -= 1;
  });

  return scores;
}
