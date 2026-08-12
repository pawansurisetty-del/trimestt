'use strict';
/**
 * Clinical engine.
 *
 * Everything here is schedule arithmetic and threshold comparison against
 * values the hospital configures. It does not interpret, diagnose or advise —
 * it decides which alert tier something belongs to and hands it to a person.
 */

const DAY = 24 * 60 * 60 * 1000;

/* ---------------------------------------------------------------- dates -- */

function toDate(value) {
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) throw new Error('Invalid date: ' + value);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, days) {
  return new Date(toDate(date).getTime() + days * DAY);
}

function daysBetween(a, b) {
  return Math.round((toDate(b).getTime() - toDate(a).getTime()) / DAY);
}

function iso(date) {
  return toDate(date).toISOString().slice(0, 10);
}

/** EDD by Naegele: LMP + 280 days. */
function eddFromLmp(lmp) {
  return iso(addDays(lmp, 280));
}

/** LMP implied by a scan-confirmed EDD, so both entry routes share one model. */
function lmpFromEdd(edd) {
  return iso(addDays(edd, -280));
}

function gestation(lmp, on = new Date()) {
  const days = daysBetween(lmp, on);
  return {
    days,
    weeks: Math.floor(days / 7),
    remainder: days % 7,
    label: days < 0 ? 'Not started' : `${Math.floor(days / 7)}w ${days % 7}d`,
    trimester: days < 98 ? 1 : days < 189 ? 2 : 3
  };
}

/** How long is left. Counts down to the EDD, and up again once she passes it. */
function countdown(lmp, on = new Date()) {
  const days = 280 - daysBetween(lmp, on);
  const abs = Math.abs(days);
  const weeks = Math.floor(abs / 7);
  const rest = abs % 7;
  const parts = [];
  if (weeks) parts.push(weeks + (weeks === 1 ? ' week' : ' weeks'));
  if (rest || !weeks) parts.push(rest + (rest === 1 ? ' day' : ' days'));
  const phrase = parts.join(' ');
  return {
    days,
    weeks,
    remainder: rest,
    overdue: days < 0,
    label: days < 0 ? phrase + ' past your date'
         : days === 0 ? 'your due date is today'
         : phrase + ' to go',
    short: days < 0 ? '+' + weeks + 'w ' + rest + 'd' : weeks + 'w ' + rest + 'd'
  };
}

/* ------------------------------------------------------ antenatal plan -- */

/** Fixed clinical windows, in days from LMP. `hard` items must not be missed. */
const ANC_TEMPLATE = [
  { key: 'booking',    kind: 'visit',  title: 'Booking visit',            from: 42,  to: 70,  hard: false, prep: 'Bring any previous records and a list of medicines you take.' },
  { key: 'labs1',      kind: 'lab',    title: 'Booking blood tests',      from: 42,  to: 77,  hard: false, prep: 'Come fasting if your doctor asked for a sugar test.' },
  { key: 'nt',         kind: 'scan',   title: 'Dating and NT scan',       from: 77,  to: 97,  hard: true,  prep: 'Drink water and hold a full bladder before the scan.' },
  { key: 'visit16',    kind: 'visit',  title: 'Antenatal visit',          from: 105, to: 119, hard: false, prep: '' },
  { key: 'tetanus1',   kind: 'vaccine',title: 'Tetanus dose 1',           from: 112, to: 140, hard: false, prep: '' },
  { key: 'anomaly',    kind: 'scan',   title: 'Anomaly scan (TIFFA)',     from: 126, to: 146, hard: true,  prep: 'Allow about 45 minutes. A family member may wait with you.' },
  { key: 'tetanus2',   kind: 'vaccine',title: 'Tetanus dose 2',           from: 140, to: 168, hard: false, prep: '' },
  { key: 'visit24',    kind: 'visit',  title: 'Antenatal visit',          from: 161, to: 175, hard: false, prep: '' },
  { key: 'ogtt',       kind: 'lab',    title: 'Sugar screening (OGTT)',   from: 168, to: 202, hard: true,  prep: 'Fast overnight for 8 hours. Nothing to eat or drink except water.' },
  { key: 'antid',      kind: 'dose',   title: 'Anti-D injection',         from: 196, to: 210, hard: true,  prep: 'Only if your blood group is Rh negative.', rhNegativeOnly: true },
  { key: 'visit28',    kind: 'visit',  title: 'Antenatal visit',          from: 189, to: 203, hard: false, prep: 'Daily kick counting starts around now.' },
  { key: 'growth32',   kind: 'scan',   title: 'Growth scan',              from: 217, to: 231, hard: false, prep: '' },
  { key: 'visit32',    kind: 'visit',  title: 'Antenatal visit',          from: 217, to: 231, hard: false, prep: '' },
  { key: 'visit34',    kind: 'visit',  title: 'Antenatal visit',          from: 231, to: 245, hard: false, prep: 'Ask about your birth plan and hospital bag.' },
  { key: 'growth36',   kind: 'scan',   title: 'Growth and wellbeing scan',from: 245, to: 259, hard: false, prep: '' },
  { key: 'visit36',    kind: 'visit',  title: 'Antenatal visit',          from: 245, to: 252, hard: false, prep: '' },
  { key: 'visit37',    kind: 'visit',  title: 'Weekly visit',             from: 252, to: 259, hard: false, prep: '' },
  { key: 'visit38',    kind: 'visit',  title: 'Weekly visit',             from: 259, to: 266, hard: false, prep: '' },
  { key: 'visit39',    kind: 'visit',  title: 'Weekly visit',             from: 266, to: 273, hard: false, prep: '' },
  { key: 'visit40',    kind: 'visit',  title: 'Term review',              from: 273, to: 280, hard: false, prep: 'Bring your hospital bag to this visit.' },
  { key: 'postnatal',  kind: 'visit',  title: 'Postnatal review',         from: 294, to: 322, hard: false, prep: 'Bring the baby. Mood and recovery are checked at this visit.' }
];

