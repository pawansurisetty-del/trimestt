'use strict';
/**
 * Languages.
 *
 * The interface is translated in full. Guides are translated one at a time,
 * safety-critical ones first, because clinical content translated without a
 * clinician's review is worse than no translation at all. Anything not yet
 * translated is shown in English and clearly marked, never machine-translated
 * silently.
 */

window.TRIMESTT_LANGS = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'te', label: 'Telugu', native: 'తెలుగు' },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
  { code: 'ta', label: 'Tamil', native: 'தமிழ்', pending: true },
  { code: 'kn', label: 'Kannada', native: 'ಕನ್ನಡ', pending: true },
  { code: 'ml', label: 'Malayalam', native: 'മലയാളം', pending: true },
  { code: 'mr', label: 'Marathi', native: 'मराठी', pending: true },
  { code: 'bn', label: 'Bengali', native: 'বাংলা', pending: true },
  { code: 'gu', label: 'Gujarati', native: 'ગુજરાતી', pending: true },
  { code: 'ur', label: 'Urdu', native: 'اردو', pending: true },
  { code: 'or', label: 'Odia', native: 'ଓଡ଼ିଆ', pending: true },
  { code: 'pa', label: 'Punjabi', native: 'ਪੰਜਾਬੀ', pending: true }
];

window.TRIMESTT_STRINGS = {
  en: {
    home: 'Home', plan: 'Plan', log: 'Log', guides: 'Guides', records: 'Records',
    vaccines: 'Vaccines', mother: 'Mother', addBaby: '+ Add baby',
    youAreAt: 'You are at', toGo: 'to go', waterToday: 'Water today', glass: '+1 glass',
    bottle: '+ bottle', yourWeight: 'Your weight', gainedSince: 'gained since you started',
    next: 'Next', careTeam: 'Your care team', privacy: 'Your privacy',
    whoCanSee: 'Who can see all this', todaysLog: "Today's log", saveLog: "Save today's log",
    medicines: 'Medicines', feeling: 'How are you feeling', anythingElse: 'Anything else — in your own words',
    addPhoto: 'Add a photo', movements: 'Count your baby\u2019s movements', departments: 'See another department',
    language: 'Language', signOut: 'Sign out', notifications: 'Notifications',
    emergency: 'I am having pains — tell the hospital', back: 'Back',
    englishOnly: 'This guide is not translated yet. Shown in English.'
  },
  te: {
    home: 'హోమ్', plan: 'ప్రణాళిక', log: 'నమోదు', guides: 'మార్గదర్శిని', records: 'రికార్డులు',
    vaccines: 'టీకాలు', mother: 'తల్లి', addBaby: '+ బిడ్డను చేర్చండి',
    youAreAt: 'మీరు ఇప్పుడు', toGo: 'మిగిలి ఉంది', waterToday: 'ఈ రోజు నీరు', glass: '+1 గ్లాసు',
    bottle: '+ బాటిల్', yourWeight: 'మీ బరువు', gainedSince: 'మొదటి నుండి పెరిగిన బరువు',
    next: 'తరువాత', careTeam: 'మీ వైద్య బృందం', privacy: 'మీ గోప్యత',
    whoCanSee: 'ఇదంతా ఎవరు చూడగలరు', todaysLog: 'ఈ రోజు నమోదు', saveLog: 'ఈ రోజు నమోదు సేవ్ చేయండి',
    medicines: 'మందులు', feeling: 'మీరు ఎలా ఉన్నారు', anythingElse: 'ఇంకేదైనా — మీ మాటల్లో',
    addPhoto: 'ఫోటో జోడించండి', movements: 'బిడ్డ కదలికలు లెక్కించండి', departments: 'ఇతర విభాగాన్ని కలవాలి',
    language: 'భాష', signOut: 'సైన్ అవుట్', notifications: 'నోటిఫికేషన్లు',
    emergency: 'నొప్పులు వస్తున్నాయి — ఆసుపత్రికి తెలియజేయండి', back: 'వెనుకకు',
    englishOnly: 'ఈ వ్యాసం ఇంకా అనువదించబడలేదు. ఇంగ్లీషులో చూపుతోంది.'
  },
  hi: {
    home: 'होम', plan: 'योजना', log: 'दर्ज करें', guides: 'मार्गदर्शिका', records: 'रिकॉर्ड',
    vaccines: 'टीके', mother: 'माँ', addBaby: '+ शिशु जोड़ें',
    youAreAt: 'आप अभी', toGo: 'बाकी है', waterToday: 'आज का पानी', glass: '+1 गिलास',
    bottle: '+ बोतल', yourWeight: 'आपका वज़न', gainedSince: 'शुरुआत से बढ़ा वज़न',
    next: 'अगला', careTeam: 'आपकी देखभाल टीम', privacy: 'आपकी निजता',
    whoCanSee: 'यह सब कौन देख सकता है', todaysLog: 'आज का रिकॉर्ड', saveLog: 'आज का रिकॉर्ड सहेजें',
    medicines: 'दवाइयाँ', feeling: 'आप कैसा महसूस कर रही हैं', anythingElse: 'और कुछ — अपने शब्दों में',
    addPhoto: 'फ़ोटो जोड़ें', movements: 'शिशु की हलचल गिनें', departments: 'दूसरा विभाग दिखाएँ',
    language: 'भाषा', signOut: 'साइन आउट', notifications: 'सूचनाएँ',
    emergency: 'मुझे दर्द हो रहा है — अस्पताल को बताएं', back: 'वापस',
    englishOnly: 'यह लेख अभी अनुवादित नहीं है। अंग्रेज़ी में दिखाया जा रहा है।'
  }
};

