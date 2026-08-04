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
    trimestter: days < 98 ? 1 : days < 189 ? 2 : 3
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