function buildAncPlan(patient) {
  const lmp = patient.lmp;
  return ANC_TEMPLATE
    .filter((item) => !item.rhNegativeOnly || /negative|-$/i.test(patient.bloodGroup || ''))
    .map((item) => ({
      key: item.key,
      kind: item.kind,
      title: item.title,
      hard: item.hard,
      prep: item.prep,
      windowStart: iso(addDays(lmp, item.from)),
      windowEnd: iso(addDays(lmp, item.to)),
      weeks: `${Math.floor(item.from / 7)}–${Math.floor(item.to / 7)} weeks`
    }));
}

/* --------------------------------------------------- immunisation plan -- */

const IAP = [
  { at: 0,    unit: 'day',   items: 'BCG, OPV-0, Hepatitis B-1' },
  { at: 6,    unit: 'week',  items: 'DTwP-1, IPV-1, Hep B-2, Hib-1, Rotavirus-1, PCV-1' },
  { at: 10,   unit: 'week',  items: 'DTwP-2, IPV-2, Hib-2, Rotavirus-2, PCV-2' },
  { at: 14,   unit: 'week',  items: 'DTwP-3, IPV-3, Hib-3, Rotavirus-3, PCV-3' },
  { at: 6,    unit: 'month', items: 'OPV-1, Hep B-3, Influenza-1' },
  { at: 7,    unit: 'month', items: 'Influenza-2' },
  { at: 9,    unit: 'month', items: 'MMR-1, OPV-2, Typhoid conjugate' },
  { at: 12,   unit: 'month', items: 'Hepatitis A-1' },
  { at: 15,   unit: 'month', items: 'MMR-2, Varicella-1, PCV booster' },
  { at: 18,   unit: 'month', items: 'DTwP booster-1, IPV booster, Hib booster, Hep A-2' },
  { at: 24,   unit: 'month', items: 'Varicella-2' },
  { at: 60,   unit: 'month', items: 'DTwP booster-2, OPV-3, MMR-3' }
];

const NIS = [
  { at: 0,    unit: 'day',   items: 'BCG, OPV-0, Hepatitis B birth dose' },
  { at: 6,    unit: 'week',  items: 'Pentavalent-1, OPV-1, Rotavirus-1, fIPV-1, PCV-1' },
  { at: 10,   unit: 'week',  items: 'Pentavalent-2, OPV-2, Rotavirus-2' },
  { at: 14,   unit: 'week',  items: 'Pentavalent-3, OPV-3, Rotavirus-3, fIPV-2, PCV-2' },
  { at: 9,    unit: 'month', items: 'Measles-Rubella-1, PCV booster, Vitamin A-1' },
  { at: 16,   unit: 'month', items: 'Measles-Rubella-2, DPT booster-1, OPV booster' },
  { at: 60,   unit: 'month', items: 'DPT booster-2' }
];

