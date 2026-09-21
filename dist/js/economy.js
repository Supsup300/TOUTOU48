import { MONETIZATION_CONFIG } from "./config.js";

export function mergeCoinReward(totalMerges, claimedSteps = 0) {
  const steps = Math.floor(Math.max(0, totalMerges) / MONETIZATION_CONFIG.COINS_PER_MERGE_STEP);
  return { coins: Math.max(0, steps - Math.max(0, claimedSteps)), steps };
}

export function gameCoinReward(score, maxLevel) {
  return Math.min(35, Math.max(4, Math.floor(Math.max(0, score) / 750) + Math.floor(Math.max(1, maxLevel) / 3)));
}

export function canBuyJoker(coins, type) {
  const cost = MONETIZATION_CONFIG.JOKER_COSTS[type];
  return Number.isFinite(cost) && coins >= cost;
}
