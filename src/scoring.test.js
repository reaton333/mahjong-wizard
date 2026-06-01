import assert from "node:assert/strict";
import test from "node:test";
import { computeAmerican } from "./scoring.js";

const baseAnswers = {
  americanBase: 25,
  americanBaseInput: "25",
  americanWin: "discard",
  americanDiscarder: "Player to Left",
  americanConcealed: "not-sure",
  americanJokerless: false,
  americanSinglesPairs: false,
  americanRuleSelfPickDoubles: true,
  americanRuleDiscarderPaysDouble: true,
  americanRuleJokerlessDoubles: true,
  americanRuleSinglesPairsNoJokerless: true,
  americanRuleDiscardPaymentScope: "all",
};

function score(overrides = {}) {
  return computeAmerican({ ...baseAnswers, ...overrides });
}

test("American discard win: discarder pays double and others pay single", () => {
  const result = score();

  assert.deepEqual(result.payments, {
    "Player to Left": 50,
    Across: 25,
    "Player to Right": 25,
  });
  assert.equal(result.total, 100);
});

test("American self-picked win: all players pay double", () => {
  const result = score({ americanWin: "self" });

  assert.deepEqual(result.payments, {
    "Player to Left": 50,
    Across: 50,
    "Player to Right": 50,
  });
  assert.equal(result.total, 150);
});

test("American joker exchange is treated as self-picked", () => {
  const result = score({ americanWin: "joker" });

  assert.deepEqual(result.payments, {
    "Player to Left": 50,
    Across: 50,
    "Player to Right": 50,
  });
  assert.equal(result.total, 150);
});

test("American jokerless doubles every payment when not Singles & Pairs", () => {
  const result = score({ americanJokerless: true });

  assert.deepEqual(result.payments, {
    "Player to Left": 100,
    Across: 50,
    "Player to Right": 50,
  });
  assert.equal(result.total, 200);
});

test("American self-picked and jokerless doubles the self-pick payment again", () => {
  const result = score({ americanWin: "self", americanJokerless: true });

  assert.deepEqual(result.payments, {
    "Player to Left": 100,
    Across: 100,
    "Player to Right": 100,
  });
  assert.equal(result.total, 300);
});

test("Singles & Pairs suppresses separate jokerless double by default", () => {
  const result = score({ americanJokerless: true, americanSinglesPairs: true });

  assert.deepEqual(result.payments, {
    "Player to Left": 50,
    Across: 25,
    "Player to Right": 25,
  });
  assert.equal(result.total, 100);
});

test("House rule can make only discarder pay on discard wins", () => {
  const result = score({ americanRuleDiscardPaymentScope: "discarder-only" });

  assert.deepEqual(result.payments, {
    "Player to Left": 50,
    Across: 0,
    "Player to Right": 0,
  });
  assert.equal(result.total, 50);
});

test("Custom card input drives the base value", () => {
  const result = score({ americanBase: 10, americanBaseInput: "40" });

  assert.deepEqual(result.payments, {
    "Player to Left": 80,
    Across: 40,
    "Player to Right": 40,
  });
  assert.equal(result.handValue, 40);
  assert.equal(result.total, 160);
});