/** Translated guides, safety-critical first. Keyed by guide id. */
window.TRIMESTT_GUIDE_TRANSLATIONS = {
  te: {
    'warning-signs': {
      title: 'ఈ లక్షణాలు ఉంటే ఈ రోజే ఫోన్ చేయండి',
      body: [
        'ఏ దశలోనైనా రక్తస్రావం. నీరు పోవడం లేదా నిరంతరం చిన్నగా కారడం. బిడ్డ కదలికలు తగ్గడం లేదా మారడం.',
        'తీవ్రమైన తలనొప్పి, కళ్ళు మసకబారడం, కుడివైపు పక్కటెముకల కింద నొప్పి, ముఖం చేతులు అకస్మాత్తుగా వాపు.',
        'జ్వరం, మూత్రంలో మంటతో నడుము నొప్పి, ఊపిరి ఆడకపోవడం, లేదా నిరంతర తీవ్రమైన కడుపు నొప్పి.',
        'వీటిలో దేనినీ ఉదయం వరకు వాయిదా వేయవద్దు. ఆసుపత్రికి ఫోన్ చేయండి లేదా అత్యవసర బటన్ నొక్కండి.'
      ]
    },
    'kick-counting': {
      title: 'బిడ్డ కదలికలు లెక్కించడం',
      body: [
        '28 వారాల నుండి, బిడ్డ సాధారణంగా చురుకుగా ఉండే సమయాన్ని ఎంచుకుని, ఎడమవైపు పడుకుని లెక్కించండి.',
        'పది కదలికలు రావాలి. తన్నడం, దొర్లడం, కదలడం అన్నీ లెక్కలోకి వస్తాయి.',
        'చివరి వారాల్లో బిడ్డ కదలికలు తగ్గవు. తగ్గినట్లు లేదా భిన్నంగా అనిపిస్తే ఆ రోజే ఆసుపత్రికి ఫోన్ చేయండి — రేపటి వరకు ఆగవద్దు.'
      ]
    },
    'foods-to-avoid': {
      title: 'తినకూడని ఆహారాలు',
      body: [
        'పచ్చి లేదా సరిగా ఉడకని గుడ్లు, మాంసం; పాశ్చరైజ్ చేయని పాలు, పన్నీర్; బయట కోసి ఉంచిన పండ్లు.',
        'మద్యం అస్సలు వద్దు. పొగాకు, గుట్కా, పాన్ మసాలా వద్దు. ఇతరుల పొగకు దూరంగా ఉండండి.',
        'టీ, కాఫీ రోజుకు రెండు కప్పులకు మించవద్దు. పండని బొప్పాయి వద్దు.',
        'డాక్టర్‌కు చెప్పకుండా ఏ ఆయుర్వేద లేదా మూలికా మందులు తీసుకోవద్దు.'
      ]
    },
    'baby-danger-signs': {
      title: 'బిడ్డను వెంటనే తీసుకురావాల్సిన లక్షణాలు',
      body: [
        'పాలు తాగకపోవడం, అసాధారణంగా నిద్రమత్తు లేదా నీరసం, వేగంగా లేదా కష్టంగా ఊపిరి తీసుకోవడం.',
        'జ్వరం లేదా శరీరం చల్లగా ఉండటం, ఫిట్స్ లేదా వణుకు, అరచేతులు అరికాళ్ళు పసుపు రంగులోకి మారడం.',
        'వీటిలో ఏదైనా కనిపిస్తే ఏ సమయంలోనైనా వెంటనే ఆసుపత్రికి తీసుకురండి.'
      ]
    }
  },
  hi: {
    'warning-signs': {
      title: 'इन लक्षणों में आज ही फ़ोन करें',
      body: [
        'किसी भी समय रक्तस्राव। पानी की थैली फटना या लगातार रिसाव। शिशु की हलचल कम होना या बदल जाना।',
        'तेज़ सिरदर्द, धुंधला दिखना, दाहिनी पसली के नीचे दर्द, या चेहरे और हाथों में अचानक सूजन।',
        'बुखार, पेशाब में जलन के साथ कमर दर्द, साँस फूलना, या लगातार तेज़ पेट दर्द।',
        'इनमें से किसी को सुबह तक न टालें। अस्पताल को फ़ोन करें या ऐप का आपातकालीन बटन दबाएँ।'
      ]
    },
    'kick-counting': {
      title: 'शिशु की हलचल गिनना',
      body: [
        '28 सप्ताह से, वह समय चुनें जब शिशु आमतौर पर सक्रिय होता है, बाईं करवट लेटें और गिनें।',
        'दस हलचलें अपेक्षित हैं। लात, करवट, हलचल — सब गिनती में आते हैं।',
        'आख़िरी हफ़्तों में हलचल कम नहीं होती। कम या अलग लगे तो उसी दिन अस्पताल को फ़ोन करें — कल तक इंतज़ार न करें।'
      ]
    },
    'foods-to-avoid': {
      title: 'किन चीज़ों से बचें',
      body: [
        'कच्चे या अधपके अंडे और मांस, बिना पाश्चरीकृत दूध और पनीर, बाहर कटा रखा फल।',
        'शराब बिल्कुल नहीं। तंबाकू, गुटखा, पान मसाला नहीं। दूसरों के धुएँ से भी दूर रहें।',
        'चाय-कॉफ़ी दिन में दो कप तक। कच्चा पपीता नहीं।',
        'डॉक्टर को बताए बिना कोई आयुर्वेदिक या हर्बल दवा न लें।'
      ]
    },
    'baby-danger-signs': {
      title: 'शिशु को तुरंत कब लाएँ',
      body: [
        'दूध न पीना, असामान्य रूप से सुस्त या ढीला होना, तेज़ या कठिन साँस लेना।',
        'बुखार या शरीर ठंडा पड़ना, दौरे या झटके, हथेलियों और तलवों का पीला पड़ना।',
        'इनमें से कुछ भी दिखे तो किसी भी समय तुरंत अस्पताल लाएँ।'
      ]
    }
  }
};
