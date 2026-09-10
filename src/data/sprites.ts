/**
 * 像素萌宠图库：猫 & 狗 × 5 种心情
 * 心情跟着当日涨跌幅切换：
 *   涨 ≥5% 开心到起飞 / 涨 >0 开心 / 平盘 打盹 / 跌 委屈巴巴 / 跌 ≤-5% 哇哇大哭
 */

export type PetMood = 'super' | 'happy' | 'sleep' | 'sad' | 'cry';
export type Species = 'cat' | 'dog';

export function petMoodOf(changePct: number | undefined): PetMood {
  if (changePct === undefined) return 'sleep';
  if (changePct >= 5) return 'super';
  if (changePct > 0) return 'happy';
  if (changePct <= -5) return 'cry';
  if (changePct < 0) return 'sad';
  return 'sleep';
}

/** 用股票代码决定它是猫还是狗（稳定不变） */
export function speciesOf(code: string): Species {
  let s = 0;
  for (const ch of code) s += ch.charCodeAt(0);
  return s % 2 === 0 ? 'cat' : 'dog';
}

export const SPECIES_LABEL: Record<Species, string> = {
  cat: '猫猫',
  dog: '狗狗',
};

export const MOOD_LABEL: Record<PetMood, string> = {
  super: '开心到起飞',
  happy: '开心',
  sleep: '打盹中',
  sad: '委屈巴巴',
  cry: '哇哇大哭',
};

export const PET_PALETTE: Record<string, string> = {
  d: '#6b4a3a', // 深棕描边/五官
  o: '#ffb35c', // 橘猫
  c: '#f6d8a8', // 奶油狗
  e: '#d98e4a', // 狗狗耳朵
  p: '#ff8fa3', // 粉（耳内/鼻子/腮红/舌头）
  w: '#fff6ec', // 奶白肚皮/口鼻
  h: '#ff4d6d', // 爱心
  t: '#6ec6ff', // 眼泪
  z: '#d18aa0', // ZZZ
};

/* ---------- 猫猫（16×16） ---------- */

const CAT_SUPER = [
  '......h..h......',
  '.....hhhhhh.....',
  '...d.hhhhhh.d...',
  '..dpd.hhhh.dpd..',
  '..ooo..hh..ooo..',
  '..oooooooooooo..',
  '..oohohoohohoo..',
  '..oohhhoohhhoo..',
  '..ppohoppohopp..',
  '..oooodoodooooo.',
  '..oooooddoooooo.',
  '....oooooooo..o.',
  '....oowwwwoo..o.',
  '....oowwwwoo....',
  '....oooooooo....',
  '....dd....dd....',
];

const CAT_HAPPY = [
  '................',
  '................',
  '...d........d...',
  '..dpd......dpd..',
  '..ooo......ooo..',
  '..oooooooooooo..',
  '..oododoododoo..',
  '..ooodoooodooo..',
  '..ppoooppooopp..',
  '..oooodoodooooo.',
  '..ooooooooooooo.',
  '....oooooooo..o.',
  '....oowwwwoo..o.',
  '....oowwwwoo....',
  '....oooooooo....',
  '....dd....dd....',
];

const CAT_SLEEP = [
  '................',
  '............zzz.',
  '...d........dz..',
  '..dpd......dzzz.',
  '..ooo......zzo..',
  '..ooooooooozoo..',
  '..oodddoodddoo..',
  '..oooooooooooo..',
  '..ppoooooooopp..',
  '..oooooddoooooo.',
  '..ooooooooooooo.',
  '....oooooooo..o.',
  '....oowwwwoo..o.',
  '....oowwwwoo....',
  '....oooooooo....',
  '....dd....dd....',
];

const CAT_SAD = [
  '................',
  '................',
  '................',
  '................',
  '................',
  '.oooooooooooooo.',
  '.poodoooooodoop.',
  'ooooodoooodooooo',
  '..ppoopoopoopp..',
  '..oooooddooooo..',
  '..oooooooooooo..',
  '....oooooooo....',
  '....oowwwwoo..o.',
  '....oowwwwoo..o.',
  '....oooooooo.oo.',
  '....dd....dd....',
];

