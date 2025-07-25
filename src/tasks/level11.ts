import {
  buy,
  ceil,
  cliExecute,
  haveEquipped,
  itemAmount,
  myAdventures,
  myAscensions,
  myMaxmp,
  myMeat,
  myPath,
  retrieveItem,
  runChoice,
  use,
  visitUrl,
} from "kolmafia";
import {
  $coinmaster,
  $effect,
  $familiar,
  $item,
  $items,
  $location,
  $monster,
  $monsters,
  $path,
  $skill,
  byStat,
  clamp,
  DaylightShavings,
  ensureEffect,
  get,
  have,
  Macro,
  set,
  uneffect,
} from "libram";
import { Quest, Task } from "../engine/task";
import { OutfitSpec, step } from "grimoire-kolmafia";
import { Priorities } from "../engine/priority";
import { CombatStrategy } from "../engine/combat";
import { atLevel, debug, haveLoathingIdolMicrophone } from "../lib";
import { councilSafe } from "./level12";
import { customRestoreMp } from "../engine/moods";
import { tryPlayApriling } from "../lib";
import { args } from "../args";

const Diary: Task[] = [
  {
    name: "Forest",
    after: ["Start"],
    prepare: () => {
      tryPlayApriling("+combat");
    },
    completed: () => step("questL11Black") >= 2,
    do: $location`The Black Forest`,
    post: () => {
      if (have($effect`Really Quite Poisoned`)) uneffect($effect`Really Quite Poisoned`);
    },
    outfit: () => {
      const equip = [$item`blackberry galoshes`, $item`Everfull Dart Holster`];
      if (have($item`latte lovers member's mug`) && !get("latteUnlocks").includes("cajun")) {
        equip.push($item`latte lovers member's mug`);
      }
      if (have($item`candy cane sword cane`) && !get("candyCaneSwordBlackForest", false))
        equip.push($item`candy cane sword cane`);

      if (have($item`reassembled blackbird`)) {
        return {
          equip: equip,
          modifier: "50 combat 5max, -ML",
        };
      }

      return {
        equip: equip,
        familiar: $familiar`Reassembled Blackbird`,
        modifier: "50 combat 5max, item, -ML",
        avoid: $items`broken champagne bottle`,
      };
    },
    peridot: () => {
      // Get the second blackbird part
      if (have($item`reassembled blackbird`)) return undefined;
      if (have($item`sunken eyes`)) return $monster`black panther`;
      if (have($item`broken wings`)) return $monster`black adder`;
      return undefined;
    },
    choices: () => {
      return {
        923: 1,
        924: beeOption(),
        928: 4,
        1018: 1,
        1019: 1,
      };
    },
    combat: new CombatStrategy()
      .ignore($monster`blackberry bush`)
      .killItem($monsters`black adder, black panther`)
      .kill(),
    orbtargets: () => undefined, // do not dodge anything with orb
    limit: { soft: 15 },
  },
  {
    name: "Buy Documents",
    after: ["Forest"],
    ready: () => myMeat() >= 5000,
    completed: () => have($item`forged identification documents`) || step("questL11Black") >= 4,
    do: (): void => {
      visitUrl("woods.php");
      visitUrl("shop.php?whichshop=blackmarket");
      visitUrl("shop.php?whichshop=blackmarket&action=buyitem&whichrow=281&ajax=1&quantity=1");
    },
    outfit: { equip: $items`designer sweatpants` },
    limit: { tries: 1 },
    skipprep: true,
  },
  {
    name: "Diary",
    after: ["Buy Documents", "Misc/Unlock Beach"],
    ready: () => myMeat() >= 500,
    completed: () => step("questL11Black") >= 4,
    do: $location`The Shore, Inc. Travel Agency`,
    post: (): void => {
      if (step("questL11Black") < 4) {
        debug("Possible mafia diary desync detected; refreshing...");
        cliExecute("refresh all");
        if (have($item`your father's MacGuffin diary`)) use($item`your father's MacGuffin diary`);
        visitUrl("questlog.php?which=1");
      }
    },
    choices: { 793: 1 },
    limit: { tries: 1 },
  },
];

