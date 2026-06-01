# Mahjong Wizard

A guided mahjong scoring MVP for social tables. The app asks one question at a time, keeps a running score visible, lets players jump back to edit answers, and ends with a payment breakdown plus a plain-English explanation.

## Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:5173/`.

## Current Ruleset Paths

- American / NMJL-style: enter the card value, win type, concealed/jokerless context, and payment assumptions.
- Hong Kong / Cantonese: enter starting faan, table stake, cap/minimum, common faan bonuses, and win type.
- Riichi / Japanese: enter han/fu, ron/tsumo, dealer status, common yaku/dora additions, honba, and riichi sticks.

## MVP Notes

- The scoring paths are intentionally configurable and explanation-first.
- American scoring keeps the annual card hand value as user input rather than attempting card-hand recognition.
- Hong Kong scoring uses a simple faan-doubling model because house tables vary.
- Riichi scoring calculates standard rounded ron/tsumo payments, but the player is responsible for confirming yaku legality.
- Saved hands are stored locally in the browser with `localStorage`.