function buildImmunisationPlan(dob, schedule = 'IAP') {
  const template = schedule === 'NIS' ? NIS : IAP;
  return template.map((row) => {
    const days = row.unit === 'day' ? row.at : row.unit === 'week' ? row.at * 7 : Math.round(row.at * 30.44);
    const due = addDays(dob, days);
    return {
      key: `${row.unit}${row.at}`,
      dueOn: iso(due),
      catchUpBy: iso(addDays(due, 28)),
      age: row.unit === 'day' ? 'At birth' : `${row.at} ${row.unit}${row.at > 1 ? 's' : ''}`,
      items: row.items
    };
  });
}

/* --------------------------------------------------------- thresholds -- */

const DEFAULT_THRESHOLDS = {
  systolicHigh: 140,
  diastolicHigh: 90,
  systolicSevere: 160,
  diastolicSevere: 110,
  fastingSugarHigh: 95,
  postMealSugarHigh: 140,
  kicksMinimumPer12h: 10,
  weeklyWeightGainMaxKg: 0.75
};

/**
 * Grade one daily log against this hospital's thresholds.
 * Returns alerts, each already carrying the tier it belongs to.
 * Nothing here is a diagnosis — every tier 4 result routes to hospital staff.
 */
function gradeLog(log, hospital) {
  const t = Object.assign({}, DEFAULT_THRESHOLDS, (hospital && hospital.thresholds) || {});
  const alerts = [];

  const add = (tier, reason, detail) => alerts.push({ tier, reason, detail });

  if (log.systolic || log.diastolic) {
    const sys = Number(log.systolic) || 0;
    const dia = Number(log.diastolic) || 0;
    if (sys >= t.systolicSevere || dia >= t.diastolicSevere) {
      add(4, 'Blood pressure very high', `${sys}/${dia} — above the severe threshold set by the hospital.`);
    } else if (sys >= t.systolicHigh || dia >= t.diastolicHigh) {
      add(4, 'Blood pressure high', `${sys}/${dia} — above ${t.systolicHigh}/${t.diastolicHigh}.`);
    }
  }

  if (log.fastingSugar && Number(log.fastingSugar) > t.fastingSugarHigh) {
    add(3, 'Fasting sugar above range', `${log.fastingSugar} mg/dL against a target of ${t.fastingSugarHigh}.`);
  }
  if (log.postMealSugar && Number(log.postMealSugar) > t.postMealSugarHigh) {
    add(3, 'Post-meal sugar above range', `${log.postMealSugar} mg/dL against a target of ${t.postMealSugarHigh}.`);
  }

  if (log.kicks !== undefined && log.kicks !== null && log.kicks !== '' && Number(log.kicks) < t.kicksMinimumPer12h) {
    add(4, 'Reduced fetal movements', `${log.kicks} movements counted, below ${t.kicksMinimumPer12h}.`);
  }

  const flags = Array.isArray(log.symptoms) ? log.symptoms : [];
  const urgent = {
    bleeding: 'Bleeding reported',
    leaking: 'Leaking fluid reported',
    severeHeadache: 'Severe headache reported',
    blurredVision: 'Blurred vision reported',
    breathlessness: 'Breathlessness reported',
    fever: 'Fever reported',
    painfulContractions: 'Painful contractions reported'
  };
  flags.forEach((flag) => {
    if (urgent[flag]) add(4, urgent[flag], 'Reported in the daily log.');
  });

  if (log.missedCriticalMedicine) {
    add(4, 'Critical medicine missed', 'A medicine marked critical by the doctor was not taken.');
  } else if (log.missedSupplement) {
    add(1, 'Supplement missed', 'Iron or calcium not taken today.');
  }

  if (flags.includes('alcohol') || flags.includes('tobacco')) {
    add(3, 'Substance use reported', 'Reported in the food and routine log. Needs a counselling call.');
  }

  return alerts;
}

