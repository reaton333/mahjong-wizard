export const playerNames = ["Player to Left", "Across", "Player to Right"];

export const defaultHouseRules = {
  selfPickDoubles: true,
  discardPaysDouble: true,
  jokerlessDoubles: true,
  singlesPairsSuppressesJokerless: true,
  discardPaymentScope: "all",
};

function ceil100(value) {
  return Math.ceil(value / 100) * 100;
}

function numberValue(value) {
  return Number(value) || 0;
}

function enabled(value) {
  return value !== false;
}

function americanHouseRules(a) {
  return {
    selfPickDoubles: enabled(a.americanRuleSelfPickDoubles),
    discardPaysDouble: enabled(a.americanRuleDiscarderPaysDouble),
    jokerlessDoubles: enabled(a.americanRuleJokerlessDoubles),
    singlesPairsSuppressesJokerless: enabled(a.americanRuleSinglesPairsNoJokerless),
    discardPaymentScope: a.americanRuleDiscardPaymentScope || defaultHouseRules.discardPaymentScope,
  };
}

export function computeAmerican(a) {
  const base = numberValue(a.americanBaseInput || a.americanBase);
  const rules = americanHouseRules(a);
  const isSelf = a.americanWin === "self" || a.americanWin === "joker";
  const suppressJokerless = rules.singlesPairsSuppressesJokerless && a.americanSinglesPairs;
  const jokerlessMultiplier = a.americanJokerless && rules.jokerlessDoubles && !suppressJokerless ? 2 : 1;
  const selfPickMultiplier = isSelf && rules.selfPickDoubles ? 2 : 1;
  const payments = {};

  if (isSelf) {
    playerNames.forEach((player) => {
      payments[player] = base * selfPickMultiplier * jokerlessMultiplier;
    });
  } else {
    playerNames.forEach((player) => {
      const isDiscarder = player === a.americanDiscarder;
      const paysThisHand = rules.discardPaymentScope === "all" || isDiscarder;
      const discardMultiplier = isDiscarder && rules.discardPaysDouble ? 2 : 1;
      payments[player] = paysThisHand ? base * discardMultiplier * jokerlessMultiplier : 0;
    });
  }

  const receiptRows = [
    { label: "Card value", value: base ? `${base}` : "Not entered" },
    {
      label: "Win type",
      value: isSelf
        ? a.americanWin === "joker"
          ? "Joker exchange, treated as self-picked"
          : "Self-picked"
        : `Discard from ${a.americanDiscarder}`,
    },
    {
      label: "Payment pattern",
      value: isSelf
        ? rules.selfPickDoubles
          ? "Each player pays 2x"
          : "Each player pays 1x"
        : rules.discardPaymentScope === "all"
          ? rules.discardPaysDouble
            ? "Discarder pays 2x; others pay 1x"
            : "All players pay 1x"
          : rules.discardPaysDouble
            ? "Only discarder pays 2x"
            : "Only discarder pays 1x",
    },
    {
      label: "Jokerless",
      value: a.americanJokerless
        ? suppressJokerless
          ? "No extra double because Singles & Pairs is selected"
          : rules.jokerlessDoubles
            ? "All payments doubled"
            : "No jokerless double by house rule"
        : "No jokerless multiplier",
    },
    {
      label: "Concealed",
      value:
        a.americanConcealed === "yes"
          ? "Recorded; no automatic payment bonus"
          : a.americanConcealed === "no"
            ? "Not concealed"
            : "Not sure",
    },
  ];

  const modifiers = [
    isSelf && {
      label: a.americanWin === "joker" ? "Joker exchange" : "Self-picked win",
      value: rules.selfPickDoubles ? "2x from each player" : "no double by house rule",
    },
    !isSelf && rules.discardPaysDouble && { label: "Discarder responsibility", value: `${a.americanDiscarder} pays 2x` },
    a.americanJokerless &&
      !suppressJokerless &&
      rules.jokerlessDoubles && { label: "Jokerless hand", value: "payments doubled" },
    a.americanJokerless &&
      suppressJokerless && { label: "Singles & Pairs", value: "jokerless double suppressed" },
    a.americanConcealed === "yes" && { label: "Concealed noted", value: "no automatic bonus" },
  ].filter(Boolean);

  const total = Object.values(payments).reduce((sum, value) => sum + value, 0);

  return {
    rulesetStatus: "Supported MVP",
    unitName: "card value",
    totalLabel: "Winner receives",
    handValue: base,
    total,
    payments,
    receiptRows,
    modifiers,
    warning:
      "American/NMJL groups can vary. This uses common table-payment defaults and lets you change the house rules before scoring.",
    explanation: [
      `Started with the selected card value of ${base}.`,
      receiptRows[2].value,
      receiptRows[3].value,
      `Total collected by the winner is ${total}.`,
    ],
  };
}

