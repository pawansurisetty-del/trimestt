'use strict';
(function () {
/* Trimestt artwork. All original, drawn as inline SVG so it scales and colours
   with the theme, and adds nothing to load time. */

const ART = {

/* ---------- fruit and vegetable size comparisons ---------- */
poppy:      '<circle cx="32" cy="34" r="4" fill="#5B4A6B"/><circle cx="30.5" cy="32.5" r="1.2" fill="#8B7A9B"/>',
sesame:     '<ellipse cx="32" cy="34" rx="4" ry="6" fill="#E8D3A8"/><path d="M32 28c2 3 2 9 0 12" stroke="#C9B183" stroke-width="1" fill="none"/>',
pea:        '<circle cx="32" cy="34" r="11" fill="#8FCB6B"/><circle cx="28" cy="30" r="3.5" fill="#B4E093" opacity=".7"/>',
blueberry:  '<circle cx="32" cy="35" r="14" fill="#5B6FC4"/><circle cx="27" cy="30" r="4" fill="#8194DC" opacity=".65"/><path d="M32 21l-3 4h6z" fill="#3E4E96"/><circle cx="32" cy="24" r="2.5" fill="#3E4E96"/>',
raspberry:  '<g fill="#D6467E"><circle cx="32" cy="26" r="5"/><circle cx="26" cy="32" r="5"/><circle cx="38" cy="32" r="5"/><circle cx="29" cy="39" r="5"/><circle cx="35" cy="39" r="5"/></g><path d="M28 21h8l-4-5z" fill="#6DAE5C"/>',
grape:      '<g fill="#8E5EC0"><circle cx="32" cy="24" r="5"/><circle cx="26" cy="31" r="5"/><circle cx="38" cy="31" r="5"/><circle cx="32" cy="37" r="5"/><circle cx="26" cy="43" r="4.5"/><circle cx="38" cy="43" r="4.5"/></g><path d="M32 19c0-4 3-6 6-6" stroke="#6DAE5C" stroke-width="2.4" fill="none" stroke-linecap="round"/>',
strawberry: '<path d="M32 20c11 0 16 8 16 15 0 9-9 17-16 17s-16-8-16-17c0-7 5-15 16-15z" fill="#E24A5C"/><g fill="#FFE0A8"><circle cx="27" cy="31" r="1.6"/><circle cx="37" cy="31" r="1.6"/><circle cx="32" cy="38" r="1.6"/><circle cx="24" cy="40" r="1.6"/><circle cx="40" cy="40" r="1.6"/></g><path d="M24 20h16l-8 6z" fill="#6DAE5C"/>',
fig:        '<path d="M32 20c10 0 15 9 15 16s-7 14-15 14-15-7-15-14 5-16 15-16z" fill="#7B4C86"/><path d="M26 22l6-6 6 6z" fill="#6DAE5C"/><path d="M32 33c3 0 5 3 5 6" stroke="#B77FC0" stroke-width="2" fill="none"/>',
lime:       '<circle cx="32" cy="34" r="17" fill="#7CBE4E"/><circle cx="32" cy="34" r="12" fill="#A5D97A"/><g stroke="#7CBE4E" stroke-width="1.6"><path d="M32 22v24M20 34h24M24 26l16 16M40 26L24 42"/></g>',
lemon:      '<ellipse cx="32" cy="34" rx="18" ry="14" fill="#F2CE4B"/><ellipse cx="32" cy="34" rx="12" ry="9" fill="#F8E289"/><g stroke="#E5BC33" stroke-width="1.5"><path d="M32 25v18M20 34h24M24 28l16 12M40 28L24 40"/></g>',
peach:      '<circle cx="32" cy="35" r="16" fill="#F49A7A"/><path d="M32 19c-4 6-4 24 0 32" stroke="#E07B5C" stroke-width="1.8" fill="none"/><path d="M33 20c3-4 8-5 11-3-2 4-7 6-11 3z" fill="#6DAE5C"/>',
apple:      '<path d="M32 22c-8-4-18 2-18 13 0 10 8 17 12 17 2 0 4-1 6-1s4 1 6 1c4 0 12-7 12-17 0-11-10-17-18-13z" fill="#E04B4B"/><path d="M32 22v-6" stroke="#7B5230" stroke-width="2.6" stroke-linecap="round"/><path d="M33 17c3-4 8-4 10-2-2 4-7 5-10 2z" fill="#6DAE5C"/>',
avocado:    '<path d="M32 16c8 0 14 8 14 17s-6 17-14 17-14-8-14-17 6-17 14-17z" fill="#6DAE5C"/><path d="M32 22c5 0 9 6 9 12s-4 11-9 11-9-5-9-11 4-12 9-12z" fill="#D8E8A8"/><circle cx="32" cy="37" r="6" fill="#9B6B3C"/>',
pear:       '<path d="M32 14c4 0 6 4 5 8 5 3 9 9 9 16 0 9-6 14-14 14s-14-5-14-14c0-7 4-13 9-16-1-4 1-8 5-8z" fill="#C3D45A"/><path d="M32 14v-4" stroke="#7B5230" stroke-width="2.4" stroke-linecap="round"/>',
sweetpotato:'<path d="M16 42c0-10 12-22 24-24 6-1 10 2 9 7-2 9-14 20-24 22-6 1-9-1-9-5z" fill="#C87A5A"/><path d="M24 36c5-4 12-9 17-11" stroke="#A85E42" stroke-width="1.6" fill="none"/>',
mango:      '<path d="M40 16c8 3 10 14 5 23-5 10-16 15-22 12-6-4-5-15 1-24 5-8 11-13 16-11z" fill="#F0A93C"/><path d="M36 22c-5 4-9 12-10 18" stroke="#D98C22" stroke-width="1.8" fill="none"/>',
banana:     '<path d="M16 24c2 16 12 26 28 26 3 0 5-2 4-4-12-1-22-10-24-24-1-3-8-1-8 2z" fill="#F2CE4B"/><path d="M20 26c3 12 12 19 22 21" stroke="#DDB52F" stroke-width="1.6" fill="none"/>',
carrot:     '<path d="M32 20l10 30c1 3-2 5-4 3L22 34c-2-2-1-5 2-5z" fill="#EE8B3C" transform="rotate(180 32 34)"/><path d="M28 18c-3-5-8-6-11-4 2 4 6 6 11 4zM36 18c3-5 8-6 11-4-2 4-6 6-11 4zM32 18c0-6 2-9 5-10-1 5-2 8-5 10z" fill="#6DAE5C"/>',
papaya:     '<path d="M32 14c9 0 15 10 15 22s-6 16-15 16-15-4-15-16 6-22 15-22z" fill="#EE9A4C"/><path d="M32 22c5 0 8 7 8 15s-3 10-8 10-8-2-8-10 3-15 8-15z" fill="#F4C08A"/><g fill="#4A3B2A"><circle cx="32" cy="34" r="2"/><circle cx="29" cy="39" r="1.8"/><circle cx="35" cy="39" r="1.8"/><circle cx="32" cy="44" r="1.8"/></g>',
grapefruit: '<circle cx="32" cy="34" r="18" fill="#F08A6C"/><circle cx="32" cy="34" r="13" fill="#F7B9A4"/><g stroke="#E86F4E" stroke-width="1.5"><path d="M32 21v26M19 34h26M23 25l18 18M41 25L23 43"/></g>',
corn:       '<path d="M32 12c7 0 11 8 11 20s-4 20-11 20-11-8-11-20 4-20 11-20z" fill="#F2CE4B"/><g stroke="#DDB52F" stroke-width="1.3"><path d="M27 18v32M32 16v36M37 18v32"/></g><path d="M43 22c6-4 10-2 11 2-4 6-9 6-11-2z" fill="#6DAE5C"/>',
cauliflower:'<g fill="#F4EFE0"><circle cx="32" cy="26" r="9"/><circle cx="22" cy="32" r="8"/><circle cx="42" cy="32" r="8"/><circle cx="32" cy="36" r="9"/></g><path d="M20 40c4 8 20 8 24 0-3 8-21 8-24 0z" fill="#6DAE5C"/><path d="M22 40h20v6c0 3-20 3-20 0z" fill="#8FCB6B"/>',
lettuce:    '<g fill="#8FCB6B"><circle cx="32" cy="32" r="17"/></g><g fill="#B4E093"><circle cx="26" cy="28" r="8"/><circle cx="38" cy="30" r="7"/><circle cx="32" cy="40" r="7"/></g>',
cabbage:    '<circle cx="32" cy="34" r="18" fill="#9BC97E"/><circle cx="32" cy="34" r="13" fill="#C0DFA4"/><circle cx="32" cy="34" r="7" fill="#DCEDC8"/>',
aubergine:  '<path d="M42 22c6 6 4 18-4 25s-19 7-22 1c-3-7 5-16 13-22 6-4 10-7 13-4z" fill="#7B4C86"/><path d="M42 22c2-4 6-6 9-5-1 4-4 7-9 5z" fill="#6DAE5C"/>',
pumpkin:    '<ellipse cx="32" cy="36" rx="19" ry="15" fill="#EE8B3C"/><g stroke="#D4741F" stroke-width="1.6" fill="none"><path d="M26 22c-3 8-3 20 0 28M38 22c3 8 3 20 0 28M32 21v30"/></g><path d="M32 21v-6" stroke="#6B8B3C" stroke-width="3" stroke-linecap="round"/>',
coconut:    '<circle cx="32" cy="34" r="17" fill="#8B6242"/><g fill="#5C3F28"><circle cx="26" cy="28" r="2.4"/><circle cx="36" cy="27" r="2.4"/><circle cx="31" cy="33" r="2.4"/></g><path d="M20 40c8 5 16 5 24 0" stroke="#6E4C33" stroke-width="1.6" fill="none"/>',
pineapple:  '<ellipse cx="32" cy="38" rx="14" ry="16" fill="#F0B441"/><g stroke="#D4931F" stroke-width="1.3"><path d="M22 30l20 16M42 30L22 46M32 24v28"/></g><path d="M32 22c-3-8-8-10-11-9 2 6 6 9 11 9zM32 22c3-8 8-10 11-9-2 6-6 9-11 9zM32 22c0-9 2-13 4-14-1 7-2 11-4 14z" fill="#6DAE5C"/>',
squash:     '<path d="M32 18c9 0 14 10 14 20s-5 14-14 14-14-4-14-14 5-20 14-20z" fill="#E8A44C"/><g stroke="#CF8A2E" stroke-width="1.4"><path d="M27 22v28M37 22v28"/></g><path d="M32 18v-5" stroke="#6B8B3C" stroke-width="3" stroke-linecap="round"/>',
melon:      '<circle cx="32" cy="35" r="18" fill="#A8C96B"/><g stroke="#8FB051" stroke-width="1.4" fill="none"><path d="M18 30c9 5 19 5 28 0M18 40c9 5 19 5 28 0M32 17v36"/></g>',
cantaloupe: '<circle cx="32" cy="35" r="18" fill="#E8B87A"/><g stroke="#D0A05E" stroke-width="1.2" fill="none"><path d="M16 30c10 4 22 4 32 0M16 40c10 4 22 4 32 0M22 20c-4 10-4 20 0 30M42 20c4 10 4 20 0 30"/></g>',
honeydew:   '<circle cx="32" cy="35" r="18" fill="#DCE8A8"/><circle cx="26" cy="28" r="6" fill="#EAF2C8" opacity=".7"/>',
romaine:    '<path d="M32 12c5 8 6 30 0 40-6-10-5-32 0-40z" fill="#8FCB6B"/><path d="M24 18c4 8 6 24 6 34-8-8-10-26-6-34zM40 18c-4 8-6 24-6 34 8-8 10-26 6-34z" fill="#B4E093"/>',
chard:      '<path d="M32 14c6 10 6 28 0 38-6-10-6-28 0-38z" fill="#6DAE5C"/><path d="M32 52V20" stroke="#E24A5C" stroke-width="3.4" stroke-linecap="round"/><path d="M22 22c6 6 8 20 8 28-8-6-12-20-8-28zM42 22c-6 6-8 20-8 28 8-6 12-20 8-28z" fill="#8FCB6B"/>',
leek:       '<path d="M29 50h6c2 0 3-1 3-3V28h-12v19c0 2 1 3 3 3z" fill="#EDF2E0"/><path d="M26 28h12l-2-14c-1-4-7-4-8 0z" fill="#8FCB6B"/><path d="M30 14c-2-6 0-10 2-11 2 1 4 5 2 11z" fill="#6DAE5C"/>',
watermelon: '<path d="M12 36a20 20 0 0 1 40 0z" fill="#E24A5C" transform="rotate(180 32 36)"/><ellipse cx="32" cy="36" rx="20" ry="16" fill="#6DAE5C"/><ellipse cx="32" cy="36" rx="16" ry="12" fill="#E8F0D8"/><ellipse cx="32" cy="36" rx="13" ry="9.5" fill="#E24A5C"/><g fill="#3B2A2A"><circle cx="28" cy="33" r="1.4"/><circle cx="36" cy="34" r="1.4"/><circle cx="32" cy="39" r="1.4"/></g>',

/* ---------- quick actions ---------- */
symptoms:   '<path d="M32 46s-13-8-13-17a8 8 0 0 1 13-6 8 8 0 0 1 13 6c0 9-13 17-13 17z" fill="#F9D9E4"/><path d="M20 33h6l3-6 4 12 3-6h8" stroke="#E0457C" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
medicine:   '<rect x="17" y="27" width="30" height="14" rx="7" fill="#C9D6F5" transform="rotate(-38 32 34)"/><path d="M25 41L39 27" stroke="#5B6FC4" stroke-width="2.4"/><circle cx="27" cy="37" r="1.8" fill="#5B6FC4"/><circle cx="31" cy="41" r="1.8" fill="#5B6FC4"/>',
water:      '<path d="M32 14c8 10 13 17 13 23a13 13 0 0 1-26 0c0-6 5-13 13-23z" fill="#BBDDF7"/><path d="M25 36c0 5 3 8 7 9" stroke="#3E8AC9" stroke-width="2.4" fill="none" stroke-linecap="round"/>',
weight:     '<rect x="16" y="22" width="32" height="26" rx="7" fill="#D9D3F2"/><circle cx="32" cy="35" r="8" fill="#fff"/><path d="M32 35l4-5" stroke="#5B4FCF" stroke-width="2.4" stroke-linecap="round"/><circle cx="32" cy="35" r="1.8" fill="#5B4FCF"/>',
kicks:      '<path d="M28 18a7 7 0 1 1 8 0" fill="#F9CFD9"/><circle cx="32" cy="17" r="7" fill="#F5B9C8"/><path d="M24 30c0-6 4-9 8-9s8 3 8 9c0 5-2 8-2 12 0 3-3 4-6 4s-6-1-6-4c0-4-2-7-2-12z" fill="#F5B9C8"/><path d="M40 44c4 1 6 3 6 5" stroke="#E0457C" stroke-width="2.4" fill="none" stroke-linecap="round"/>',
visit:      '<rect x="15" y="19" width="34" height="30" rx="6" fill="#D3E4DA"/><path d="M15 28h34" stroke="#4E9E7A" stroke-width="2.4"/><path d="M24 15v8M40 15v8" stroke="#4E9E7A" stroke-width="3" stroke-linecap="round"/><path d="M26 38l4 4 8-8" stroke="#4E9E7A" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
records2:   '<rect x="18" y="14" width="28" height="36" rx="5" fill="#DDE3F7"/><path d="M25 24h14M25 31h14M25 38h9" stroke="#5B6FC4" stroke-width="2.4" stroke-linecap="round"/>',

/* ---------- symptom tiles ---------- */
bleeding:   '<path d="M32 14c7 10 12 17 12 23a12 12 0 0 1-24 0c0-6 5-13 12-23z" fill="#F6C6CE"/><path d="M32 24c4 6 6 9 6 12a6 6 0 0 1-12 0c0-3 2-6 6-12z" fill="#D9384F"/>',
leaking:    '<path d="M26 12c6 8 10 14 10 19a10 10 0 0 1-20 0c0-5 4-11 10-19z" fill="#BBDDF7"/><path d="M44 30c4 6 7 9 7 12a7 7 0 0 1-14 0c0-3 3-6 7-12z" fill="#8CC5EC"/>',
headache:   '<circle cx="32" cy="36" r="14" fill="#E6DEF7"/><path d="M32 22V14M22 26l-5-5M42 26l5-5M18 36h-6M52 36h-6" stroke="#7C5FD3" stroke-width="2.8" stroke-linecap="round"/><path d="M27 38c2-3 8-3 10 0" stroke="#7C5FD3" stroke-width="2.4" fill="none" stroke-linecap="round"/>',
vision:     '<path d="M14 34c6-9 12-13 18-13s12 4 18 13c-6 9-12 13-18 13s-12-4-18-13z" fill="#DCE6F8"/><circle cx="32" cy="34" r="7" fill="#5B6FC4"/><circle cx="32" cy="34" r="3" fill="#fff" opacity=".85"/>',
breathless: '<path d="M18 30h20a6 6 0 1 0-6-6" stroke="#7FB8D9" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M16 38h26a6 6 0 1 1-6 6" stroke="#A9CFE6" stroke-width="3" fill="none" stroke-linecap="round"/>',
fever:      '<rect x="28" y="12" width="8" height="30" rx="4" fill="#F2D9C4"/><circle cx="32" cy="45" r="8" fill="#E2604A"/><rect x="30" y="26" width="4" height="18" rx="2" fill="#E2604A"/><path d="M40 20h5M40 26h5M40 32h5" stroke="#C9A88C" stroke-width="2" stroke-linecap="round"/>',
tightening: '<path d="M32 48s-14-9-14-19a9 9 0 0 1 14-7 9 9 0 0 1 14 7c0 10-14 19-14 19z" fill="#F3C9D6"/><path d="M22 30l4 6 6-8 6 8 4-6" stroke="#D9384F" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
swelling:   '<path d="M20 44c0-8 3-16 8-20 3-2 7-2 10 0 5 4 8 12 8 20z" fill="#CFE3F5"/><path d="M24 44c1-6 3-11 6-14" stroke="#5B8FC4" stroke-width="2.2" fill="none" stroke-linecap="round"/>',
vomiting:   '<path d="M22 20h20v10a10 10 0 0 1-20 0z" fill="#D6E8D2"/><path d="M22 20c0-4 4-6 10-6s10 2 10 6" stroke="#5E9E6E" stroke-width="2.6" fill="none"/><path d="M28 44c2 3 6 3 8 0" stroke="#5E9E6E" stroke-width="2.4" fill="none" stroke-linecap="round"/>',

/* ---------- feature badges ---------- */
badgeMother:'<path d="M32 44s-11-7-11-14a7 7 0 0 1 11-5 7 7 0 0 1 11 5c0 7-11 14-11 14z" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/>',
badgeDoc:   '<path d="M32 12l18 7v14c0 12-8 19-18 22-10-3-18-10-18-22V19z" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/><path d="M25 33l5 5 10-11" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
badgeCare:  '<circle cx="32" cy="24" r="8" fill="none" stroke="currentColor" stroke-width="3"/><path d="M16 50c0-9 7-15 16-15s16 6 16 15" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>',
badgeAlways:'<rect x="20" y="10" width="24" height="44" rx="6" fill="none" stroke="currentColor" stroke-width="3"/><path d="M28 16h8" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><circle cx="32" cy="46" r="2.4" fill="currentColor"/>',

/* ---------- book on the guides hero ---------- */
book: '<rect x="12" y="14" width="40" height="50" rx="5" fill="#8B7BE0"/><rect x="16" y="10" width="40" height="50" rx="5" fill="#F2EEFC" stroke="#D6CCF5" stroke-width="2"/><path d="M36 24c-3-4-9-2-9 3 0 5 9 10 9 10s9-5 9-10c0-5-6-7-9-3z" fill="#E9A6BE"/><path d="M24 44h24M24 50h16" stroke="#CFC4EF" stroke-width="2.6" stroke-linecap="round"/>'
};


ART.bot = '<g><ellipse cx="32" cy="57" rx="16" ry="3.4" fill="#241F45" opacity=".12"/>' +
  '<rect x="14" y="18" width="36" height="30" rx="13" fill="#6C5CE0"/>' +
  '<rect x="18" y="22" width="28" height="18" rx="9" fill="#F3F1FE"/>' +
  '<circle cx="26" cy="31" r="3.2" fill="#4E42BC"/><circle cx="38" cy="31" r="3.2" fill="#4E42BC"/>' +
  '<circle cx="27.2" cy="29.8" r="1" fill="#fff"/><circle cx="39.2" cy="29.8" r="1" fill="#fff"/>' +
  '<path d="M28 37c2.4 2 5.6 2 8 0" stroke="#4E42BC" stroke-width="1.8" fill="none" stroke-linecap="round"/>' +
  '<path d="M32 18v-5" stroke="#6C5CE0" stroke-width="2.6" stroke-linecap="round"/>' +
  '<circle cx="32" cy="10" r="3.4" fill="#E8356F"/>' +
  '<path d="M11 30c-3 0-4 2-4 5s1 5 4 5zM53 30c3 0 4 2 4 5s-1 5-4 5z" fill="#5B4FCF"/>' +
  '<path d="M32 44.5c-1-1-4-2.6-4-5a2.6 2.6 0 0 1 4-1.6 2.6 2.6 0 0 1 4 1.6c0 2.4-3 4-4 5z" fill="#E8356F"/></g>';

/** Render an artwork by key at a given pixel size. */
window.art = function (key, size) {
  if (!ART[key]) return '';
  const s = size || 44;
  return `<svg class="art" viewBox="0 0 64 64" width="${s}" height="${s}" aria-hidden="true">${ART[key]}</svg>`;
};

window.TRIMESTT_ART = ART;
})();