/** Newborn danger signs, straight to tier 4. */
const NEWBORN_DANGER_SIGNS = [
  { key: 'poorFeeding',   label: 'Not feeding well' },
  { key: 'lethargy',      label: 'Unusually sleepy or floppy' },
  { key: 'fastBreathing', label: 'Fast or difficult breathing' },
  { key: 'fever',         label: 'Fever or body feels cold' },
  { key: 'convulsions',   label: 'Fits or jerky movements' },
  { key: 'yellowPalms',   label: 'Yellow palms or soles' }
];

/** Labour alert: before 37 weeks it pages the consultant, not just the desk. */
function labourAlert(patient) {
  const g = gestation(patient.lmp);
  const preterm = g.weeks < 37;
  return {
    tier: 4,
    reason: preterm ? 'Possible preterm labour' : 'Labour — patient on the way',
    detail: preterm
      ? `Reported pains at ${g.label}, before 37 weeks. Page the on-call consultant.`
      : `Reported pains at ${g.label}. Term.`,
    preterm
  };
}

module.exports = {
  toDate, addDays, daysBetween, iso,
  eddFromLmp, lmpFromEdd, gestation,
  buildAncPlan, buildImmunisationPlan,
  gradeLog, labourAlert,
  DEFAULT_THRESHOLDS, NEWBORN_DANGER_SIGNS
};

/* ==========================================================================
   v7 additions — hydration, weight tracking, lifestyle, growth, milestones
   All ranges are configurable by the hospital. Nothing here instructs a woman
   to lose weight; pregnancy guidance is always "gain within your range".
   ========================================================================== */

/** IOM 2009 total gestational weight gain, kg, by pre-pregnancy BMI. */
const GAIN_RANGES = [
  { key: 'under',  max: 18.5, label: 'below 18.5',   total: [12.5, 18],  weeklyT23: [0.44, 0.58] },
  { key: 'normal', max: 25,   label: '18.5 to 24.9', total: [11.5, 16],  weeklyT23: [0.35, 0.50] },
  { key: 'over',   max: 30,   label: '25 to 29.9',   total: [7, 11.5],   weeklyT23: [0.23, 0.33] },
  { key: 'obese',  max: 99,   label: '30 and above', total: [5, 9],      weeklyT23: [0.17, 0.27] }
];

function bmi(heightCm, weightKg) {
  if (!heightCm || !weightKg) return null;
  const m = Number(heightCm) / 100;
  if (!m || m < 1 || m > 2.5) return null;
  return Math.round((Number(weightKg) / (m * m)) * 10) / 10;
}

function gainRangeFor(bmiValue) {
  if (bmiValue === null || bmiValue === undefined) return null;
  return GAIN_RANGES.find((r) => bmiValue < r.max) || GAIN_RANGES[GAIN_RANGES.length - 1];
}

/**
 * Expected gain so far. First trimester is a flat 0.5–2 kg; after 13 weeks the
 * weekly rate for her BMI band applies.
 */
function expectedGainByWeek(range, weeks) {
  if (!range) return null;
  const w = Math.max(0, Math.min(weeks, 40));
  if (w <= 13) {
    const frac = w / 13;
    return [Math.round(0.5 * frac * 10) / 10, Math.round(2 * frac * 10) / 10];
  }
  const after = w - 13;
  return [
    Math.round((0.5 + after * range.weeklyT23[0]) * 10) / 10,
    Math.round((2 + after * range.weeklyT23[1]) * 10) / 10
  ];
}

/**
 * Weight picture built entirely from her logs — she enters nothing extra.
 * `logs` newest first. Returns null when there is nothing to say yet.
 */