const CAT_CRY = [
  '................',
  '................',
  '................',
  '................',
  '................',
  '.oooooooooooooo.',
  '.poodoooooodoop.',
  'ooooodoooodooooo',
  '..pptooooootpp..',
  '..ootooddootoo..',
  '..ootooddootoo..',
  '....oooooooo....',
  '....oowwwwoo..o.',
  '....oowwwwoo..o.',
  '....oooooooo.oo.',
  '....dd....dd....',
];

/* ---------- 狗狗（16×16） ---------- */

const DOG_SUPER = [
  '......h..h......',
  '.....hhhhhh.....',
  '.....hhhhhh.....',
  '......hhhh......',
  '.e.....hh.....e.',
  '.ecccccccccccce.',
  '.ecchchcchchcce.',
  '.eechhhddhhhcee.',
  '.eppchwppwhcppe.',
  '..ccccdwwdccccc.',
  '..cccccppcccccc.',
  '....ccccpccc..c.',
  '....ccwwwwcc..c.',
  '....ccwwwwcc....',
  '....cccccccc....',
  '....dd....dd....',
];

const DOG_HAPPY = [
  '................',
  '................',
  '................',
  '................',
  '.e............e.',
  '.ecccccccccccce.',
  '.eccdcdccdcdcce.',
  '.eeccdcddcdccee.',
  '.eppccwppwccppe.',
  '..ccccdwwdccccc.',
  '..cccccppcccccc.',
  '....ccccpccc..c.',
  '....ccwwwwcc..c.',
  '....ccwwwwcc....',
  '....cccccccc....',
  '....dd....dd....',
];

const DOG_SLEEP = [
  '................',
  '............zzz.',
  '.............z..',
  '............zzz.',
  '.e.........zz.e.',
  '.eccccccccczcce.',
  '.eccdddccdddcce.',
  '.eeccccddccccee.',
  '.eppccwwwwccppe.',
  '..ccccwddwccccc.',
  '..ccccccccccccc.',
  '....cccccccc..c.',
  '....ccwwwwcc..c.',
  '....ccwwwwcc....',
  '....cccccccc....',
  '....dd....dd....',
];

const DOG_SAD = [
  '................',
  '................',
  '................',
  '................',
  '.e............e.',
  '.ecccccccccccce.',
  '.eccdccccccdcce.',
  '.eeccdcddcdccee.',
  '.eppccpwwpccppe.',
  '..ccccwddwcccc..',
  '..cccccccccccc..',
  '....cccccccc....',
  '....ccwwwwcc..c.',
  '....ccwwwwcc..c.',
  '....cccccccc.cc.',
  '....dd....dd....',
];

const DOG_CRY = [
  '................',
  '................',
  '................',
  '................',
  '.e............e.',
  '.ecccccccccccce.',
  '.eccdccccccdcce.',
  '.eeccdcddcdccee.',
  '.epptcwwwwctppe.',
  '..cctcwddwctcc..',
  '..cctccddcctcc..',
  '....cccccccc....',
  '....ccwwwwcc..c.',
  '....ccwwwwcc..c.',
  '....cccccccc.cc.',
  '....dd....dd....',
];

export const PET_SPRITES: Record<Species, Record<PetMood, string[]>> = {
  cat: { super: CAT_SUPER, happy: CAT_HAPPY, sleep: CAT_SLEEP, sad: CAT_SAD, cry: CAT_CRY },
  dog: { super: DOG_SUPER, happy: DOG_HAPPY, sleep: DOG_SLEEP, sad: DOG_SAD, cry: DOG_CRY },
};

/** 粉色小爪印（7×6），用作 Logo / 装饰 */
export const PAW_ROWS = [
  '...p...',
  '.p...p.',
  '.......',
  '..ppp..',
  '..ppp..',
  '...p...',
];