export function computeHongKong(a) {
  const additions = [
    a.hkWin === "self" && { label: "Self-drawn win", faan: 1 },
    a.hkConcealed && { label: "Concealed hand", faan: 1 },
    a.hkAllPungs && { label: "All pungs", faan: 3 },
    a.hkHalfFlush && !a.hkFullFlush && { label: "Half flush", faan: 3 },
    a.hkFullFlush && { label: "Full flush", faan: 7 },
    a.hkDragonPungs > 0 && { label: `${a.hkDragonPungs} dragon pung${a.hkDragonPungs > 1 ? "s" : ""}`, faan: a.hkDragonPungs },
    a.hkSeatWind && { label: "Seat wind pung", faan: 1 },
    a.hkRoundWind && { label: "Round wind pung", faan: 1 },
    a.hkNoFlowers && { label: "No flowers", faan: 1 },
    a.hkRobKong && { label: "Robbing a kong", faan: 1 },
    a.hkLastTile && { label: "Last tile", faan: 1 },
  ].filter(Boolean);
  const subtotal = Number(a.hkBaseFaan) + additions.reduce((sum, item) => sum + item.faan, 0);
  const effectiveFaan = Math.min(Math.max(subtotal, Number(a.hkMinimum)), Number(a.hkCap));
  const handValue = Number(a.hkStake) * 2 ** effectiveFaan;
  const payments = {};

  if (a.hkWin === "self") {
    playerNames.forEach((player) => {
      payments[player] = handValue * 2;
    });
  } else {
    playerNames.forEach((player) => {
      payments[player] = player === a.hkDiscarder ? handValue * 2 : handValue;
    });
  }

  return {
    rulesetStatus: "Beta",
    unitName: "faan",
    totalLabel: "Winner receives",
    handValue,
    total: Object.values(payments).reduce((sum, value) => sum + value, 0),
    payments,
    receiptRows: [
      { label: "Starting faan", value: `${a.hkBaseFaan}` },
      { label: "Bonus faan", value: additions.length ? `+${additions.reduce((sum, item) => sum + item.faan, 0)}` : "None" },
      { label: "Payable faan", value: `${effectiveFaan}` },
      { label: "Payment model", value: "Simple faan-doubling beta model" },
    ],
    modifiers: additions.map((item) => ({ label: item.label, value: `+${item.faan} faan` })),
    warning: "Hong Kong scoring is currently beta. Tables often use house payment tables, limits, and dealer rules that can differ.",
    explanation: [
      `Started with ${a.hkBaseFaan} faan.`,
      additions.length
        ? `Added ${additions.reduce((sum, item) => sum + item.faan, 0)} faan from selected bonuses.`
        : "No bonus faan were selected.",
      `Applied the table minimum of ${a.hkMinimum} and cap of ${a.hkCap}, giving ${effectiveFaan} payable faan.`,
      a.hkWin === "self"
        ? "Self-draw makes every other player pay double the hand value."
        : `${a.hkDiscarder} discarded the winning tile and pays double; the other players pay the hand value.`,
    ],
  };
}

export function riichiLimitBase(han, fu) {
  if (han >= 13) return { base: 8000, label: "Yakuman" };
  if (han >= 11) return { base: 6000, label: "Sanbaiman" };
  if (han >= 8) return { base: 4000, label: "Baiman" };
  if (han >= 6) return { base: 3000, label: "Haneman" };
  if (han >= 5 || (han === 4 && fu >= 40) || (han === 3 && fu >= 70)) {
    return { base: 2000, label: "Mangan" };
  }
  return { base: fu * 2 ** (han + 2), label: `${han} han / ${fu} fu` };
}