function weightPicture(patient, logs) {
  const weighed = (logs || []).filter((l) => l.weight).sort((a, b) => a.date.localeCompare(b.date));
  const start = patient.prePregnancyWeightKg ? Number(patient.prePregnancyWeightKg)
              : weighed.length ? weighed[0].weight : null;
  if (!start) return null;

  const latest = weighed.length ? weighed[weighed.length - 1] : null;
  const current = latest ? latest.weight : start;
  const gained = Math.round((current - start) * 10) / 10;
  const weeks = gestation(patient.lmp).weeks;
  const b = bmi(patient.heightCm, start);
  const range = gainRangeFor(b);
  const expected = expectedGainByWeek(range, weeks);

  let status = 'unknown';
  let message = `You have gained ${gained} kg so far. Ask your hospital to add your height and your weight before pregnancy, and we can show you the range that fits your build.`;
  if (expected) {
    if (gained < expected[0] - 0.5) {
      status = 'below';
      message = `You have gained ${gained} kg. For ${weeks} weeks, ${expected[0]}–${expected[1]} kg is the usual range. Gaining a little more is what helps your baby grow — mention it at your next visit.`;
    } else if (gained > expected[1] + 0.5) {
      status = 'above';
      message = `You have gained ${gained} kg, a little more than the usual ${expected[0]}–${expected[1]} kg at ${weeks} weeks. Your doctor will guide you — never try to lose weight while pregnant.`;
    } else {
      status = 'on track';
      message = `You have gained ${gained} kg, which sits nicely inside the usual ${expected[0]}–${expected[1]} kg at ${weeks} weeks.`;
    }
  }

  return {
    startWeight: start, currentWeight: current, gained, weeks,
    bmi: b, bmiBand: range ? range.label : null,
    totalRange: range ? range.total : null,
    expectedNow: expected, status, message,
    series: weighed.slice(-40).map((l) => ({ date: l.date, weight: l.weight }))
  };
}

/**
 * Daily fluid target. ACOG puts pregnancy around 2.3 litres a day; we scale
 * gently with body weight and add a little in the third trimester, then clamp.
 * A doctor can override it — fluid is deliberately restricted in some conditions.
 */
function waterTarget(weightKg, trimester, override) {
  if (override) return { ml: Number(override), glasses: Math.round(Number(override) / 200), overridden: true };
  const base = weightKg ? Number(weightKg) * 30 : 2300;
  const extra = trimester === 3 ? 300 : trimester === 2 ? 150 : 0;
  const ml = Math.min(3200, Math.max(2000, Math.round((base + extra) / 100) * 100));
  return { ml, glasses: Math.round(ml / 200), overridden: false };
}

const LIFESTYLE = {
  1: {
    exercise: [
      'A 20–30 minute walk most days, at a pace where you can still talk',
      'Gentle stretching and prenatal yoga, avoiding lying flat on your back for long',
      'Pelvic floor exercises — a few times a day, any time you remember'
    ],
    diet: [
      'Folic acid every day, without fail',
      'Small frequent meals help more than three large ones while nausea lasts',
      'Curd, dal, eggs and nuts for protein; a fruit between meals',
      'Boiled or filtered water, and wash fruit and vegetables well'
    ]
  },
  2: {
    exercise: [
      '30 minutes of walking most days, split into two if that is easier',
      'Prenatal yoga or swimming if you have access',
      'Avoid heavy lifting, standing on stools, and anything with a fall risk'
    ],
    diet: [
      'Iron with lemon water or an orange; keep tea, coffee and milk two hours away',
      'Calcium daily, at a different time from iron',
      'A protein source at every meal — dal, curd, paneer, egg, fish',
      'Greens and seasonal fruit for fibre; it also helps the constipation'
    ]
  },
  3: {
    exercise: [
      'Keep walking, but shorter and more often as you get heavier',
      'Pelvic tilts and squats help, if your doctor is happy with them',
      'Sleep on your side — the left side is the usual advice — with a pillow between your knees'
    ],
    diet: [
      'Smaller meals more often; heartburn worsens with large ones',
      'Keep up iron and calcium exactly as prescribed',
      'Extra fluids, unless your doctor has told you otherwise',
      'Avoid lying down straight after eating'
    ]
  }
};

function lifestyleFor(trimester) {
  return LIFESTYLE[trimester] || LIFESTYLE[1];
}

