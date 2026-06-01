import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  CircleHelp,
  ClipboardList,
  Edit3,
  Heart,
  ListChecks,
  Plus,
  RotateCcw,
  Save,
  Sparkles,
} from "lucide-react";
import { useMemo, useState } from "react";
import logoMark from "./logo-mark.png";

const money = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

const rulesets = {
  american: {
    name: "American / NMJL-style",
    shortName: "American",
    icon: "flower",
    summary: "Card-value scoring with clear table payments.",
    description:
      "Best first fit for many U.S. social groups. The player enters the value from the annual card, then the app applies win and payment multipliers.",
    startingStep: "base",
  },
  hongkong: {
    name: "Hong Kong / Cantonese",
    shortName: "Hong Kong",
    icon: "bamboo",
    summary: "Faan-based scoring with table stakes.",
    description:
      "A common Cantonese family/table style. The MVP uses a simple faan doubling model with editable house-rule assumptions.",
    startingStep: "base",
  },
  riichi: {
    name: "Riichi / Japanese",
    shortName: "Riichi",
    icon: "spark",
    summary: "Han and fu scoring with ron/tsumo payments.",
    description:
      "Japanese mahjong scoring uses han, fu, dealer status, deposits, and repeat counters. This path calculates standard payment math.",
    startingStep: "base",
  },
};

const baseOptions = {
  american: [10, 15, 20, 25, 30, 35, 40, 50, 75],
  hongkong: [1, 2, 3, 4, 5, 6],
  riichiHan: [1, 2, 3, 4, 5, 6, 8, 11, 13],
  riichiFu: [20, 25, 30, 40, 50, 60, 70],
};

const initialAnswers = {
  ruleset: "american",
  americanBase: 25,
  americanBaseInput: "25",
  americanWin: "discard",
  americanDiscarder: "Player to Left",
  americanConcealed: "not-sure",
  americanJokerless: false,
  americanSinglesPairs: false,
  americanPayment: "standard",
  hkBaseFaan: 3,
  hkWin: "discard",
  hkDiscarder: "Player to Left",
  hkMinimum: 3,
  hkCap: 10,
  hkStake: 1,
  hkConcealed: false,
  hkSelfDraw: false,
  hkAllPungs: false,
  hkHalfFlush: false,
  hkFullFlush: false,
  hkDragonPungs: 0,
  hkSeatWind: false,
  hkRoundWind: false,
  hkNoFlowers: false,
  hkRobKong: false,
  hkLastTile: false,
  riichiHan: 1,
  riichiFu: 30,
  riichiWin: "ron",
  riichiDiscarder: "Player to Left",
  riichiDealerOpponent: "Across",
  riichiDealer: false,
  riichiRiichi: false,
  riichiIppatsu: false,
  riichiTsumo: false,
  riichiPinfu: false,
  riichiTanyao: false,
  riichiYakuhai: 0,
  riichiDora: 0,
  riichiUraDora: 0,
  riichiRedFives: 0,
  riichiHonba: 0,
  riichiSticks: 0,
};

const stepOrder = ["ruleset", "base", "win", "details", "bonuses", "review", "payments"];
const stepLabels = {
  ruleset: "Ruleset",
  base: "Base Hand",
  win: "Win Type",
  details: "Hand Details",
  bonuses: "Bonuses",
  review: "Review",
  payments: "Payments",
};

function ceil100(value) {
  return Math.ceil(value / 100) * 100;
}