export function computeRiichi(a) {
  const bonusHan =
    (a.riichiRiichi ? 1 : 0) +
    (a.riichiIppatsu ? 1 : 0) +
    (a.riichiTsumo ? 1 : 0) +
    (a.riichiPinfu ? 1 : 0) +
    (a.riichiTanyao ? 1 : 0) +
    Number(a.riichiYakuhai) +
    Number(a.riichiDora) +
    Number(a.riichiUraDora) +
    Number(a.riichiRedFives);
  const han = Number(a.riichiHan) + bonusHan;
  const fu = Number(a.riichiFu);
  const limit = riichiLimitBase(han, fu);
  const honba = Number(a.riichiHonba);
  const sticks = Number(a.riichiSticks);
  const payments = {};

  if (a.riichiWin === "ron") {
    const basePayment = a.riichiDealer ? ceil100(limit.base * 6) : ceil100(limit.base * 4);
    playerNames.forEach((player) => {
      payments[player] = player === a.riichiDiscarder ? basePayment + honba * 300 : 0;
    });
  } else if (a.riichiDealer) {
    const each = ceil100(limit.base * 2) + honba * 100;
    playerNames.forEach((player) => {
      payments[player] = each;
    });
  } else {
    playerNames.forEach((player) => {
      const isDealerOpponent = player === a.riichiDealerOpponent;
      payments[player] = (isDealerOpponent ? ceil100(limit.base * 2) : ceil100(limit.base)) + honba * 100;
    });
  }

  if (sticks > 0) {
    payments["Riichi stick pool"] = sticks * 1000;
  }

  const modifiers = [
    a.riichiRiichi && { label: "Riichi", value: "+1 han" },
    a.riichiIppatsu && { label: "Ippatsu", value: "+1 han" },
    a.riichiTsumo && { label: "Menzen tsumo", value: "+1 han" },
    a.riichiPinfu && { label: "Pinfu", value: "+1 han" },
    a.riichiTanyao && { label: "Tanyao", value: "+1 han" },
    a.riichiYakuhai > 0 && { label: "Yakuhai", value: `+${a.riichiYakuhai} han` },
    a.riichiDora > 0 && { label: "Dora", value: `+${a.riichiDora} han` },
    a.riichiUraDora > 0 && { label: "Ura dora", value: `+${a.riichiUraDora} han` },
    a.riichiRedFives > 0 && { label: "Red fives", value: `+${a.riichiRedFives} han` },
  ].filter(Boolean);

  return {
    rulesetStatus: "Beta",
    unitName: "score",
    totalLabel: "Winner receives",
    handValue: limit.label,
    total: Object.values(payments).reduce((sum, value) => sum + value, 0),
    payments,
    receiptRows: [
      { label: "Starting hand", value: `${a.riichiHan} han / ${fu} fu` },
      { label: "Bonus han", value: bonusHan ? `+${bonusHan}` : "None" },
      { label: "Limit result", value: limit.label },
      { label: "Win type", value: a.riichiWin.toUpperCase() },
    ],
    modifiers,
    warning: "Riichi scoring is currently beta. The calculator assumes the selected yaku/han are legal together.",
    explanation: [
      `Started with ${a.riichiHan} base han and ${fu} fu.`,
      bonusHan ? `Added ${bonusHan} bonus han from selected yaku and dora.` : "No bonus han were selected.",
      `The hand evaluates as ${limit.label}.`,
      a.riichiWin === "ron"
        ? `${a.riichiDiscarder} pays the ron amount${honba ? ` plus ${honba} honba counter(s)` : ""}.`
        : a.riichiDealer
          ? `Dealer tsumo makes all three opponents pay the same amount${honba ? ` with ${honba} honba counter(s)` : ""}.`
          : `Non-dealer tsumo makes ${a.riichiDealerOpponent} pay the dealer share${honba ? ` with ${honba} honba counter(s)` : ""}.`,
      sticks ? `${sticks} riichi stick${sticks > 1 ? "s" : ""} on the table go to the winner.` : "No riichi deposit sticks were added.",
    ],
  };
}

export function computeScore(a) {
  if (a.ruleset === "hongkong") return computeHongKong(a);
  if (a.ruleset === "riichi") return computeRiichi(a);
  return computeAmerican(a);
}
