import test from "node:test";
import assert from "node:assert/strict";
import { canBuyJoker, gameCoinReward, mergeCoinReward } from "../dist/js/economy.js";

test("les pièces de fusion ne sont attribuées qu'une fois", () => {
  assert.deepEqual(mergeCoinReward(4, 0), { coins: 0, steps: 0 });
  assert.deepEqual(mergeCoinReward(5, 0), { coins: 1, steps: 1 });
  assert.deepEqual(mergeCoinReward(12, 1), { coins: 1, steps: 2 });
  assert.deepEqual(mergeCoinReward(12, 2), { coins: 0, steps: 2 });
});

test("la récompense de fin reste utile mais plafonnée", () => {
  assert.equal(gameCoinReward(0, 1), 4);
  assert.equal(gameCoinReward(7500, 12), 14);
  assert.equal(gameCoinReward(999999, 20), 35);
});

test("les achats de jokers respectent le solde et le type", () => {
  assert.equal(canBuyJoker(60, "undo"), true);
  assert.equal(canBuyJoker(59, "undo"), false);
  assert.equal(canBuyJoker(999, "inconnu"), false);
});