/** WHO weight-for-age, kg. Median and the usual band, by month, 0–24 months. */
const GROWTH = {
  boy:  [[3.3,2.5,4.4],[4.5,3.4,5.8],[5.6,4.3,7.1],[6.4,5.0,8.0],[7.0,5.6,8.7],[7.5,6.0,9.3],[7.9,6.4,9.8],[8.3,6.7,10.3],[8.6,6.9,10.7],[8.9,7.1,11.0],[9.2,7.4,11.4],[9.4,7.6,11.7],[9.6,7.7,12.0],[9.9,7.9,12.3],[10.1,8.1,12.6],[10.3,8.3,12.8],[10.5,8.4,13.1],[10.7,8.6,13.4],[10.9,8.8,13.7],[11.1,8.9,13.9],[11.3,9.1,14.2],[11.5,9.2,14.5],[11.8,9.4,14.7],[12.0,9.5,15.0],[12.2,9.7,15.3]],
  girl: [[3.2,2.4,4.2],[4.2,3.2,5.5],[5.1,3.9,6.6],[5.8,4.5,7.5],[6.4,5.0,8.2],[6.9,5.4,8.8],[7.3,5.7,9.3],[7.6,6.0,9.8],[7.9,6.3,10.2],[8.2,6.5,10.5],[8.5,6.7,10.9],[8.7,6.9,11.2],[8.9,7.0,11.5],[9.2,7.2,11.8],[9.4,7.4,12.1],[9.6,7.6,12.4],[9.8,7.7,12.6],[10.0,7.9,12.9],[10.2,8.1,13.2],[10.4,8.2,13.5],[10.6,8.4,13.7],[10.9,8.6,14.0],[11.1,8.7,14.3],[11.3,8.9,14.6],[11.5,9.0,14.8]]
};

function growthCheck(ageMonths, weightKg, sex) {
  const table = GROWTH[sex === 'girl' ? 'girl' : 'boy'];
  const m = Math.max(0, Math.min(24, Math.round(ageMonths)));
  const [median, low, high] = table[m];
  if (!weightKg) return { median, low, high, status: 'unknown' };
  const w = Number(weightKg);
  return {
    median, low, high,
    status: w < low ? 'below' : w > high ? 'above' : 'typical',
    message: w < low
      ? `Below the usual range for ${m} months (${low}–${high} kg). Your hospital has been told.`
      : w > high
      ? `Above the usual range for ${m} months (${low}–${high} kg). Worth mentioning at the next visit.`
      : `Inside the usual range for ${m} months (${low}–${high} kg).`
  };
}

/** Milestones by age. "Not yet" on a passed milestone is worth a conversation. */
const MILESTONES = [
  { m: 1,  items: ['Looks at faces', 'Startles at loud sounds', 'Moves both arms and legs'] },
  { m: 2,  items: ['Smiles back at you', 'Holds head up briefly on tummy', 'Follows a face with eyes'] },
  { m: 4,  items: ['Laughs and coos', 'Holds head steady', 'Brings hands to mouth', 'Pushes up on elbows'] },
  { m: 6,  items: ['Rolls over', 'Sits with support', 'Reaches for things', 'Responds to their name'] },
  { m: 9,  items: ['Sits without support', 'Passes objects hand to hand', 'Babbles ba-ba, da-da', 'Looks for a hidden toy'] },
  { m: 12, items: ['Pulls to stand', 'Says one or two words', 'Waves bye-bye', 'Picks up small things with finger and thumb'] },
  { m: 18, items: ['Walks alone', 'Says several words', 'Drinks from a cup', 'Points to show you something'] },
  { m: 24, items: ['Runs', 'Joins two words together', 'Copies what you do', 'Uses a spoon'] }
];

function milestonesFor(ageMonths) {
  return MILESTONES.filter((row) => row.m <= ageMonths + 1);
}

module.exports.countdown = countdown;
module.exports.bmi = bmi;
module.exports.gainRangeFor = gainRangeFor;
module.exports.expectedGainByWeek = expectedGainByWeek;
module.exports.weightPicture = weightPicture;
module.exports.waterTarget = waterTarget;
module.exports.lifestyleFor = lifestyleFor;
module.exports.growthCheck = growthCheck;
module.exports.milestonesFor = milestonesFor;
module.exports.GAIN_RANGES = GAIN_RANGES;

/* ==========================================================================
   v20 — how big the baby is this week
   Lengths are crown-rump to 20 weeks and crown-heel after, which is how
   scans report them. Figures are typical, not a measurement of her baby.
   ========================================================================== */