function computeAmerican(a) {
  const base = Number(a.americanBaseInput || a.americanBase) || 0;
  const jokerlessMultiplier = a.americanJokerless && !a.americanSinglesPairs ? 2 : 1;
  const isSelf = a.americanWin === "self" || a.americanWin === "joker";
  const players = ["Player to Left", "Across", "Player to Right"];
  const payments = {};

  if (isSelf) {
    players.forEach((player) => {
      payments[player] = base * 2 * jokerlessMultiplier;
    });
  } else {
    players.forEach((player) => {
      const discardMultiplier = player === a.americanDiscarder ? 2 : 1;
      payments[player] = base * discardMultiplier * jokerlessMultiplier;
    });
  }

  const modifiers = [
    isSelf && { label: "Self-picked win", value: "each player pays double" },
    a.americanWin === "joker" && { label: "Joker exchange win", value: "treated as self-picked" },
    a.americanJokerless &&
      !a.americanSinglesPairs && { label: "Jokerless hand", value: "payment doubled" },
    a.americanSinglesPairs && { label: "Singles & pairs category", value: "jokerless is already expected" },
    a.americanConcealed === "yes" && { label: "Concealed the whole hand", value: "not an added NMJL bonus" },
  ].filter(Boolean);

  return {
    unitName: "card value",
    totalLabel: "Winner receives",
    handValue: base * jokerlessMultiplier,
    total: Object.values(payments).reduce((sum, value) => sum + value, 0),
    payments,
    modifiers,
    warning: "American groups vary. This uses the common card-value payment pattern and keeps the card line's printed value as the source of truth.",
    explanation: [
      `Started with the selected card value of ${base}.`,
      isSelf
        ? "Because the hand was self-picked, each other player pays double."
        : `${a.americanDiscarder} is marked as the discarder and pays double; the other players pay the base amount.`,
      a.americanJokerless && !a.americanSinglesPairs
        ? "Jokerless was selected, so each payment is doubled again."
        : "No separate jokerless payment double was applied.",
    ],
  };
}