const Desert: Task[] = [
  {
    name: "Scrip",
    after: ["Misc/Unlock Beach", "Misc/Unlock Island"],
    ready: () => myMeat() >= 6000 || (step("questL11Black") >= 4 && myMeat() >= 500),
    completed: () => have($item`Shore Inc. Ship Trip Scrip`) || have($item`UV-resistant compass`),
    do: $location`The Shore, Inc. Travel Agency`,
    outfit: () => {
      if (!get("candyCaneSwordShore")) return { equip: $items`candy cane sword cane` };
      else return {};
    },
    choices: () => {
      const swordReady = haveEquipped($item`candy cane sword cane`) && !get("candyCaneSwordShore");
      const statChoice = byStat({
        Muscle: 1,
        Mysticality: 2,
        Moxie: 3,
      });
      return { 793: swordReady ? 5 : statChoice };
    },
    skipprep: true,
    limit: { tries: 1 },
  },
  {
    name: "Compass",
    after: ["Misc/Unlock Beach", "Scrip"],
    completed: () => have($item`UV-resistant compass`) || get("desertExploration") >= 100,
    do: () => buy($coinmaster`The Shore, Inc. Gift Shop`, 1, $item`UV-resistant compass`),
    limit: { tries: 1 },
    freeaction: true,
  },
  {
    name: "Oasis",
    after: ["Compass"],
    completed: () => get("desertExploration") >= 100,
    ready: () => !have($effect`Ultrahydrated`) && get("oasisAvailable", false),
    do: $location`The Oasis`,
    limit: { soft: 10 },
  },
  {
    name: "Oasis Drum",
    after: ["Compass"],
    ready: () => have($item`worm-riding hooks`) || itemAmount($item`worm-riding manual page`) >= 15,
    priority: () => (have($effect`Ultrahydrated`) ? Priorities.MinorEffect : Priorities.None),
    completed: () =>
      get("desertExploration") >= 100 ||
      have($item`drum machine`) ||
      (get("gnasirProgress") & 16) !== 0,
    do: $location`The Oasis`,
    combat: new CombatStrategy().killItem($monster`blur`),
    peridot: $monster`blur`,
    outfit: { modifier: "item", avoid: $items`broken champagne bottle` },
    limit: { soft: 15 },
    parachute: $monster`blur`,
  },
  {
    name: "Oasis Rose",
    after: ["Oasis Drum", "Desert Wormride"],
    priority: () => (have($effect`Ultrahydrated`) ? Priorities.MinorEffect : Priorities.None),
    ready: () => !haveDesertSpeeder(),
    completed: () =>
      get("desertExploration") >= 100 ||
      have($item`stone rose`) ||
      (get("gnasirProgress") & 1) !== 0,
    do: $location`The Oasis`,
    limit: { soft: 15 },
  },
  {
    name: "Milestone",
    after: ["Misc/Unlock Beach", "Diary"],
    ready: () => have($item`milestone`),
    completed: () => !have($item`milestone`) || get("desertExploration") >= 100,
    do: () => {
      const needed = ceil((100 - get("desertExploration")) / 5);
      const toUse = clamp(clamp(needed, 0, itemAmount($item`milestone`)), 0, 20);
      use($item`milestone`, toUse);
    },
    limit: { tries: 5 }, // 5 to account for max of starting, poke garden & pull
    freeaction: true,
  },
  {
    name: "Desert",
    after: ["Misc/Unlock Beach", "Diary", "Compass"],
    ready: () => {
      const cond =
        (have($item`can of black paint`) ||
          myMeat() >= 1000 ||
          (get("gnasirProgress") & 2) !== 0) &&
        itemAmount($item`worm-riding manual page`) < 15 &&
        !have($item`worm-riding hooks`) &&
        ((!get("oasisAvailable", false) && !have($effect`A Girl Named Sue`)) ||
          have($effect`Ultrahydrated`)) &&
        (haveDesertSpeeder() ||
          (get("gnasirProgress") & 16) === 0 ||
          have($item`stone rose`) ||
          (get("gnasirProgress") & 1) !== 0);
      return cond;
    },
    priority: () => (have($effect`Ultrahydrated`) ? Priorities.MinorEffect : Priorities.None),
    completed: () => get("desertExploration") >= 100,
    do: $location`The Arid, Extra-Dry Desert`,
    outfit: (): OutfitSpec => {
      if (
        !have($skill`Just the Facts`) &&
        have($item`industrial fire extinguisher`) &&
        get("_fireExtinguisherCharge") >= 20 &&
        !get("fireExtinguisherDesertUsed") &&
        have($effect`Ultrahydrated`)
      )
        return {
          equip: $items`survival knife, industrial fire extinguisher, UV-resistant compass, dromedary drinking helmet`,
          familiar: $familiar`Melodramedary`,
          avoid: $items`Roman Candelabra, backup camera`,
        };
      else
        return {
          equip: $items`survival knife, UV-resistant compass, dromedary drinking helmet`,
          familiar: $familiar`Melodramedary`,
          avoid: $items`Roman Candelabra, backup camera`,
        };
    },
    combat: new CombatStrategy()
      .macro((): Macro => {
        if (
          !have($skill`Just the Facts`) &&
          have($effect`Ultrahydrated`) &&
          have($item`industrial fire extinguisher`) &&
          get("_fireExtinguisherCharge") >= 20 &&
          !get("fireExtinguisherDesertUsed")
        )
          return new Macro().trySkill($skill`Fire Extinguisher: Zone Specific`);
        else return new Macro();
      })
      .kill(),
    post: (): void => {
      if (get("lastGnasirSeen", 0) === myAscensions()) return;
      if (visitUrl("place.php?whichplace=desertbeach").includes("action=db_gnasir")) {
        set("lastGnasirSeen", myAscensions());
      } else {
        if (get("desertExploration") > 20)
          // extra buffer for milestones
          throw `Expected gnasir to appear by now but he was not detected`;
      }
    },
    nochain: true,
    limit: { soft: 30 },
    choices: { 805: 1 },
  },
  {
    name: "Desert Gnasir",
    after: ["Misc/Unlock Beach", "Diary"],
    ready: () =>
      get("lastGnasirSeen", 0) === myAscensions() &&
      (itemAmount($item`worm-riding manual page`) >= 15 ||
        ((get("gnasirProgress") & 1) === 0 && have($item`stone rose`)) ||
        ((get("gnasirProgress") & 2) === 0 && myMeat() >= 1000) ||
        ((get("gnasirProgress") & 4) === 0 && have($item`killing jar`))),
    completed: () => get("desertExploration") >= 100,
    do: () => {
      if ((get("gnasirProgress") & 2) === 0) retrieveItem($item`can of black paint`);
      let res = visitUrl("place.php?whichplace=desertbeach&action=db_gnasir");
      while (res.includes("value=2")) {
        res = runChoice(2);
      }
      runChoice(1);
    },
    freeaction: true,
    limit: { tries: 4, unready: true },
  },
  {
    name: "Desert Sightsee",
    after: ["Misc/Unlock Beach", "Diary"],
    ready: () => have($item`desert sightseeing pamphlet`),
    completed: () => get("desertExploration") >= 100,
    do: () =>
      use($item`desert sightseeing pamphlet`, itemAmount($item`desert sightseeing pamphlet`)),
    freeaction: true,
    limit: { tries: 3, unready: true },
  },
  {
    name: "Desert Wormride",
    after: ["Misc/Unlock Beach", "Diary"],
    ready: () => have($item`worm-riding hooks`) && have($item`drum machine`),
    completed: () => (get("gnasirProgress") & 16) > 0,
    do: () => use($item`drum machine`),
    freeaction: true,
    limit: { tries: 1 },
  },
];

