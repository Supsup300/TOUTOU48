export const ACHIEVEMENTS = Object.freeze([
  { id: "first-litter", title: "PREMIÈRE PORTÉE", description: "Réaliser votre première fusion.", reward: 25, test: (p) => p.totalMerges >= 1 },
  { id: "kennel-grows", title: "LE CHENIL S’AGRANDIT", description: "Découvrir 5 races.", reward: 50, test: (p) => p.discovered.length >= 5 },
  { id: "pack-leader", title: "CHEF DE MEUTE", description: "Découvrir 10 races.", reward: 100, test: (p) => p.discovered.length >= 10 },
  { id: "big-dog", title: "GROS TOUTOU", description: "Atteindre le Saint-Bernard.", reward: 250, test: (p) => p.maxLevel >= 18 },
  { id: "colossus", title: "COLOSSE", description: "Découvrir le Mastiff.", reward: 1000, test: (p) => p.maxLevel >= 20 }
]);

export const OBJECTIVES = Object.freeze([
  { id: "beagle", title: "Découvrir le Beagle", target: 7, unit: "level", reward: { coins: 50 } },
  { id: "score-5000", title: "Atteindre 5 000 points", target: 5000, unit: "score", reward: { coins: 75 } },
  { id: "merges-100", title: "Effectuer 100 fusions", target: 100, unit: "merges", reward: { coins: 100 } },
  { id: "breeds-10", title: "Découvrir 10 races", target: 10, unit: "breeds", reward: { joker: "shuffle" } },
  { id: "german-shepherd", title: "Atteindre le Berger Allemand", target: 12, unit: "level", reward: { coins: 150 } },
  { id: "mastiff", title: "Créer le Mastiff", target: 20, unit: "level", reward: { coins: 500 } }
]);

function objectiveValue(objective, profile, score) {
  if (objective.unit === "level") return profile.maxLevel;
  if (objective.unit === "score") return score;
  if (objective.unit === "merges") return profile.totalMerges;
  return profile.discovered.length;
}

export function evaluateProgress(profile, score, jokers) {
  const unlocked = [];
  ACHIEVEMENTS.forEach((achievement) => {
    if (!profile.achievements.includes(achievement.id) && achievement.test(profile)) {
      profile.achievements.push(achievement.id);
      profile.coins += achievement.reward;
      unlocked.push({ type: "achievement", ...achievement });
    }
  });

  OBJECTIVES.forEach((objective) => {
    if (!profile.objectives.includes(objective.id) && objectiveValue(objective, profile, score) >= objective.target) {
      profile.objectives.push(objective.id);
      if (objective.reward.coins) profile.coins += objective.reward.coins;
      if (objective.reward.joker) jokers[objective.reward.joker] += 1;
      unlocked.push({ type: "objective", ...objective });
    }
  });
  return unlocked;
}

export function objectiveProgress(objective, profile, score) {
  const value = objectiveValue(objective, profile, score);
  return { value, ratio: Math.min(1, value / objective.target) };
}