function computeHongKong(a) {
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
  const players = ["Player to Left", "Across", "Player to Right"];
  const payments = {};

  if (a.hkWin === "self") {
    players.forEach((player) => {
      payments[player] = handValue * 2;
    });
  } else {
    players.forEach((player) => {
      payments[player] = player === a.hkDiscarder ? handValue * 2 : handValue;
    });
  }

  return {
    unitName: "faan",
    totalLabel: "Winner receives",
    handValue,
    total: Object.values(payments).reduce((sum, value) => sum + value, 0),
    payments,
    modifiers: additions.map((item) => ({ label: item.label, value: `+${item.faan} faan` })),
    warning: "Hong Kong tables often use house payment tables. This MVP uses a simple faan-doubling model with discard/self-draw multipliers.",
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

function riichiLimitBase(han, fu) {
  if (han >= 13) return { base: 8000, label: "Yakuman" };
  if (han >= 11) return { base: 6000, label: "Sanbaiman" };
  if (han >= 8) return { base: 4000, label: "Baiman" };
  if (han >= 6) return { base: 3000, label: "Haneman" };
  if (han >= 5 || (han === 4 && fu >= 40) || (han === 3 && fu >= 70)) {
    return { base: 2000, label: "Mangan" };
  }
  return { base: fu * 2 ** (han + 2), label: `${han} han / ${fu} fu` };
}

function computeRiichi(a) {
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
  const players = ["Player to Left", "Across", "Player to Right"];

  if (a.riichiWin === "ron") {
    const basePayment = a.riichiDealer ? ceil100(limit.base * 6) : ceil100(limit.base * 4);
    players.forEach((player) => {
      payments[player] = player === a.riichiDiscarder ? basePayment + honba * 300 : 0;
    });
  } else if (a.riichiDealer) {
    const each = ceil100(limit.base * 2) + honba * 100;
    players.forEach((player) => {
      payments[player] = each;
    });
  } else {
    players.forEach((player) => {
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
    unitName: "score",
    totalLabel: "Winner receives",
    handValue: limit.label,
    total: Object.values(payments).reduce((sum, value) => sum + value, 0),
    payments,
    modifiers,
    warning: "Riichi scoring is precise, but yaku validity is still up to the player. The app assumes the selected yaku/han are legal together.",
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

function computeScore(a) {
  if (a.ruleset === "hongkong") return computeHongKong(a);
  if (a.ruleset === "riichi") return computeRiichi(a);
  return computeAmerican(a);
}

function App() {
  const [answers, setAnswers] = useState(initialAnswers);
  const [step, setStep] = useState("ruleset");
  const [savedCount, setSavedCount] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("mahjong-wizard-hands") || "[]").length;
    } catch {
      return 0;
    }
  });
  const result = useMemo(() => computeScore(answers), [answers]);
  const currentIndex = stepOrder.indexOf(step);

  function update(key, value) {
    setAnswers((current) => ({ ...current, [key]: value }));
  }

  function scrollToTop() {
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  function navigateTo(nextStep) {
    setStep(nextStep);
    scrollToTop();
  }

  function go(offset) {
    const next = stepOrder[Math.min(Math.max(currentIndex + offset, 0), stepOrder.length - 1)];
    navigateTo(next);
  }

  function reset() {
    setAnswers(initialAnswers);
    navigateTo("ruleset");
  }

  function saveHand() {
    const savedHand = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      ruleset: answers.ruleset,
      answers,
      result,
    };
    const existing = JSON.parse(localStorage.getItem("mahjong-wizard-hands") || "[]");
    const next = [savedHand, ...existing].slice(0, 20);
    localStorage.setItem("mahjong-wizard-hands", JSON.stringify(next));
    setSavedCount(next.length);
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <button className="brand" onClick={() => navigateTo("ruleset")} aria-label="Go to ruleset step">
          <img src={logoMark} alt="" />
          <span>Mahjong <strong>Wizard</strong></span>
        </button>
        <div className="header-actions">
          <button className="ghost-button" onClick={reset}>
            <RotateCcw size={18} />
            New Hand
          </button>
          <button className="save-button" onClick={saveHand}>
            <Save size={18} />
            {savedCount ? `Saved ${savedCount}` : "Save Hand"}
          </button>
        </div>
      </header>

      <main className="workspace">
        <section className="main-panel">
          <Progress current={step} onStep={navigateTo} />
          <QuestionPanel
            step={step}
            answers={answers}
            update={update}
            result={result}
          />
          <nav className="wizard-nav" aria-label="Wizard controls">
            <button className="secondary-button" onClick={() => go(-1)} disabled={currentIndex === 0}>
              <ArrowLeft size={18} />
              Back
            </button>
            <button className="text-button" onClick={() => go(1)} disabled={currentIndex >= stepOrder.length - 1}>
              Skip for now
            </button>
            <button className="primary-button" onClick={() => go(1)} disabled={currentIndex >= stepOrder.length - 1}>
              Continue
              <ArrowRight size={18} />
            </button>
          </nav>
        </section>

        <aside className="score-rail">
          <ScoreCard result={result} answers={answers} />
          <PaymentCard result={result} answers={answers} onExplain={() => navigateTo("payments")} />
        </aside>

        <SelectionTray answers={answers} setStep={navigateTo} result={result} />
      </main>

      <footer className="app-footer">
        <span>
          <CircleHelp size={18} />
          Tap any info icon for plain-English scoring help.
        </span>
        <span>
          <Heart size={20} />
          Made for mahjong friends
        </span>
      </footer>
    </div>
  );
}

function Progress({ current, onStep }) {
  return (
    <div className="progress-strip" aria-label="Scoring steps">
      {stepOrder.map((item, index) => (
        <button
          key={item}
          className={`step-pill ${current === item ? "active" : ""}`}
          onClick={() => onStep(item)}
        >
          <span>{index + 1}</span>
          {stepLabels[item]}
        </button>
      ))}
    </div>
  );
}

function QuestionPanel({ step, answers, update, result }) {
  const title = getStepTitle(step, answers);
  const subtitle = getStepSubtitle(step, answers);
  const help = getHelp(step, answers);

  return (
    <div className="question-panel">
      <div className="question-topline">
        <span>Step {stepOrder.indexOf(step) + 1} of {stepOrder.length}</span>
        <span className="help-trigger">
          <button
            className="info-button"
            aria-label={`Help: ${help.title}`}
            aria-describedby={`help-${step}`}
            type="button"
          >
            <CircleHelp size={22} />
          </button>
          <span className="help-popover" id={`help-${step}`} role="tooltip">
            <strong>{help.title}</strong>
            <span>{help.body}</span>
          </span>
        </span>
      </div>
      <h1>{title}</h1>
      <p>{subtitle}</p>

      <div className="question-body">
        {step === "ruleset" && <RulesetStep answers={answers} update={update} />}
        {step === "base" && <BaseStep answers={answers} update={update} />}
        {step === "win" && <WinStep answers={answers} update={update} />}
        {step === "details" && <DetailsStep answers={answers} update={update} />}
        {step === "bonuses" && <BonusesStep answers={answers} update={update} />}
        {step === "review" && <ReviewStep answers={answers} update={update} result={result} />}
        {step === "payments" && <FinalStep result={result} answers={answers} />}
      </div>
    </div>
  );
}

function getStepTitle(step, answers) {
  const ruleset = rulesets[answers.ruleset];
  return {
    ruleset: "Which mahjong ruleset are you using?",
    base: answers.ruleset === "riichi" ? "What are the hand's starting han and fu?" : "What is the hand's starting value?",
    win: "How did the winning tile arrive?",
    details: `Tell me the important ${ruleset.shortName} hand details.`,
    bonuses: "Which bonuses or modifiers apply?",
    review: "Review the hand before final scoring.",
    payments: "Here is the final score and payment breakdown.",
  }[step];
}

function getStepSubtitle(step, answers) {
  return {
    ruleset: "The rest of the questions adapt to this choice, including payment math.",
    base: "Start with the value your group already knows, then let Mahjong Wizard apply the modifiers.",
    win: "Win method changes who pays and, in some rulesets, the hand value itself.",
    details: "Choose what you know. Use Not sure when the table needs to decide.",
    bonuses: "Only the common beginner-friendly modifiers are shown in this MVP.",
    review: "You can jump back to any category before trusting the number.",
    payments: "Use this as the table explanation, not just a mysterious total.",
  }[step];
}

function getHelp(step, answers) {
  const copy = {
    ruleset: {
      title: "About rulesets",
      body: "Mahjong scoring is regional. Choosing the ruleset first lets the app ask the right questions and avoid irrelevant bonuses.",
    },
    base: {
      title: "About starting value",
      body:
        answers.ruleset === "american"
          ? "Use the point value printed on the card line. The app does not try to identify the card hand yet."
          : answers.ruleset === "hongkong"
            ? "Enter the faan already earned from the core hand pattern. The app adds common win and set bonuses."
            : "Riichi starts from han and fu. The app then applies limit-hand thresholds and payment rounding.",
    },
    win: {
      title: "Why win type matters",
      body: "Self-draw and discard wins change payment responsibility. Riichi also separates ron and tsumo.",
    },
    details: {
      title: "Hand details",
      body: "These answers help the app skip questions that do not apply and explain whether a choice affects value or only validation.",
    },
    bonuses: {
      title: "Bonuses",
      body: "Bonuses can add faan, add han, or multiply payments depending on the selected ruleset.",
    },
    review: {
      title: "No scoring tunnel",
      body: "Use the editable chips below or the top stepper to revisit any answer before accepting the final score.",
    },
    payments: {
      title: "Payment explanation",
      body: "The result shows who pays, why they pay that amount, and which assumptions were used.",
    },
  };
  return copy[step];
}

function RulesetStep({ answers, update }) {
  return (
    <div className="option-grid three">
      {Object.entries(rulesets).map(([key, ruleset]) => (
        <button
          key={key}
          className={`choice-card ${answers.ruleset === key ? "selected" : ""}`}
          onClick={() => update("ruleset", key)}
        >
          <TileIcon type={ruleset.icon} />
          <strong>{ruleset.name}</strong>
          <span>{ruleset.description}</span>
          {answers.ruleset === key && <CheckBadge />}
        </button>
      ))}
    </div>
  );
}

function BaseStep({ answers, update }) {
  if (answers.ruleset === "riichi") {
    return (
      <div className="split-controls">
        <SegmentGroup
          label="Starting han"
          value={answers.riichiHan}
          options={baseOptions.riichiHan}
          onChange={(value) => update("riichiHan", value)}
        />
        <SegmentGroup
          label="Fu"
          value={answers.riichiFu}
          options={baseOptions.riichiFu}
          onChange={(value) => update("riichiFu", value)}
        />
        <NumberField label="Repeat counters" value={answers.riichiHonba} onChange={(value) => update("riichiHonba", value)} />
        <NumberField label="Riichi sticks on table" value={answers.riichiSticks} onChange={(value) => update("riichiSticks", value)} />
      </div>
    );
  }

  if (answers.ruleset === "hongkong") {
    return (
      <div className="split-controls">
        <SegmentGroup
          label="Starting faan"
          value={answers.hkBaseFaan}
          options={baseOptions.hongkong}
          onChange={(value) => update("hkBaseFaan", value)}
        />
        <NumberField label="Base stake per table unit" value={answers.hkStake} onChange={(value) => update("hkStake", value)} />
        <SegmentGroup label="Minimum faan" value={answers.hkMinimum} options={[1, 2, 3, 4]} onChange={(value) => update("hkMinimum", value)} />
        <SegmentGroup label="Faan cap" value={answers.hkCap} options={[10, 13]} onChange={(value) => update("hkCap", value)} />
      </div>
    );
  }

  return (
    <div className="split-controls">
      <p className="field-guidance">
        Choose preselected card values or manually enter in the text box below.
      </p>
      <SegmentGroup
        label="Card value"
        value={answers.americanBaseInput || answers.americanBase}
        options={baseOptions.american}
        onChange={(value) => {
          update("americanBase", value);
          update("americanBaseInput", String(value));
        }}
      />
      <label className="custom-field">
        <span>Custom value</span>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={answers.americanBaseInput}
          onChange={(event) => {
            const nextValue = event.target.value.replace(/\D/g, "");
            update("americanBaseInput", nextValue);
            update("americanBase", Number(nextValue) || 0);
          }}
        />
      </label>
      <SelectField
        label="Table payment pattern"
        value={answers.americanPayment}
        onChange={(value) => update("americanPayment", value)}
        options={[
          ["standard", "Common: discarder pays double"],
          ["simple", "Simple table: use common pattern"],
        ]}
      />
    </div>
  );
}

function WinStep({ answers, update }) {
  if (answers.ruleset === "riichi") {
    return (
      <div className="split-controls">
        <ChoiceRow
          value={answers.riichiWin}
          onChange={(value) => update("riichiWin", value)}
          options={[
            ["ron", "Ron", "Won from another player's discard."],
            ["tsumo", "Tsumo", "Self-drawn winning tile."],
          ]}
        />
        {answers.riichiWin === "ron" && <DiscarderPicker value={answers.riichiDiscarder} onChange={(value) => update("riichiDiscarder", value)} />}
        {answers.riichiWin === "tsumo" && !answers.riichiDealer && (
          <SelectField
            label="Which opponent is dealer / East?"
            value={answers.riichiDealerOpponent}
            onChange={(value) => update("riichiDealerOpponent", value)}
            options={[
              ["Player to Left", "Player to Left"],
              ["Across", "Across"],
              ["Player to Right", "Player to Right"],
            ]}
          />
        )}
        <Toggle label="Winner is dealer / East" checked={answers.riichiDealer} onChange={(value) => update("riichiDealer", value)} />
      </div>
    );
  }

  if (answers.ruleset === "hongkong") {
    return (
      <div className="split-controls">
        <ChoiceRow
          value={answers.hkWin}
          onChange={(value) => update("hkWin", value)}
          options={[
            ["discard", "Discard", "Another player discarded the winning tile."],
            ["self", "Self-draw", "Winner drew the final tile from the wall."],
          ]}
        />
        {answers.hkWin === "discard" && <DiscarderPicker value={answers.hkDiscarder} onChange={(value) => update("hkDiscarder", value)} />}
      </div>
    );
  }

  return (
    <div className="split-controls">
      <ChoiceRow
        value={answers.americanWin}
        onChange={(value) => update("americanWin", value)}
        options={[
          ["discard", "Discard", "Another player discarded the mahjong tile."],
          ["self", "Self-picked", "Winner picked the mahjong tile from the wall."],
          ["joker", "Joker exchange", "Winner completed the hand by exchanging for a joker."],
        ]}
      />
      {answers.americanWin === "discard" && <DiscarderPicker value={answers.americanDiscarder} onChange={(value) => update("americanDiscarder", value)} />}
    </div>
  );
}

function DetailsStep({ answers, update }) {
  if (answers.ruleset === "american") {
    return (
      <div className="split-controls">
        <ChoiceRow
          value={answers.americanConcealed}
          onChange={(value) => update("americanConcealed", value)}
          options={[
            ["yes", "Yes", "The winner stayed concealed the whole hand."],
            ["no", "No", "The winner exposed during the hand."],
            ["not-sure", "Not sure", "Flag this for the table to confirm."],
          ]}
        />
        <Toggle label="Hand is from Singles & Pairs" checked={answers.americanSinglesPairs} onChange={(value) => update("americanSinglesPairs", value)} />
      </div>
    );
  }

  if (answers.ruleset === "hongkong") {
    return (
      <div className="toggle-grid">
        <Toggle label="Concealed hand" checked={answers.hkConcealed} onChange={(value) => update("hkConcealed", value)} />
        <Toggle label="All pungs" checked={answers.hkAllPungs} onChange={(value) => update("hkAllPungs", value)} />
        <Toggle label="Half flush" checked={answers.hkHalfFlush} onChange={(value) => update("hkHalfFlush", value)} disabled={answers.hkFullFlush} />
        <Toggle label="Full flush" checked={answers.hkFullFlush} onChange={(value) => update("hkFullFlush", value)} />
      </div>
    );
  }

  return (
    <div className="toggle-grid">
      <Toggle label="Riichi declared" checked={answers.riichiRiichi} onChange={(value) => update("riichiRiichi", value)} />
      <Toggle label="Ippatsu" checked={answers.riichiIppatsu} onChange={(value) => update("riichiIppatsu", value)} disabled={!answers.riichiRiichi} />
      <Toggle label="Menzen tsumo yaku" checked={answers.riichiTsumo} onChange={(value) => update("riichiTsumo", value)} disabled={answers.riichiWin !== "tsumo"} />
      <Toggle label="Pinfu" checked={answers.riichiPinfu} onChange={(value) => update("riichiPinfu", value)} />
      <Toggle label="Tanyao" checked={answers.riichiTanyao} onChange={(value) => update("riichiTanyao", value)} />
    </div>
  );
}

function BonusesStep({ answers, update }) {
  if (answers.ruleset === "american") {
    return (
      <div className="toggle-grid">
        <Toggle label="Jokerless hand" checked={answers.americanJokerless} onChange={(value) => update("americanJokerless", value)} />
        <InfoNote>
          In American scoring, concealed status is usually a card-line requirement rather than an extra payment bonus. Jokerless is commonly a payment double, except where the category already implies no jokers.
        </InfoNote>
      </div>
    );
  }

  if (answers.ruleset === "hongkong") {
    return (
      <div className="split-controls">
        <NumberField label="Dragon pungs" value={answers.hkDragonPungs} onChange={(value) => update("hkDragonPungs", Math.min(value, 3))} />
        <div className="toggle-grid">
          <Toggle label="Seat wind pung" checked={answers.hkSeatWind} onChange={(value) => update("hkSeatWind", value)} />
          <Toggle label="Round wind pung" checked={answers.hkRoundWind} onChange={(value) => update("hkRoundWind", value)} />
          <Toggle label="No flowers" checked={answers.hkNoFlowers} onChange={(value) => update("hkNoFlowers", value)} />
          <Toggle label="Robbing a kong" checked={answers.hkRobKong} onChange={(value) => update("hkRobKong", value)} />
          <Toggle label="Last tile" checked={answers.hkLastTile} onChange={(value) => update("hkLastTile", value)} />
        </div>
      </div>
    );
  }

  return (
    <div className="split-controls">
      <NumberField label="Yakuhai han" value={answers.riichiYakuhai} onChange={(value) => update("riichiYakuhai", value)} />
      <NumberField label="Dora" value={answers.riichiDora} onChange={(value) => update("riichiDora", value)} />
      <NumberField label="Ura dora" value={answers.riichiUraDora} onChange={(value) => update("riichiUraDora", value)} disabled={!answers.riichiRiichi} />
      <NumberField label="Red fives" value={answers.riichiRedFives} onChange={(value) => update("riichiRedFives", value)} />
    </div>
  );
}

function ReviewStep({ answers, result }) {
  return (
    <div className="review-grid">
      <SummaryBlock title="Ruleset" value={rulesets[answers.ruleset].name} />
      <SummaryBlock
        title="Starting value"
        value={
          answers.ruleset === "american"
            ? `${answers.americanBase} points`
            : answers.ruleset === "hongkong"
              ? `${answers.hkBaseFaan} faan`
              : `${answers.riichiHan} han / ${answers.riichiFu} fu`
        }
      />
      <SummaryBlock title="Current hand value" value={String(result.handValue)} />
      <SummaryBlock title="Winner receives" value={formatValue(result.total)} />
      <div className="explanation-list">
        {result.explanation.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
    </div>
  );
}

function FinalStep({ result, answers }) {
  return (
    <div className="final-view">
      <div className="final-total">
        <span>{rulesets[answers.ruleset].name}</span>
        <strong>{formatValue(result.total)}</strong>
        <em>{result.totalLabel}</em>
      </div>
      <div className="payment-list large">
        {Object.entries(result.payments).map(([player, amount]) => (
          <div key={player}>
            <span>{player}</span>
            <strong>{formatValue(amount)}</strong>
          </div>
        ))}
      </div>
      <div className="explanation-list">
        {result.explanation.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
      <InfoNote>{result.warning}</InfoNote>
    </div>
  );
}

function ScoreCard({ result, answers }) {
  return (
    <section className="rail-card">
      <h2>Running Score</h2>
      <div className="score-row">
        <span>{result.unitName === "faan" ? "Payable hand value" : "Base hand"}</span>
        <strong>{String(result.handValue)}</strong>
      </div>
      <div className="divider" />
      <div className="score-row top">
        <span>Modifiers</span>
        <strong>{result.modifiers.length}</strong>
      </div>
      <ul className="modifier-list">
        {result.modifiers.length ? (
          result.modifiers.map((item) => (
            <li key={`${item.label}${item.value}`}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </li>
          ))
        ) : (
          <li className="muted">No modifiers selected yet</li>
        )}
      </ul>
      <div className="divider" />
      <div className="score-total">
        <span>Total to Winner</span>
        <strong>{formatValue(result.total)}</strong>
      </div>
      <p className="rail-note">{rulesets[answers.ruleset].summary}</p>
    </section>
  );
}

function PaymentCard({ result, onExplain }) {
  return (
    <section className="rail-card">
      <h2>Payment Preview</h2>
      <div className="mini-tile">
        <img src={logoMark} alt="" />
        <span>Use this as the table readout once everyone agrees on the inputs.</span>
      </div>
      <div className="payment-list">
        {Object.entries(result.payments).map(([player, amount]) => (
          <div key={player}>
            <span>{player}</span>
            <strong>{formatValue(amount)}</strong>
          </div>
        ))}
      </div>
      <button className="outline-wide" onClick={onExplain}>
        <ClipboardList size={17} />
        View full explanation
      </button>
    </section>
  );
}

function SelectionTray({ answers, setStep, result }) {
  const chips = [
    ["ruleset", "Ruleset", rulesets[answers.ruleset].shortName],
    [
      "base",
      "Base",
      answers.ruleset === "riichi"
        ? `${answers.riichiHan} han/${answers.riichiFu} fu`
        : answers.ruleset === "hongkong"
          ? `${answers.hkBaseFaan} faan`
          : `${answers.americanBase} pts`,
    ],
    [
      "win",
      "Win Type",
      answers.ruleset === "riichi"
        ? answers.riichiWin.toUpperCase()
        : answers.ruleset === "hongkong"
          ? answers.hkWin
          : answers.americanWin,
    ],
    ["bonuses", "Modifiers", `${result.modifiers.length} selected`],
    ["payments", "Payments", formatValue(result.total)],
  ];

  return (
    <section className="selection-tray">
      <div className="tray-title">
        <ListChecks size={17} />
        Your selections
        <span>Review and edit anytime</span>
      </div>
      <div className="chip-grid">
        {chips.map(([target, label, value]) => (
          <button key={target} className="selection-chip" onClick={() => setStep(target)}>
            <span>
              <strong>{label}</strong>
              <em>{value}</em>
            </span>
            <Edit3 size={16} />
          </button>
        ))}
      </div>
    </section>
  );
}

function SegmentGroup({ label, value, options, onChange }) {
  return (
    <fieldset className="segment-group">
      <legend>{label}</legend>
      <div>
        {options.map((option) => (
          <button
            key={option}
            type="button"
            className={Number(value) === Number(option) ? "active" : ""}
            onClick={() => onChange(option)}
          >
            {option}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function ChoiceRow({ value, onChange, options }) {
  return (
    <div className="choice-row">
      {options.map(([key, title, body]) => (
        <button key={key} className={value === key ? "selected" : ""} onClick={() => onChange(key)}>
          <strong>{title}</strong>
          <span>{body}</span>
        </button>
      ))}
    </div>
  );
}

function Toggle({ label, checked, onChange, disabled = false }) {
  return (
    <label className={`toggle ${disabled ? "disabled" : ""}`}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

function NumberField({ label, value, onChange, disabled = false }) {
  return (
    <label className={`number-field ${disabled ? "disabled" : ""}`}>
      <span>{label}</span>
      <div>
        <button type="button" disabled={disabled} onClick={() => onChange(Math.max(0, Number(value) - 1))}>-</button>
        <input
          type="number"
          min="0"
          disabled={disabled}
          value={value}
          onChange={(event) => onChange(Math.max(0, Number(event.target.value)))}
        />
        <button type="button" disabled={disabled} onClick={() => onChange(Number(value) + 1)}>
          <Plus size={15} />
        </button>
      </div>
    </label>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <label className="select-field">
      <span>{label}</span>
      <div>
        <select value={value} onChange={(event) => onChange(event.target.value)}>
          {options.map(([key, text]) => (
            <option value={key} key={key}>
              {text}
            </option>
          ))}
        </select>
        <ChevronDown size={17} />
      </div>
    </label>
  );
}

function DiscarderPicker({ value, onChange }) {
  return (
    <SelectField
      label="Who discarded the winning tile?"
      value={value}
      onChange={onChange}
      options={[
        ["Player to Left", "Player to Left"],
        ["Across", "Across"],
        ["Player to Right", "Player to Right"],
      ]}
    />
  );
}

function SummaryBlock({ title, value }) {
  return (
    <div className="summary-block">
      <span>{title}</span>
      <strong>{value}</strong>
    </div>
  );
}

function InfoNote({ children }) {
  return (
    <div className="info-note">
      <BookOpen size={18} />
      <span>{children}</span>
    </div>
  );
}

function TileIcon({ type }) {
  return (
    <span className={`tile-icon ${type}`}>
      {type === "spark" ? <Sparkles size={34} /> : type === "bamboo" ? "II" : "✽"}
    </span>
  );
}

function CheckBadge() {
  return (
    <span className="check-badge">
      <Check size={18} />
    </span>
  );
}

function formatValue(value) {
  if (typeof value === "string") return value;
  if (!Number.isFinite(value)) return "0";
  return money.format(value);
}

export default App;