const BABY_SIZE = {
  4:  ['poppy seed', 'poppy', 1, 2, null, 'Too small to see, but everything has started.'],
  5:  ['sesame seed', 'sesame', 2, 3, null, 'The heart is beginning to form.'],
  6:  ['a pea', 'pea', 4, 6, null, 'The heart starts to beat this week.'],
  7:  ['a blueberry', 'blueberry', 9, 12, 1, 'Arm and leg buds are appearing.'],
  8:  ['a raspberry', 'raspberry', 14, 18, 1, 'Fingers and toes are forming.'],
  9:  ['a grape', 'grape', 20, 25, 2, 'Now officially called a fetus.'],
  10: ['a strawberry', 'strawberry', 28, 33, 4, 'All the main organs are in place.'],
  11: ['a fig', 'fig', 38, 44, 7, 'Tiny fingernails are starting.'],
  12: ['a lime', 'lime', 50, 58, 14, 'Reflexes are developing — the fingers can curl.'],
  13: ['a lemon', 'lemon', 70, 78, 23, 'Fingerprints are forming.'],
  14: ['a peach', 'peach', 84, 90, 43, 'The baby can squint and frown.'],
  15: ['an apple', 'apple', 94, 100, 70, 'Bones are getting harder.'],
  16: ['an avocado', 'avocado', 112, 120, 100, 'The baby can hear muffled sounds.'],
  17: ['a pear', 'pear', 126, 134, 140, 'Fat is beginning to form under the skin.'],
  18: ['a sweet potato', 'sweetpotato', 138, 146, 190, 'You may start to feel movements.'],
  19: ['a mango', 'mango', 148, 156, 240, 'A protective coating covers the skin.'],
  20: ['a banana', 'banana', 160, 168, 300, 'Halfway. The anomaly scan is around now.'],
  21: ['a carrot', 'carrot', 255, 275, 360, 'Movements are becoming a pattern.'],
  22: ['a papaya', 'papaya', 268, 288, 430, 'Eyebrows and eyelashes are appearing.'],
  23: ['a grapefruit', 'grapefruit', 280, 298, 500, 'The baby can hear your voice.'],
  24: ['a corn cob', 'corn', 292, 310, 600, 'Lungs are developing quickly now.'],
  25: ['a cauliflower', 'cauliflower', 336, 356, 660, 'The baby responds to your touch.'],
  26: ['a lettuce', 'lettuce', 346, 366, 760, 'The eyes are beginning to open.'],
  27: ['a cabbage', 'cabbage', 356, 376, 875, 'Hiccups may be felt as tiny jumps.'],
  28: ['an aubergine', 'aubergine', 366, 386, 1005, 'Sleeping and waking cycles begin.'],
  29: ['a pumpkin wedge', 'pumpkin', 376, 396, 1150, 'Bones are fully formed but still soft.'],
  30: ['a coconut', 'coconut', 387, 407, 1320, 'The baby is putting on fat steadily.'],
  31: ['a pineapple', 'pineapple', 400, 420, 1500, 'All five senses are working.'],
  32: ['a squash', 'squash', 414, 434, 1700, 'The baby usually turns head down soon.'],
  33: ['a melon', 'melon', 427, 447, 1900, 'The skull stays soft for the birth.'],
  34: ['a cantaloupe', 'cantaloupe', 440, 460, 2150, 'Lungs are nearly ready.'],
  35: ['a honeydew', 'honeydew', 452, 472, 2380, 'Most of the weight gain is fat now.'],
  36: ['a romaine lettuce', 'romaine', 464, 484, 2620, 'The baby is running out of room.'],
  37: ['a bunch of chard', 'chard', 476, 496, 2860, 'Considered early term from now.'],
  38: ['a leek', 'leek', 488, 508, 3080, 'The lungs are ready for the first breath.'],
  39: ['a small watermelon', 'watermelon', 496, 516, 3290, 'Full term. Any day now.'],
  40: ['a pumpkin', 'pumpkin', 500, 522, 3460, 'Your due date. Most babies come near it, not on it.']
};

function babySize(weeks) {
  const w = Math.max(4, Math.min(40, Math.round(weeks)));
  const row = BABY_SIZE[w];
  if (!row) return null;
  const [name, art, minMm, maxMm, grams, note] = row;
  const asCm = maxMm >= 100;
  return {
    weeks: w,
    name,
    art,
    lengthLabel: asCm
      ? (minMm / 10).toFixed(1) + '\u2013' + (maxMm / 10).toFixed(1) + ' cm'
      : minMm + '\u2013' + maxMm + ' mm',
    weightLabel: !grams ? 'under 1 g'
      : grams >= 1000 ? (grams / 1000).toFixed(2) + ' kg'
      : grams + ' g',
    measuredFrom: w <= 20 ? 'head to bottom' : 'head to heel',
    note
  };
}

module.exports.babySize = babySize;