function rotatePyramid(goal: number): void {
  const ratchets = (goal - get("pyramidPosition") + 5) % 5;
  visitUrl("place.php?whichplace=pyramid&action=pyramid_control");
  for (let i = 0; i < ratchets; i++) {
    if (have($item`crumbling wooden wheel`)) {
      visitUrl("choice.php?whichchoice=929&option=1&pwd");
    } else {
      visitUrl("choice.php?whichchoice=929&option=2&pwd");
    }
  }
  if (get("pyramidPosition") !== goal) throw `Failed to rotate pyramid to ${goal}`;
  visitUrl("choice.php?whichchoice=929&option=5&pwd");
}

const Pyramid: Task[] = [
  {
    name: "Open Pyramid",
    after: ["Desert", "Oasis", "Oasis Drum", "Manor/Boss", "Palindome/Boss", "Hidden City/Boss"],
    completed: () => step("questL11Pyramid") >= 0,
    do: () => visitUrl("place.php?whichplace=desertbeach&action=db_pyramid1"),
    limit: { tries: 1 },
    freeaction: true,
  },
  {
    name: "Upper Chamber",
    after: ["Open Pyramid"],
    completed: () => step("questL11Pyramid") >= 1,
    do: $location`The Upper Chamber`,
    outfit: { modifier: "+combat" },
    limit: { turns: 6 },
    delay: 5,
  },
  {
    name: "Middle Chamber",
    after: ["Upper Chamber"],
    prepare: () => {
      if (haveLoathingIdolMicrophone()) {
        ensureEffect($effect`Spitting Rhymes`);
      }
      if (have($item`tangle of rat tails`) && myMaxmp() >= 80) {
        customRestoreMp(80); // Weaksauce + 3x saucegeyser
      }
    },
    completed: () => {
      if (get("pyramidBombUsed")) return true;
      const ratchets = itemAmount($item`tomb ratchet`) + itemAmount($item`crumbling wooden wheel`);
      const needed = have($item`ancient bomb`) ? 3 : have($item`ancient bronze token`) ? 7 : 10;
      return ratchets >= needed;
    },
    do: $location`The Middle Chamber`,
    limit: { soft: 30 },
    combat: new CombatStrategy()
      .macro(() => {
        const result = Macro.tryItem($item`tangle of rat tails`)
          .trySkill($skill`Otoscope`)
          .trySkill($skill`Curse of Weaksauce`);
        if (have($skill`Saucegeyser`))
          return result.while_("!mpbelow 24", Macro.skill($skill`Saucegeyser`));
        return result;
      }, $monster`tomb rat`)
      .killItem([$monster`tomb rat`, $monster`tomb rat king`])
      .banish([$monster`tomb asp`, $monster`tomb servant`])
      .macro(() => {
        if (get("banishedPhyla").includes("beast"))
          return Macro.trySkill($skill`%fn, Release the Patriotic Screech!`);
        return new Macro();
      }, $monster`tomb servant`),
    outfit: () => {
      const result: OutfitSpec = { modifier: "item", equip: [] };
      if (have($item`Lil' Doctor™ bag`) && get("_otoscopeUsed") < 3)
        result.equip?.push($item`Lil' Doctor™ bag`);
      else result.equip?.push($item`deft pirate hook`);
      if (DaylightShavings.nextBuff() === $effect`Spectacle Moustache`)
        result.equip?.push($item`Daylight Shavings Helmet`);
      if (get("banishedPhyla").includes("beast")) result.familiar = $familiar`Patriotic Eagle`; // last-ditch effort to remove banish
      return result;
    },
    ignoreforbreathitin: true,
    delay: 9,
  },
  {
    name: "Middle Chamber Delay",
    after: ["Upper Chamber", "Middle Chamber"],
    prepare: () => {
      if (haveLoathingIdolMicrophone()) {
        ensureEffect($effect`Spitting Rhymes`);
      }
    },
    completed: () => {
      if (!get("controlRoomUnlock")) return false;
      if (get("pyramidBombUsed")) return true;
      const ratchets = itemAmount($item`tomb ratchet`) + itemAmount($item`crumbling wooden wheel`);
      const needed = have($item`ancient bomb`) ? 3 : have($item`ancient bronze token`) ? 7 : 10;
      return ratchets >= needed;
    },
    do: $location`The Middle Chamber`,
    limit: { soft: 30 },
    combat: new CombatStrategy().ignore(),
    delay: 9,
  },
  {
    name: "Get Token",
    after: ["Middle Chamber Delay"],
    completed: () =>
      have($item`ancient bronze token`) || have($item`ancient bomb`) || get("pyramidBombUsed"),
    do: () => rotatePyramid(4),
    limit: { tries: 1 },
  },
  {
    name: "Get Bomb",
    after: ["Get Token"],
    completed: () => have($item`ancient bomb`) || get("pyramidBombUsed"),
    do: () => rotatePyramid(3),
    limit: { tries: 1 },
  },
  {
    name: "Use Bomb",
    after: ["Get Bomb"],
    completed: () => get("pyramidBombUsed"),
    do: () => rotatePyramid(1),
    limit: { tries: 1 },
  },
  {
    name: "Boss",
    after: ["Use Bomb"],
    ready: () => myAdventures() >= 7,
    completed: () => step("questL11Pyramid") === 999,
    do: () => visitUrl("place.php?whichplace=pyramid&action=pyramid_state1a"),
    post: () => {
      // Autunmaton returning is not properly tracked
      cliExecute("refresh all");
    },
    outfit: () => {
      if (!have($item`Pick-O-Matic lockpicks`))
        return { familiar: $familiar`Gelatinous Cubeling` }; // Ensure we get equipment
      else return {};
    },
    combat: new CombatStrategy().killHard(),
    limit: { tries: 1 },
    boss: true,
  },
];

