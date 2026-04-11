# Commander Format Rules & Validation

**Domain:** EDH / Commander deck builder
**Researched:** 2026-04-11
**Overall Confidence:** HIGH (rules sourced from official Commander website, Wizards announcements, and comprehensive rules)

---

## 1. Deck Composition Rules

### Core Rule
A Commander deck contains **exactly 100 cards**, including the commander. No more, no fewer.

### Singleton Rule
With the exception of basic lands, **no two cards in the deck may have the same English name**. The card name is the matching key — not the oracle ID or set printing. Two different printings of "Sol Ring" count as the same card and only one is allowed.

### Commander Eligibility
A card can be your commander if it meets one of these conditions:
1. It is a **legendary creature** (type line includes both "Legendary" supertype and "Creature" card type)
2. It **explicitly states "can be your commander"** in its oracle text (e.g., some planeswalkers like Rowan Kenrith, Will Kenrith, Daretti)

Cards that say "can be your commander" in their oracle text but are NOT legendary creatures are valid commanders. Scryfall tracks this with the `is:commander` search filter.

### Commander Starts in the Command Zone
The commander does not count as one of the 99 other cards — it is the 100th card. It begins the game in the Command Zone, not the library.

**Source:** [mtgcommander.net/rules](https://mtgcommander.net/index.php/rules/)

---

## 2. Color Identity

### Definition
A card's color identity is the union of:
- Its **mana cost** (all colored mana symbols)
- Any **colored mana symbols in its oracle text** (rules text)
- For **double-faced cards (DFCs)**: mana symbols and rules text on **both faces**

### What is Excluded
- **Reminder text** — mana symbols that appear in reminder text (italicized flavor clarifications) are NOT part of color identity. Example: Extort reminder text mentions {W/B} but does not give those colors to the card.
- **Flavor text** — not rules text, ignored entirely.

### Hybrid Mana
Hybrid mana symbols (e.g., `{W/U}`) contribute **both colors** to a card's color identity. A card with `{W/U}` in its cost has both White and Blue in its identity. This is the official, long-standing RC ruling — a Mono-White commander cannot run cards with `{W/U}` because that card's identity includes Blue.

**Confidence:** HIGH — confirmed by official RC statement (2022 "Hybrid Mana, Revisited" article), no change planned.
**Source:** [mtgcommander.net hybrid mana](https://mtgcommander.net/index.php/2022/10/09/hybrid-mana-revisited/)

### Phyrexian Mana
Phyrexian mana symbols (e.g., `{G/P}`) contribute their **color component** to color identity. `{G/P}` gives Green identity. A Phyrexian hybrid symbol like `{G/U/P}` contributes both Green and Blue.

**Source:** [Phyrexian mana wiki](https://mtg.fandom.com/wiki/Phyrexian_mana)

### Colorless Identity
Cards with no colored mana symbols anywhere have a **colorless identity** (represented as `[]` in Scryfall's `color_identity` array). **Any commander can include colorless-identity cards** — colorless is not a color, it is the absence of color.

### Wastes Clarification
Wastes is a colorless basic land. It has no color identity, so it can be included in any deck regardless of the commander's colors.

### Lands and Color Identity
A land's color identity comes from mana symbols in its **oracle text** (e.g., "Add {G}" gives it Green identity) and its **indicator** if any. The word "Forest" in a land's type line does NOT give it a color identity for Commander purposes unless the card explicitly produces colored mana in its text.

**Important:** A Breeding Pool says "Add {G} or {U}" so it has Green+Blue color identity. You cannot include it in a Mono-Red deck even though it is "just a land."

### Deck Constraint
Every card in the deck must have a color identity that is a **subset** of the commander's color identity. A Gruul (R+G) commander allows cards that are: Red-only, Green-only, Red+Green, or Colorless. It does not allow White, Blue, Black, or any combination including those.

---

## 3. Banned List

### Current Status (as of April 2026)
Scryfall reports **83 cards** banned in the Commander format. The February 9, 2026 announcement was the most recent update:
- **Unbanned:** Biorhythm (moved to Game Changers list), Lutri the Spellchaser (unbanned but "banned as companion" designation)
- **No new bans** in February 2026

### Individual Named Bans (as of February 2026)
The following named cards are banned. This list does NOT include categorical bans (ante, conspiracy, removed from constructed).

```
Ancestral Recall
Balance
Black Lotus
Channel
Chaos Orb
Dockside Extortionist
Emrakul, the Aeon's Torn
Erayo, Soratami Ascendant
Falling Star
Fastbond
Flash
Golos, Tireless Pilgrim
Griselbrand
Hullbreacher
Iona, Shield of Emeria
Jeweled Lotus
Karakas
Leovold, Emissary of Trest
Library of Alexandria
Limited Resources
Mana Crypt
Mox Emerald
Mox Jet
Mox Pearl
Mox Ruby
Mox Sapphire
Nadu, Winged Wisdom
Paradox Engine
Primeval Titan
Prophet of Kruphix
Recurring Nightmare
Rofellos, Llanowar Emissary
Shahrazad
Sundering Titan
Sylvan Primordial
Time Vault
Time Walk
Tinker
Tolarian Academy
Trade Secrets
Upheaval
Yawgmoth's Bargain
```

Note: The remaining ~40 cards in the 83-card ban list are categorized bans (ante cards, cards removed from constructed by WotC for non-game reasons, Conspiracy-type cards). These are not commonly encountered in typical deck building.

### Categorical Bans (Always Enforced)
- All cards with **ante mechanics** (reference "ante" in oracle text)
- All cards **removed from constructed formats by Wizards** (e.g., cards with racist/offensive imagery like Invoke Prejudice, Pradesh Gypsies, Crusade — banned from all constructed in 2020)
- All **Conspiracy card-type** cards (the card type "Conspiracy")

### Lutri Special Case
Lutri, the Spellchaser is **legal in the deck and as a commander** but is **banned as a companion**. This is a unique "banned as companion" designation, distinct from a full ban. The implementation consequence: when Lutri appears in the 99, it is fine. When it is designated as the companion (the companion zone), it is not legal.

### How to Get Banned List Programmatically
**Recommended approach:** Use Scryfall's `legalities` field on each card.

```json
{
  "legalities": {
    "commander": "banned"
  }
}
```

Possible values for `legalities.commander`:
- `"legal"` — card is legal in Commander
- `"banned"` — card is banned
- `"not_legal"` — card is not on the Commander legal set (e.g., silver-bordered, Un-set cards)
- `"restricted"` — not applicable to Commander (Commander has no restricted list)

**Scryfall keeps this current.** When WotC announces a ban/unban, Scryfall updates the `legalities` field. Relying on Scryfall's API data is more reliable than hardcoding a list.

Scryfall search for verification: `banned:commander` returns all currently banned cards.

**Sources:**
- [Commander banned list](https://mtgcommander.net/index.php/banned-list/)
- [Feb 2026 announcement](https://magic.wizards.com/en/news/announcements/commander-banned-and-restricted-february-9-2026)
- [Wargamer banlist April 2026](https://www.wargamer.com/magic-the-gathering/commander-banlist)

---

## 4. Edge Cases

### 4a. Partner Commanders (Two Commanders)

There are three distinct "partner" mechanics, and they are NOT interchangeable:

#### Partner (generic)
- Keyword: `partner` in oracle text
- Rule: Any two cards that both have `partner` may be designated co-commanders together.
- First appeared: Commander 2016
- Color identity: The combined color identity of both partners defines the deck's color identity.
- Deck size: Still exactly 100 cards, including both commanders (98-card library).

#### Partner With [Name] (named partner)
- Keyword: `partner with [card name]` in oracle text
- Rule: Only two specific named cards may be paired. You cannot mix named partners with generic partners.
- Example: Gorm the Great pairs only with Virtus the Veiled.
- Deck size: Still exactly 100 cards, including both named commanders.

#### Friends Forever
- Keyword: `friends forever` in oracle text
- Rule: Any two cards that both have `friends forever` may be co-commanders.
- First appeared: Secret Lair Stranger Things drop
- **NOT compatible with generic `partner`** — Friends Forever cards cannot partner with Partner cards.
- These function identically to Partner but are distinct flavor-based variants for non-Magic IP cards.

#### Choose a Background
- Keywords: `choose a background` on the creature, and the background card itself is a Legendary Enchantment — Background
- Rule: A legendary creature with "choose a background" may be co-commanded with any legendary Background enchantment.
- The Background is the second commander. Both start in the command zone.
- Background enchantments are not creatures, so the "legendary creature" requirement for commander eligibility is relaxed for the Background slot specifically.
- Color identity: Union of both cards' identities applies.
- First appeared: Commander Legends: Battle for Baldur's Gate

#### Validation Logic for Partners
When checking if two commanders are valid partners, check:
1. Do both have `partner` (no qualifier)? → Valid pair.
2. Does one have `partner with [Name]` where `[Name]` is the other card? → Valid pair.
3. Do both have `friends forever`? → Valid pair.
4. Does one have `choose a background` and the other is a Legendary Background? → Valid pair.
5. Any other combination → Invalid.

**Source:** [Partner wiki](https://mtg.fandom.com/wiki/Partner), [Friends Forever wiki](https://mtg.fandom.com/wiki/Friends_forever)

### 4b. Companions

A companion is a card designated from outside the deck that has a deckbuilding restriction. In Commander:
- The companion must be within the **commander's color identity**.
- The companion is NOT part of the 100-card deck — it is an effective 101st card.
- The companion must follow singleton rules.
- **Lutri the Spellchaser** is banned as a companion specifically (every U/R deck would use it).
- **Yorion, Sky Nomad** is de facto unusable as companion because its condition requires an 80+ card deck, but Commander requires exactly 100 cards — impossible to satisfy Yorion's condition and have exactly 100 cards simultaneously. It is not technically "banned as companion," it just cannot legally be one.
- Companions in Commander do NOT change your color identity — only commanders define color identity. Your companion must conform to your commander's identity.

**Source:** [Draftsim companions](https://draftsim.com/mtg-companion-rules/)

### 4c. Non-Legendary Creature Commanders

Cards that are legal commanders without being legendary creatures (must explicitly say "can be your commander" or have a variant mechanic):

Examples (not exhaustive):
- Several planeswalker cards printed with the text (e.g., Rowan Kenrith, Daretti Scrap Savant, Aminatou)
- Scryfall reports ~35 planeswalker-type cards that can be your commander
- Scryfall query: `type:planeswalker is:commander` to enumerate the current list

**Implementation note:** The safest detection method is `is:commander` via Scryfall's search, which the API supports as a filter. In bulk card data, check:
1. `type_line` includes "Legendary Creature" OR
2. `oracle_text` contains "can be your commander" (case-insensitive) OR
3. `type_line` includes "Legendary" AND the card has a partner/choose-a-background mechanic that enables it (Background enchantments)

**Source:** [Draftsim planeswalker commanders](https://draftsim.com/mtg-planeswalker-commander/)

---

## 5. Validation Logic

### 5a. Card Count Check
```
totalCards = deck.cards.length + deck.commanders.length
isValid = totalCards === 100
```
Commanders are included in the 100-card total. Partners count as 2 commanders, both included in the 100.

### 5b. Singleton Check
```
nonBasicCards = deck.cards.filter(card => !isBasicLand(card))
names = nonBasicCards.map(card => card.name.toLowerCase())
hasDuplicates = names.length !== new Set(names).size
```

**Basic land exemption:** Any card where `type_line` contains "Basic Land" (the exact supertypes "Basic" and card type "Land") is exempt from the singleton rule. This is the `"Basic"` supertype on the card. Check using `type_line` from Scryfall.

Note: The name "Plains" may appear in multiple different printings; you only need to track the name, not the Scryfall ID.

### 5c. Color Identity Check
For each non-commander card:
```
commanderIdentity = Set(commander.color_identity)  // e.g., ["R", "G"]
cardIdentity = card.color_identity                  // e.g., ["U"] 
isValid = cardIdentity.every(color => commanderIdentity.has(color))
// Colorless cards (color_identity = []) are always valid
```

For partner commanders, merge identities:
```
combinedIdentity = new Set([...commander1.color_identity, ...commander2.color_identity])
```

Scryfall's `color_identity` field on each card already handles:
- Both faces of DFCs
- Hybrid mana symbols
- Phyrexian mana symbols
- Reminder text exclusion

**Do not recompute color identity from scratch.** Use Scryfall's pre-computed `color_identity` array.

### 5d. Banned List Check
```
isBanned = card.legalities.commander === "banned"
```

Check every card in the deck AND the commander(s) against `legalities.commander`. Banned cards cannot appear anywhere in the deck, including as commander. Some cards are banned specifically as commanders (Golos, Rofellos, etc.) — the `legalities.commander === "banned"` check covers these.

**Special Lutri case:** If implementing companion support, also check that Lutri is not designated as the companion specifically. The card is legal in the deck itself.

### 5e. Valid Commander Selection
A card is a valid commander if:
1. `legalities.commander` is `"legal"` (not banned)
2. One of the following is true:
   - `type_line` matches `/Legendary.*Creature/` (regex)
   - `oracle_text` contains `"can be your commander"` (case-insensitive)
   - `type_line` contains `"Legendary"` AND `type_line` contains `"Background"` (for the background slot)

For partner validation:
- Check that `oracle_text` contains "partner" (generic), "partner with", "friends forever", or "choose a background" as appropriate.
- Validate the pairing rule (see Section 4a).

### 5f. Not Legal Cards
Cards with `legalities.commander === "not_legal"` are also invalid. These include silver-bordered cards, acorn-stamped cards, and other non-tournament-legal cards.

---

## 6. Basic Land Rules

### What Counts as a Basic Land
The **"Basic" supertype** on the type line defines what is a basic land. The 12 cards with this supertype are:

| Card Name | Color Identity | Mana Produced |
|-----------|---------------|---------------|
| Plains | White | {W} |
| Island | Blue | {U} |
| Swamp | Black | {B} |
| Mountain | Red | {R} |
| Forest | Green | {G} |
| Snow-Covered Plains | White | {W} |
| Snow-Covered Island | Blue | {U} |
| Snow-Covered Swamp | Black | {B} |
| Snow-Covered Mountain | Red | {R} |
| Snow-Covered Forest | Green | {G} |
| Wastes | Colorless | {C} |
| Snow-Covered Wastes | Colorless | {C} |

Snow-Covered Wastes was introduced in Modern Horizons 3 (2024).

### Detecting Basic Lands via Scryfall
```
isBasicLand = card.type_line.includes("Basic Land")
// or more precisely:
isBasicLand = /\bBasic\b/.test(card.type_line) && /\bLand\b/.test(card.type_line)
```

Scryfall's `type_line` for Plains reads: `"Basic Land — Plains"`
Scryfall's `type_line` for Snow-Covered Forest reads: `"Basic Snow Land — Forest"`

Both pass the `"Basic"` and `"Land"` check.

### Why Basic Lands Are Exempt from Singleton
The Commander singleton rule explicitly carves out basic lands to allow mana consistency. You may run 30 copies of Plains if you choose. All 12 cards listed above are exempt.

### Important: Non-Basic Lands with Basic Land Types
Dual lands like Bayou ("Land — Swamp Forest") have basic land **types** (subtypes) but do NOT have the "Basic" **supertype**. They are NOT basic lands and must follow the singleton rule.

### Snow Basics and Color Identity
Snow-Covered Plains has a White color identity (it produces {W}). Snow-Covered Wastes has no color identity (produces {C}). Snow is a supertype, not a color — it does not add or change color identity.

---

## 7. Scryfall API Fields Summary

Key fields on a Scryfall card object for Commander validation:

| Field | Type | Purpose |
|-------|------|---------|
| `name` | string | Card name — use for singleton comparison |
| `type_line` | string | Full type line including supertypes — check for "Legendary", "Basic", "Creature" |
| `oracle_text` | string | Rules text — check for "can be your commander", "partner", "choose a background" |
| `color_identity` | string[] | Pre-computed color identity array, e.g. `["R", "G"]` — use directly |
| `legalities.commander` | string | `"legal"`, `"banned"`, or `"not_legal"` — use for ban list check |
| `card_faces` | array | Present on DFCs/split cards; root `color_identity` covers both faces |
| `keywords` | string[] | May include "Partner", "Friends Forever" — useful shortcut but verify with oracle_text as fallback |

### Legalities Field Values for Commander
- `"legal"` — allowed in the format
- `"banned"` — explicitly banned
- `"not_legal"` — not part of the Commander card pool (silver-bordered, acorn, test cards, etc.)

Scryfall updates legalities when official ban announcements occur. This is the recommended source of truth rather than maintaining a hardcoded banned list.

---

## 8. Game Changers List (Context Only)

As of February 2026, Wizards introduced a "Game Changers" list (~53 cards) as part of the Commander Brackets system. These cards are **legal** to play in Commander — they are NOT banned. They are flagged for high power level and affect bracket categorization for pickup games.

**For validation purposes:** Ignore Game Changers. A card on the Game Changers list passes all validation checks. Only `legalities.commander === "banned"` cards are invalid.

Cards currently on Game Changers list include: Mana Drain, Rhystic Study, Thassa's Oracle, Thoracle combos, Biorhythm, Lutri (as commander), and others.

**Source:** [Game Changers explanation](https://www.tcgplayer.com/content/article/What-are-Game-Changers-in-MTG-s-Commander-Format/d65bf03f-82f8-40ad-a380-579cd1f799e2/)

---

## 9. Validation Checklist Summary

For the live validation checklist feature, these are the checks to implement:

| Check | Rule | Implementation |
|-------|------|----------------|
| Deck size | Exactly 100 cards including commander(s) | Count all cards + commanders |
| Singleton | No duplicate names except basic lands | Set deduplication on non-basic names |
| Color identity | All cards subset of commander identity | `card.color_identity` every color in `commander.color_identity` |
| Banned list | No banned cards anywhere | `card.legalities.commander !== "banned"` |
| Valid commander | Commander is eligible | Legendary Creature OR "can be your commander" text |
| Commander legality | Commander is not banned | Same ban check |
| Format legal | No non-legal cards | `card.legalities.commander !== "not_legal"` |

---

## Sources

- [Official Commander Rules](https://mtgcommander.net/index.php/rules/)
- [Official Commander Banned List](https://mtgcommander.net/index.php/banned-list/)
- [Commander Feb 2026 Ban Announcement](https://magic.wizards.com/en/news/announcements/commander-banned-and-restricted-february-9-2026)
- [Color Identity — MTG Wiki](https://mtg.fandom.com/wiki/Color_identity)
- [Partner — MTG Wiki](https://mtg.fandom.com/wiki/Partner)
- [Friends Forever — MTG Wiki](https://mtg.fandom.com/wiki/Friends_forever)
- [Choose a Background — MTG Wiki](https://mtg.fandom.com/wiki/Choose_a_Background)
- [Hybrid Mana Revisited — RC Official](https://mtgcommander.net/index.php/2022/10/09/hybrid-mana-revisited/)
- [Scryfall API Card Objects](https://scryfall.com/docs/api/cards)
- [Scryfall is:commander search](https://scryfall.com/search?q=legal:commander+is:commander)
- [Scryfall banned:commander search](https://scryfall.com/search?q=banned:commander)
- [Commander Banlist April 2026 — Wargamer](https://www.wargamer.com/magic-the-gathering/commander-banlist)
- [Game Changers — TCGPlayer](https://www.tcgplayer.com/content/article/What-are-Game-Changers-in-MTG-s-Commander-Format/d65bf03f-82f8-40ad-a380-579cd1f799e2/)
