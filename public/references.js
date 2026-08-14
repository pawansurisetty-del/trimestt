'use strict';
/**
 * Where the guidance in this app comes from.
 *
 * Every chapter names the bodies whose published guidance it follows, so a
 * patient — or, more usefully, her hospital's doctor — can check any statement
 * against the source rather than taking our word for it.
 *
 * This is not a substitute for clinical sign-off. A citation says what we read;
 * it does not say that a doctor has read what we wrote. Until a named
 * gynaecologist and paediatrician approve a chapter, the app says so plainly.
 */

window.TRIMESTT_SOURCES = {
  who_anc: {
    short: 'WHO antenatal care',
    full: 'WHO recommendations on antenatal care for a positive pregnancy experience',
    body: 'World Health Organization',
    year: 2016,
    url: 'https://www.who.int/publications/i/item/9789241549912'
  },
  who_pnc: {
    short: 'WHO postnatal care',
    full: 'WHO recommendations on maternal and newborn care for a positive postnatal experience',
    body: 'World Health Organization',
    year: 2022,
    url: 'https://www.who.int/publications/i/item/9789240045989'
  },
  who_bf: {
    short: 'WHO infant feeding',
    full: 'Guideline: counselling of women to improve breastfeeding practices',
    body: 'World Health Organization',
    year: 2018,
    url: 'https://www.who.int/publications/i/item/9789241550468'
  },
  rcog_rfm: {
    short: 'RCOG reduced fetal movements',
    full: 'Reduced Fetal Movements, Green-top Guideline No. 57, second edition',
    body: 'Royal College of Obstetricians and Gynaecologists',
    year: 2026,
    url: 'https://www.rcog.org.uk/guidance/browse-all-guidance/green-top-guidelines/reduced-fetal-movements-green-top-guideline-no-57/'
  },
  acog: {
    short: 'ACOG',
    full: 'Committee Opinions and Practice Bulletins on antenatal care, nutrition and exercise in pregnancy',
    body: 'American College of Obstetricians and Gynecologists',
    year: null,
    url: 'https://www.acog.org/clinical'
  },
  nam_weight: {
    short: 'Gestational weight gain ranges',
    full: 'Weight Gain During Pregnancy: Reexamining the Guidelines',
    body: 'Institute of Medicine, now the National Academy of Medicine',
    year: 2009,
    url: 'https://nap.nationalacademies.org/catalog/12584'
  },
  mohfw_anc: {
    short: 'MoHFW maternal health',
    full: 'Guidelines under Pradhan Mantri Surakshit Matritva Abhiyan and the national maternal health programme',
    body: 'Ministry of Health and Family Welfare, Government of India',
    year: null,
    url: 'https://nhm.gov.in'
  },
  amb: {
    short: 'Anaemia Mukt Bharat',
    full: 'Anaemia Mukt Bharat: operational guidelines for iron and folic acid supplementation',
    body: 'Ministry of Health and Family Welfare, Government of India',
    year: 2018,
    url: 'https://anemiamuktbharat.info'
  },
  nis: {
    short: 'National Immunization Schedule',
    full: 'National Immunization Schedule for infants, children and pregnant women',
    body: 'Ministry of Health and Family Welfare, Government of India',
    year: null,
    url: 'https://nhm.gov.in/index1.php?lang=1&level=2&sublinkid=824&lid=220'
  },
  iap: {
    short: 'IAP immunisation timetable',
    full: 'Indian Academy of Pediatrics Advisory Committee on Vaccines immunization timetable',
    body: 'Indian Academy of Pediatrics',
    year: null,
    url: 'https://iapindia.org'
  },
  who_growth: {
    short: 'WHO child growth standards',
    full: 'WHO Child Growth Standards: weight-for-age, length-for-age and head circumference',
    body: 'World Health Organization',
    year: 2006,
    url: 'https://www.who.int/tools/child-growth-standards'
  },
  icmr_nin: {
    short: 'ICMR-NIN dietary guidelines',
    full: 'Dietary Guidelines for Indians',
    body: 'Indian Council of Medical Research, National Institute of Nutrition',
    year: 2024,
    url: 'https://www.nin.res.in'
  },
  fogsi: {
    short: 'FOGSI',
    full: 'Clinical practice recommendations of the Federation of Obstetric and Gynaecological Societies of India',
    body: 'FOGSI',
    year: null,
    url: 'https://www.fogsi.org'
  },
  nice: {
    short: 'NICE antenatal care',
    full: 'Antenatal care, NICE guideline NG201',
    body: 'National Institute for Health and Care Excellence',
    year: 2021,
    url: 'https://www.nice.org.uk/guidance/ng201'
  },
  pcpndt: {
    short: 'PC-PNDT Act',
    full: 'Pre-Conception and Pre-Natal Diagnostic Techniques (Prohibition of Sex Selection) Act',
    body: 'Government of India',
    year: 1994,
    url: 'https://main.mohfw.gov.in/?q=acts-rules-and-standards-health-sector/acts/pcpndt-act'
  }
};

/** Which sources sit behind each category of guidance. */
window.TRIMESTT_CATEGORY_SOURCES = {
  'First trimester': ['who_anc', 'mohfw_anc', 'nice'],
  'Second trimester': ['who_anc', 'mohfw_anc', 'nice'],
  'Third trimester': ['who_anc', 'rcog_rfm', 'nice'],
  'Labour': ['who_anc', 'nice', 'fogsi'],
  'Precautions': ['who_anc', 'acog', 'mohfw_anc'],
  'Travel and work': ['acog', 'nice'],
  'Food': ['icmr_nin', 'who_anc', 'amb', 'acog'],
  'After delivery': ['who_pnc', 'mohfw_anc'],
  'Breastfeeding': ['who_bf', 'who_pnc'],
  'Newborn': ['who_pnc', 'who_growth', 'iap'],
  'Baby care': ['who_pnc', 'who_growth', 'iap', 'nis'],
  'Medicines': ['acog', 'nice', 'amb', 'fogsi'],
  'Sleep and rest': ['acog', 'nice'],
  'Movement': ['acog', 'rcog_rfm', 'who_anc'],
  'Daily routine': ['who_anc', 'icmr_nin', 'acog'],
  'Common discomforts': ['who_anc', 'nice', 'acog'],
  'Mind and family': ['who_anc', 'who_pnc', 'nice'],
  'Preparing for birth': ['who_anc', 'nice', 'fogsi'],
  'Myths and facts': ['who_anc', 'icmr_nin', 'pcpndt'],
  'Existing conditions': ['acog', 'nice', 'fogsi']
};

/** Sources behind the parts of the app that are not chapters. */
window.TRIMESTT_FEATURE_SOURCES = {
  'Weight gain ranges': ['nam_weight'],
  'Daily water target': ['acog', 'icmr_nin'],
  'Antenatal visit plan': ['who_anc', 'mohfw_anc'],
  'Immunisation schedule': ['iap', 'nis'],
  'Baby growth ranges': ['who_growth'],
  'Movement counting': ['rcog_rfm', 'acog'],
  'Nothing about fetal sex': ['pcpndt']
};

/**
 * Clinical review status. A hospital fills this in once its own doctors have
 * read the chapters. Until then the app says so, rather than implying approval
 * it has not been given.
 */
window.TRIMESTT_REVIEW = {
  reviewed: false,
  obstetrician: null,
  paediatrician: null,
  hospital: null,
  date: null
};