export const MacguffinQuest: Quest = {
  name: "Macguffin",
  tasks: [
    {
      name: "Start",
      after: [],
      ready: () => atLevel(11),
      completed: () => step("questL11MacGuffin") !== -1,
      do: () => visitUrl("council.php"),
      limit: { tries: 1 },
      freeaction: true,
    },
    ...Diary,
    ...Desert,
    ...Pyramid,
    {
      name: "Finish",
      after: ["Boss"],
      priority: () => (councilSafe() ? Priorities.None : Priorities.BadMood),
      completed: () => step("questL11MacGuffin") === 999,
      do: () => visitUrl("council.php"),
      limit: { tries: 1 },
      freeaction: true,
    },
  ],
};

function beeOption(): number {
  if (!args.resources.speed && !have($familiar`Shorter-Order Cook`) && !have($item`beehive`))
    return 3; // get beehive first for low-shiny
  if (!have($item`blackberry galoshes`) && itemAmount($item`blackberry`) < 3) return 1;
  if (!have($item`blackberry galoshes`) && itemAmount($item`blackberry`) >= 3) return 2;
  if (!have($familiar`Shorter-Order Cook`) && !have($item`beehive`)) return 3;
  return 1;
}

/**
 * @returns true if we have some way to speed up the desert.
 */
function haveDesertSpeeder(): boolean {
  if (myPath() === $path`Avatar of Boris`) return false;
  if (have($familiar`Melodramedary`)) return true;
  if (have($item`survival knife`)) return true;
  if (have($item`UV-resistant compass`)) return true;
  return false;
}