window.MOTHER_FIG = `<svg viewBox="0 0 120 130" width="112" height="122" aria-hidden="true">
  <defs>
    <linearGradient id="jskin" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#F6CBB4"/><stop offset="100%" stop-color="#E9AE93"/></linearGradient>
    <linearGradient id="jdress" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#F49AB2"/><stop offset="100%" stop-color="#E2708F"/></linearGradient>
  </defs>
  <ellipse cx="60" cy="122" rx="40" ry="8" fill="#E7DFF9" opacity=".65"/>
  <path d="M44 30c0-12 8-20 18-20s18 8 18 20c0 6-2 11-5 14 5 3 9 9 11 17 3 12 4 26 3 40l-2 20H38l-3-24c-2-14-1-28 3-38 2-6 5-10 9-12-2-4-3-10-3-17z" fill="#3B2B45"/>
  <circle cx="62" cy="34" r="16" fill="url(#jskin)"/>
  <path d="M46 32c0-11 7-18 16-18s16 7 16 18c0 3 0 5-1 7-3-6-8-10-15-10s-13 4-15 10c-1-2-1-4-1-7z" fill="#3B2B45"/>
  <path d="M55 34c1.6-1.4 3.6-1.4 5 0" stroke="#7A4258" stroke-width="1.8" fill="none" stroke-linecap="round"/>
  <path d="M66 34c1.6-1.4 3.6-1.4 5 0" stroke="#7A4258" stroke-width="1.8" fill="none" stroke-linecap="round"/>
  <path d="M59 43c2 1.6 4.4 1.6 6.4 0" stroke="#C0798B" stroke-width="1.6" fill="none" stroke-linecap="round"/>
  <path d="M48 56h28c7 0 12 6 12 14 0 16-6 30-8 40-1 6-4 8-9 8H53c-5 0-8-2-9-8-2-10-8-24-8-40 0-8 5-14 12-14z" fill="url(#jdress)"/>
  <path d="M78 78c0 12-8 20-19 20s-19-8-19-20 8-20 19-20 19 8 19 20z" fill="url(#jskin)" opacity=".96"/>
  <path d="M40 68c-5 6-7 14-6 22" stroke="url(#jskin)" stroke-width="9" fill="none" stroke-linecap="round"/>
  <path d="M80 68c5 6 7 14 6 22" stroke="url(#jskin)" stroke-width="9" fill="none" stroke-linecap="round"/>
  <path d="M52 88c-3-3-3-8 1-9 2-1 4 0 5 2 1-2 3-3 5-2 4 1 4 6 1 9-2 2-5 4-6 5-1-1-4-3-6-5z" fill="#E2607F"/>
  <g fill="#F7C9D8"><circle cx="30" cy="42" r="4"/><circle cx="94" cy="52" r="3.4"/><circle cx="24" cy="72" r="3"/></g>
</svg>`;
