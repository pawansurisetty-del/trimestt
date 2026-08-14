'use strict';
/* Trimestt guide library. Plain data — a hospital's own instructions can be
   layered over these later without touching the app code. */

window.TRIMESTT_GUIDES = [
  /* ---------------------------------------------------- first trimester -- */
  {
    id: 'first-weeks',
    category: 'First trimester',
    title: 'The first twelve weeks',
    read: '3 min',
    body: [
      'Your baby grows fastest in these weeks, even though nothing shows on the outside. The heart starts beating around six weeks and all the major organs begin forming before twelve.',
      'You will feel tired in a way that sleep does not fix. That is normal. So is nausea, a metallic taste, sore breasts, needing to pass urine often, and going off foods you used to like.',
      'Start folic acid if you have not already. Book your first scan between eleven and thirteen weeks — it fixes your due date more accurately than any later scan.',
      'Call the hospital the same day for: bleeding, severe one-sided pain, fainting, or vomiting so much that you cannot keep water down.'
    ]
  },
  {
    id: 'nausea',
    category: 'First trimester',
    title: 'Nausea that will not settle',
    read: '2 min',
    body: [
      'Eat small amounts often rather than three large meals. An empty stomach makes it worse, so keep dry toast or a biscuit by the bed and eat before you sit up.',
      'Ginger in warm water, lemon, cold foods rather than hot ones, and sipping fluids between meals instead of with them all help. Rest after eating and avoid lying flat straight away.',
      'If you cannot keep any fluid down for a day, are passing very little urine, or are losing weight, you need to be seen. There is safe treatment for this — do not tough it out.'
    ]
  },
  {
    id: 'first-scan',
    category: 'First trimester',
    title: 'Your first scan, explained',
    read: '2 min',
    body: [
      'The dating and NT scan is done between eleven weeks and thirteen weeks six days. It confirms how many weeks you are, checks the heartbeat, sees whether there is one baby or more, and measures the fluid at the back of the baby\'s neck.',
      'Drink water beforehand and hold a full bladder — it gives a clearer picture in early pregnancy.',
      'This window closes. If you are near thirteen weeks and have not booked, call your hospital today rather than waiting for your next visit.'
    ]
  },

  /* --------------------------------------------------- second trimester -- */
  {
    id: 'iron-calcium',
    category: 'Second trimester',
    title: 'Taking iron so it actually works',
    read: '2 min',
    body: [
      'Iron is absorbed best on an empty stomach, with something sour like lemon water or an orange. Vitamin C roughly doubles how much your body takes in.',
      'Tea, coffee and milk block it. Keep them at least an hour away from your iron tablet, and keep calcium two hours apart — taken together, each cancels the other out.',
      'Iron makes stools dark and can cause constipation. More water, more fibre and staying active help. If it makes you feel sick, take it after food or at night rather than stopping it.',
      'Stopping iron quietly is the single most common reason haemoglobin falls in pregnancy. Tell your doctor if you are struggling — the dose or the form can be changed.'
    ]
  },
  {
    id: 'anomaly-scan',
    category: 'Second trimester',
    title: 'The anomaly scan',
    read: '2 min',
    body: [
      'Done between eighteen and twenty weeks, this scan looks at how your baby is formed — brain, spine, heart, kidneys, limbs — and where the placenta is sitting.',
      'Allow about forty-five minutes. Sometimes the baby is lying in a way that hides part of the view and you will be asked to walk around and come back, or return another day. This is common and not a bad sign.',
      'This is a fixed window. Booking late means fewer options if something needs a closer look.',
      'By law in India, no scan can tell you the sex of your baby, and no one may ask. Trimestt does not record it anywhere.'
    ]
  },
  {
    id: 'weight-gain',
    category: 'Second trimester',
    title: 'Weight gain: what is normal for you',
    read: '2 min',
    body: [
      'There is no single right number. How much you should gain depends on your weight before pregnancy — someone who started slim needs to gain more than someone who started heavier.',
      'Most of the gain happens in the second and third trimesters, usually a little under half a kilo a week. Sudden gain over a few days, especially with swelling in the face and hands, is different and needs checking.',
      'Your doctor sets your range in Trimestt. Weigh yourself at the same time of day, on the same scale, and log it — the trend matters far more than any single reading.'
    ]
  },
  {
    id: 'sugar-screening',
    category: 'Second trimester',
    title: 'Sugar screening between 24 and 28 weeks',
    read: '2 min',
    body: [
      'Pregnancy hormones make it harder for your body to handle sugar. Gestational diabetes usually causes no symptoms at all, which is exactly why everyone is tested.',
      'You will be asked to fast overnight — nothing to eat or drink except water for eight hours. At the hospital you drink a glucose solution and have blood taken at set times, so plan for a two-hour visit.',
      'If it is picked up, most women manage it with food changes and walking. It matters because untreated it makes the baby grow large and makes delivery harder.'
    ]
  },

  /* ---------------------------------------------------- third trimester -- */
  {
    id: 'kick-counting',
    category: 'Third trimester',
    title: 'Counting your baby\'s movements',
    read: '2 min',
    body: [
      'From around twenty-eight weeks, get to know your baby\'s pattern. Pick a time when they are usually active, lie on your left side, and count.',
      'Kicks, rolls, flutters and hiccups all count. There is no set number to reach \u2014 guidance no longer recommends a fixed count, because what matters is a change from what is normal for your own baby. The app sends every count to your hospital and never tells you whether a number is good or bad.',
      'Babies do not slow down towards the end of pregnancy. That belief costs lives. If movements are fewer or feel different from usual, call the hospital the same day — not tomorrow, and do not wait for your next appointment.',
      'Do not try cold drinks or sugar to make the baby move and then feel reassured. Get checked.'
    ]
  },
  {
    id: 'birth-plan',
    category: 'Third trimester',
    title: 'Your hospital bag and birth plan',
    read: '3 min',
    body: [
      'Pack by thirty-four weeks. For you: loose clothes that open at the front, comfortable underwear, maternity pads, toiletries, slippers, and your ID and hospital papers. For the baby: clothes, a blanket, nappies and a soft towel.',
      'Keep your file, previous scan reports and your blood group where anyone in the house can find them — you will not want to be searching at 2 a.m.',
      'Talk through your preferences with your doctor before labour: who will be with you, pain relief, and what happens if a caesarean becomes necessary. A plan is a preference, not a promise — safe delivery decides the rest.'
    ]
  },
  {
    id: 'labour-signs',
    category: 'Labour',
    title: 'True labour or false — how to tell',
    read: '3 min',
    body: [
      'False labour tightening is irregular, does not get stronger, often eases if you change position or walk, and is felt mostly at the front.',
      'True labour comes at regular intervals, gets longer, stronger and closer together, keeps going whatever you do, and is often felt in the lower back moving to the front.',
      'A rough guide for coming in at term: contractions every five minutes, lasting a minute each, for an hour.',
      'Come in immediately, at any week, for: waters breaking, any bleeding, reduced movements, severe headache with blurred vision, or constant severe pain. Use the emergency button in Trimestt — it calls your hospital and sends them your details at the same time.'
    ]
  },
  {
    id: 'preterm',
    category: 'Labour',
    title: 'If labour starts early',
    read: '2 min',
    body: [
      'Any regular tightening, low back pain, pressure, or a gush or trickle of fluid before thirty-seven weeks needs to be assessed straight away.',
      'Do not wait to see if it settles. Given time, your hospital can give injections that help the baby\'s lungs and arrange the right care before birth — but only if you come in early enough for them to work.',
      'The emergency button in Trimestt knows how many weeks you are. Before thirty-seven weeks it tells your hospital to page the consultant, not just the front desk.'
    ]
  },

  /* -------------------------------------------------------- precautions -- */
  {
    id: 'foods-to-avoid',
    category: 'Precautions',
    title: 'Foods to avoid',
    read: '2 min',
    body: [
      'Skip raw or undercooked eggs and meat, unpasteurised milk and the soft cheeses made from it, cut fruit left out at room temperature, and fish high in mercury such as shark and king mackerel.',
      'No alcohol, in any amount. No tobacco, gutka or pan masala, and stay away from other people\'s smoke.',
      'Limit coffee and tea to about two cups a day. Papaya that is not fully ripe and heavy doses of certain herbs are best avoided.',
      'Do not take herbal or ayurvedic preparations without telling your doctor. "Natural" does not mean safe in pregnancy, and some are genuinely risky.'
    ]
  },
  {
    id: 'medicines',
    category: 'Precautions',
    title: 'Medicines and self-treatment',
    read: '2 min',
    body: [
      'Do not take painkillers, antibiotics or anything left over from an earlier illness without asking. Some common tablets are unsafe at particular stages.',
      'Tell every doctor and dentist you see that you are pregnant, including for a fever or a toothache.',
      'If you were already on medicine for thyroid, blood pressure, diabetes or epilepsy, keep taking it unless your doctor changes it. Stopping suddenly is usually more dangerous than continuing.'
    ]
  },
  {
    id: 'daily-life',
    category: 'Precautions',
    title: 'Housework, lifting and standing',
    read: '2 min',
    body: [
      'Normal household work is fine. Bend at the knees rather than the waist, avoid carrying heavy loads, and do not climb on stools or stand on chairs — balance changes as pregnancy goes on.',
      'Standing for long stretches makes swelling and back pain worse. Sit with your feet up for a few minutes every hour.',
      'Walking is the safest exercise for most women through pregnancy. Ask your doctor before starting anything new, especially if you have been told your pregnancy is high risk.'
    ]
  },
  {
    id: 'warning-signs',
    category: 'Precautions',
    title: 'Signs that mean call today',
    read: '1 min',
    body: [
      'Bleeding from the vagina, at any stage. A gush or steady trickle of fluid. Reduced or changed baby movements.',
      'Severe headache, blurred or flashing vision, pain under the ribs on the right, or sudden swelling of the face and hands.',
      'Fever, burning urine with back pain, breathlessness, or constant severe abdominal pain.',
      'None of these are things to sleep on. Call your hospital, or use the emergency button.'
    ]
  },

  /* --------------------------------------------------------- travel etc -- */
  {
    id: 'travel',
    category: 'Travel and work',
    title: 'Flying and long journeys',
    read: '2 min',
    body: [
      'The middle of pregnancy is the easiest time to travel. Most airlines allow flying up to about thirty-six weeks for a single baby, and ask for a doctor\'s letter after twenty-eight. Check your airline before booking, and carry your file.',
      'On any journey over an hour or two, get up and move every hour, keep drinking water, and wear the seat belt low across your hips, under the bump — never across it.',
      'For road journeys, plan stops. Avoid long travel in the last weeks and any travel far from a hospital if you have been told you are high risk.'
    ]
  },
  {
    id: 'work',
    category: 'Travel and work',
    title: 'Working through pregnancy',
    read: '2 min',
    body: [
      'Most jobs are safe to continue. Ask about a change of duties if your work involves heavy lifting, long standing, night shifts, chemicals or radiation.',
      'Keep water and a snack at your desk, and take short walking breaks. Tiredness is worst in the first and last three months.',
      'Indian law provides paid maternity leave for eligible employees. Ask your HR early about your entitlement, when it starts, and what documents they need — it is easier to sort at twenty weeks than at thirty-six.'
    ]
  },
  {
    id: 'festivals',
    category: 'Travel and work',
    title: 'Fasting during festivals',
    read: '2 min',
    body: [
      'Long fasting in pregnancy can lower your blood sugar, leave you dehydrated and make you faint, and matters more if you have diabetes in pregnancy.',
      'If fasting is important to you, talk to your doctor first. Many families adapt the practice — a partial fast, fruit and milk through the day, or someone fasting on your behalf.',
      'Break the fast straight away if you feel dizzy, get a headache, notice fewer movements, or feel your heart racing.'
    ]
  },

  /* -------------------------------------------------------------- food -- */
  {
    id: 'daily-food',
    category: 'Food',
    title: 'A day\'s food, the way you already cook',
    read: '3 min',
    body: [
      'You do not need special or expensive food. You need enough protein, iron, calcium and fibre spread through the day.',
      'A workable day: idli or paratha with curd at breakfast; a mid-morning fruit or a handful of nuts; rice or roti with dal, a vegetable and curd at lunch; buttermilk or sprouts in the evening; roti with dal or egg or fish at dinner; milk at bedtime.',
      'You are not eating for two. In the second half of pregnancy most women need only about one extra small meal a day.',
      'Wash fruit and vegetables well, cook eggs and meat through, and drink boiled or filtered water.'
    ]
  },
  {
    id: 'vegetarian-protein',
    category: 'Food',
    title: 'Protein without meat',
    read: '2 min',
    body: [
      'Dals and pulses, rajma and chana, paneer, curd and milk, soya, peanuts and other nuts, and seeds all carry good protein.',
      'Sprouting and combining — dal with rice, roti with curd — improves how much your body uses.',
      'Curd and buttermilk at meals also help with the acidity many women get later in pregnancy.'
    ]
  },
  {
    id: 'gdm-eating',
    category: 'Food',
    title: 'Eating with diabetes in pregnancy',
    read: '3 min',
    body: [
      'Nothing is completely banned, but the size and timing of carbohydrate matters. Three modest meals and two or three small snacks keeps sugar steadier than two large meals.',
      'Swap towards whole grains, add vegetables and dal to every meal, and eat protein alongside carbohydrate rather than alone. Fruit is fine in small portions, but fruit juice is not.',
      'Walk for ten to fifteen minutes after meals — it lowers post-meal sugar noticeably.',
      'Log your readings in Trimestt. Values above the range your doctor set go straight to the hospital so your treatment can be adjusted early.'
    ]
  },
  {
    id: 'anaemia',
    category: 'Food',
    title: 'Anaemia and what really raises haemoglobin',
    read: '2 min',
    body: [
      'Iron from meat, fish and eggs is absorbed most easily. Iron from greens, dal, jaggery and dates is absorbed less well, but improves a lot when eaten with something sour — lemon, tomato, amla.',
      'Tea and coffee with meals block iron. Move them to between meals.',
      'Food alone rarely corrects anaemia in pregnancy. Your tablets are doing most of the work, which is why taking them regularly matters more than any single food.'
    ]
  },

  /* ---------------------------------------------------- after delivery -- */
  {
    id: 'recovery',
    category: 'After delivery',
    title: 'Your first six weeks',
    read: '3 min',
    body: [
      'Bleeding is heaviest for the first few days, then reduces and changes colour over the weeks. Cramping while feeding is normal — it is your uterus shrinking back.',
      'Keep any wound clean and dry, whether stitches below or a caesarean scar. Take the pain relief you were given rather than enduring it; pain makes moving and feeding harder.',
      'Rest when you can, eat and drink properly, and let others carry the load. Full recovery takes longer than most families expect.',
      'Call the hospital for: soaking a pad in an hour, large clots, fever, a wound that is red hot or leaking, severe headache, breathlessness, or pain and swelling in one leg.'
    ]
  },
  {
    id: 'mood',
    category: 'After delivery',
    title: 'Feeling low after birth',
    read: '2 min',
    body: [
      'Tearfulness and mood swings in the first week are very common and usually pass. Sleep loss makes everything harder.',
      'If low mood, hopelessness, constant anxiety or not being able to enjoy anything lasts beyond two weeks, that is not weakness and it is not your fault. It is common, and it is treatable.',
      'Tell your doctor at your postnatal visit, or sooner. Trimestt asks you a few questions at two and six weeks — answer them honestly. If you ever have thoughts of harming yourself or the baby, tell someone today.'
    ]
  },
  {
    id: 'contraception',
    category: 'After delivery',
    title: 'Contraception after delivery',
    read: '2 min',
    body: [
      'Fertility can return before your periods do, and breastfeeding alone is not reliable protection.',
      'There are options that are safe while breastfeeding, and options fitted at the time of delivery or at the six-week visit.',
      'Discuss it before you leave the hospital rather than after. It is a shorter conversation than it feels.'
    ]
  },

  /* ------------------------------------------------------ breastfeeding -- */
  {
    id: 'latch',
    category: 'Breastfeeding',
    title: 'Getting the latch right',
    read: '3 min',
    body: [
      'Hold the baby chest to chest, ear, shoulder and hip in a line, nose level with the nipple. Wait for a wide open mouth, then bring the baby to you rather than leaning down.',
      'A good latch takes in more than the nipple: more of the dark area visible above the lip than below, chin pressed in, cheeks full, and slow deep sucks with swallowing.',
      'It may tug for a few seconds at the start. Sharp pain, cracked skin, or a lipstick-shaped nipple after the feed all mean the latch needs fixing. Break the suction with a clean finger and start again.',
      'Ask for help early. One good session with a nurse saves weeks of difficulty.'
    ]
  },
  {
    id: 'enough-milk',
    category: 'Breastfeeding',
    title: 'Is my baby getting enough',
    read: '2 min',
    body: [
      'The reliable signs are output and weight: six or more wet nappies a day after day five, regular soft stools, and steady weight gain after the normal early dip.',
      'Feeding often, cluster feeding in the evening, short feeds, and a baby who wants to feed again soon are all normal and are not proof of low supply.',
      'The first milk, colostrum, comes in tiny amounts and is exactly what a newborn needs. Fuller milk usually arrives by day three or four.',
      'If your baby is sleepy and not waking to feed, has fewer than six wet nappies, or is losing weight after day five, contact your hospital.'
    ]
  },
  {
    id: 'breast-problems',
    category: 'Breastfeeding',
    title: 'Engorgement, cracks and mastitis',
    read: '2 min',
    body: [
      'Engorgement — hard, painful, overfull breasts around day three — eases with frequent feeding, a warm compress before and a cold one after, and hand expressing just enough to soften before latching.',
      'Cracked nipples are almost always a latch problem. Fix the latch, express a little milk onto the skin after feeds, and let it air dry.',
      'Mastitis is a hot, red, painful area with fever and body ache. Keep feeding from that side — it helps clear it — and call your hospital the same day, as you may need treatment.'
    ]
  },
  {
    id: 'expressing',
    category: 'Breastfeeding',
    title: 'Expressing, storing and going back to work',
    read: '2 min',
    body: [
      'Start expressing a couple of weeks before you return so your baby gets used to being fed by someone else, and you learn how long it takes.',
      'Fresh milk keeps about four hours at room temperature, up to three or four days in the back of the fridge, and months in a proper freezer. Store in small clean portions and label them with the date.',
      'Warm in a bowl of warm water, never in a microwave. Do not refreeze thawed milk.',
      'Expressing at work every few hours protects your supply and keeps you comfortable.'
    ]
  },

  /* ----------------------------------------------------------- newborn -- */
  {
    id: 'newborn-week-one',
    category: 'Newborn',
    title: 'The first week at home',
    read: '3 min',
    body: [
      'Newborns feed eight to twelve times in a day, sleep in short stretches, and lose a little weight before regaining it by around two weeks.',
      'Keep the cord stump clean and dry. Nothing needs to be applied to it. It usually falls off in one to two weeks. Redness spreading onto the belly, a bad smell or discharge needs checking.',
      'Room temperature clothing, one layer more than you are wearing, is enough. Overwrapping is more common than underwrapping and is not safe.',
      'Lay the baby on the back to sleep, on a firm flat surface, with no pillows, loose bedding or soft toys.'
    ]
  },
  {
    id: 'jaundice',
    category: 'Newborn',
    title: 'Jaundice: what to watch',
    read: '2 min',
    body: [
      'Mild yellowing of the face and chest appearing after the second day is common and usually settles as feeding gets established. Feeding often is the best thing you can do.',
      'Get the baby checked the same day if the yellow appears in the first twenty-four hours, spreads to the belly, arms or legs, reaches the palms and soles, or if the baby is sleepy, feeding poorly or has dark urine and pale stools.',
      'Do not rely on sunlight through a window to treat it, and do not wait for the next appointment to have it looked at.'
    ]
  },
  {
    id: 'baby-danger-signs',
    category: 'Newborn',
    title: 'When to bring the baby in now',
    read: '1 min',
    body: [
      'Not feeding or refusing feeds. Unusually sleepy, floppy or hard to wake. Fast or difficult breathing, or grunting. Fever, or a body that feels cold. Fits or unusual jerky movements. Yellow palms and soles.',
      'Any one of these means going in straight away, at any hour.',
      'These signs are on their own card in your baby\'s profile in Trimestt. Tapping them tells your hospital immediately.'
    ]
  },
  {
    id: 'crying',
    category: 'Newborn',
    title: 'Crying, colic and comfort',
    read: '2 min',
    body: [
      'Crying peaks around six weeks and settles by three to four months. Evening fussiness is normal and is not a sign you are doing anything wrong.',
      'Try feeding, a nappy change, skin to skin, gentle rocking, swaddling, a walk, or quiet and dim light. Some babies simply need to be held.',
      'Never shake a baby, however exhausted you are. Put the baby down safely in the cot, step away for a few minutes, and call someone. Being overwhelmed is common — ask for help.'
    ]
  },

  /* -------------------------------------------------------- baby care -- */
  {
    id: 'vaccines-explained',
    category: 'Baby care',
    title: 'Vaccines, explained simply',
    read: '3 min',
    body: [
      'Vaccines work by teaching the body to recognise an infection before it meets the real thing. Newborn protection from you fades over the first months, which is why the schedule starts early.',
      'Mild fever, fussiness or a sore red spot for a day or two is expected. Paracetamol at the dose your doctor advises is usually enough. A high fever that lasts, a fit, or a baby who becomes very unwell needs to be seen.',
      'Being a week or two late is not a disaster, but do not restart the course — your hospital will catch up. Trimestt shows what is due and what has become overdue.',
      'Keep the record. Schools ask for it, and you will not remember the dates.'
    ]
  },
  {
    id: 'growth-charts',
    category: 'Baby care',
    title: 'Growth charts and percentiles',
    read: '2 min',
    body: [
      'A percentile is simply where your baby sits among other babies of the same age. A baby on the twenty-fifth line is not doing worse than one on the seventy-fifth — both can be perfectly healthy.',
      'What matters is the curve. A baby who follows their own line steadily is growing well.',
      'What is worth checking is a baby who crosses down through lines, stops gaining, or gains very fast. Log weight regularly so the line is real rather than a guess.'
    ]
  },
  {
    id: 'starting-solids',
    category: 'Baby care',
    title: 'Starting solids at six months',
    read: '3 min',
    body: [
      'Until six months, breast milk or formula is all that is needed — no water, no honey, no cow\'s milk as a drink.',
      'Start when the baby can sit with support, holds the head steady, and shows interest in food. Begin with a few spoons once a day of something smooth: mashed dal and rice, ragi porridge, well-cooked vegetables, mashed banana or curd.',
      'Add one new food every three days so you can spot anything that does not agree. Keep milk feeds going alongside — food is in addition, not instead, in the first year.',
      'Avoid added salt and sugar, whole nuts, and anything hard and round that could choke.'
    ]
  }
];

/* ---------- v7: 50 further guides ---------- */
window.TRIMESTT_GUIDES = window.TRIMESTT_GUIDES.concat([

  /* ============ FOOD ============ */
  { id: 'plate-method', category: 'Food', title: 'What a good plate looks like', read: '2 min', body: [
    'Half the plate vegetables and a fruit, a quarter whole grain — rice, roti, millet — and a quarter protein: dal, curd, paneer, egg, fish or chicken.',
    'This works with the food you already cook. You do not need imported grains, protein powders or special pregnancy products.',
    'Add a little ghee or oil for cooking. Fat is not the enemy in pregnancy; empty sugar is.'] },
  { id: 'first-trimester-eating', category: 'Food', title: 'Eating when everything tastes wrong', read: '2 min', body: [
    'Taste changes are real and temporary. Eat what stays down. A few weeks of plain khichdi is better than a perfect diet you vomit.',
    'Cold food often smells less and is easier to keep down. So are salty, dry things — toast, khakhra, biscuits.',
    'Keep taking folic acid even on bad days. If you cannot keep water down for a day, call the hospital.'] },
  { id: 'protein-daily', category: 'Food', title: 'Getting enough protein every day', read: '2 min', body: [
    'From the second trimester your body needs noticeably more protein — it is building your baby, your placenta and your own blood supply.',
    'A practical target: a protein food at every meal and one snack. One katori dal, one cup curd, one egg, a fistful of peanuts, a piece of fish.',
    'Sprouting dals and combining dal with rice or roti improves how much your body actually absorbs.'] },
  { id: 'calcium-sources', category: 'Food', title: 'Calcium beyond milk', read: '2 min', body: [
    'If milk does not suit you, calcium also comes from curd, paneer, ragi, sesame seeds, almonds, green leafy vegetables and small fish eaten with bones.',
    'Take your calcium tablet at a different time from iron — together, each blocks the other.',
    'Calcium supplements also lower the risk of high blood pressure in pregnancy, which is why your doctor prescribes them even if you eat well.'] },
  { id: 'iron-rich-foods', category: 'Food', title: 'Foods that help your haemoglobin', read: '2 min', body: [
    'Best absorbed: liver, meat, fish, eggs. Also useful: dal, rajma, chana, ragi, dates, jaggery, green leafy vegetables.',
    'Pair them with something sour — lemon, tomato, amla, orange. Vitamin C roughly doubles absorption from plant sources.',
    'Keep tea and coffee an hour away from meals. Food alone rarely corrects anaemia, so keep taking your tablets.'] },
  { id: 'snacks', category: 'Food', title: 'Snacks that are worth eating', read: '2 min', body: [
    'Roasted chana, peanuts, sprouts chaat, curd, boiled egg, fruit with a handful of nuts, buttermilk, poha, upma, a small paratha with curd.',
    'These carry protein and fibre. Biscuits, chips and sweet drinks carry neither, and they push your sugar up quickly.',
    'Keep something ready in the kitchen. Hunger at 4pm decides what you eat far more than good intentions at breakfast.'] },
  { id: 'street-food', category: 'Food', title: 'Eating out, safely', read: '2 min', body: [
    'The risk in outside food is contamination, not the food itself. Prefer freshly cooked and served hot over anything sitting out.',
    'Avoid cut fruit, salads washed in unknown water, chutneys left at room temperature, and raw sprouts served cold.',
    'Carry your own water. A stomach infection in pregnancy is miserable and sometimes needs admission.'] },
  { id: 'sugar-limit', category: 'Food', title: 'Sugar, sweets and festivals', read: '2 min', body: [
    'You do not need to give up sweets entirely, but the quantity matters more now, especially if your sugar screening was borderline.',
    'A small piece after a meal is better than sweets on an empty stomach, because the rise is slower.',
    'Fruit juice, cold drinks and sweetened milk raise sugar faster than most food. Eat the fruit instead of drinking it.'] },
  { id: 'salt-swelling', category: 'Food', title: 'Salt, swelling and pickles', read: '2 min', body: [
    'Mild swelling of feet by evening is normal in later pregnancy. It usually settles overnight.',
    'You do not need a salt-free diet, but go easy on pickles, papads, packet snacks and restaurant food if you swell easily.',
    'Sudden swelling of face and hands, especially with headache or blurred vision, is different — call the hospital the same day.'] },
  { id: 'vegetarian-plan', category: 'Food', title: 'A vegetarian day that works', read: '2 min', body: [
    'Breakfast: poha or upma with peanuts, plus curd. Mid-morning: fruit and almonds. Lunch: rice or roti, dal, sabzi, curd.',
    'Evening: buttermilk or sprouts. Dinner: roti, paneer or dal, vegetable. Bedtime: milk if it suits you.',
    'Vegetarian pregnancies do very well. What they need is attention to iron, B12 and protein — which is exactly what your tablets cover.'] },

  /* ============ MEDICINES AND SAFETY ============ */
  { id: 'meds-to-avoid', category: 'Medicines', title: 'Medicines to avoid unless your doctor says so', read: '3 min', body: [
    'Common painkillers such as ibuprofen and diclofenac are avoided in pregnancy, particularly after 20 weeks. Paracetamol is usually the safe choice, at the dose your doctor advises.',
    'Do not take leftover antibiotics, acne medicines, hormone tablets, or anything a chemist suggests over the counter.',
    'Isotretinoin for acne and some blood pressure medicines are seriously unsafe in pregnancy. If you were on any regular medicine before, ask your doctor rather than stopping on your own.'] },
  { id: 'herbal-care', category: 'Medicines', title: 'Herbal and ayurvedic preparations', read: '2 min', body: [
    'Natural does not mean safe. Some herbal preparations stimulate the uterus, and some sold in the market have been found to contain heavy metals.',
    'Tell your doctor about anything you are taking, including things given by family elders with good intentions.',
    'Common kitchen spices in normal cooking quantities are fine. Concentrated extracts and churnas are a different matter.'] },
  { id: 'existing-conditions', category: 'Medicines', title: 'If you already take medicine for something', read: '2 min', body: [
    'Thyroid, blood pressure, diabetes, epilepsy, asthma, depression — these usually need continuing, sometimes with a change of drug or dose.',
    'Stopping suddenly is often more dangerous for you and the baby than continuing. Never stop on your own.',
    'Bring the full list to your booking visit, including doses, so it can be reviewed once rather than argued over each time.'] },
  { id: 'vaccines-in-pregnancy', category: 'Medicines', title: 'Vaccines during pregnancy', read: '2 min', body: [
    'Tetanus protection is routine. Influenza vaccine is recommended in many pregnancies, and Tdap protects the newborn from whooping cough.',
    'Live vaccines such as MMR and chickenpox are not given during pregnancy — they are for before or after.',
    'If you are due for anything else, or are travelling, ask your doctor before taking any vaccine.'] },
  { id: 'x-rays-scans', category: 'Medicines', title: 'X-rays, dental work and other tests', read: '2 min', body: [
    'Tell every doctor and dentist that you are pregnant, even for a toothache or a fracture.',
    'Dental treatment is safe and gum problems are common in pregnancy, so do not postpone it.',
    'Ultrasound is safe. X-rays and CT scans are avoided unless necessary, and when they are necessary, they are done with shielding.'] },
  { id: 'infections-avoid', category: 'Medicines', title: 'Infections worth avoiding', read: '2 min', body: [
    'Wash hands before eating, avoid people with chickenpox, measles or rubella if you have not had them, and be careful with cat litter and garden soil.',
    'Fever above 100.4°F, burning urine with back pain, or a rash with fever should be seen the same day.',
    'Urinary infections are common in pregnancy and can bring on early labour if ignored.'] },
  { id: 'smoking-alcohol', category: 'Medicines', title: 'Tobacco, alcohol and second-hand smoke', read: '2 min', body: [
    'There is no safe amount of alcohol or tobacco in pregnancy, including gutka, khaini and pan masala.',
    'Second-hand smoke matters too. If someone smokes at home, ask them to do it outside, away from you.',
    'If you are finding it hard to stop, say so at your visit. It is a medical problem with help available, not a character failing.'] },
  { id: 'travel-vaccines', category: 'Medicines', title: 'Supplements you may not need', read: '2 min', body: [
    'Folic acid, iron and calcium are prescribed for good reason. Beyond those, most supplements add cost rather than benefit.',
    'High-dose vitamin A is actively harmful in pregnancy. Avoid cod liver oil and any supplement with retinol unless prescribed.',
    'Show your doctor the packet of anything you have been recommended before you start it.'] },

  /* ============ SLEEP AND REST ============ */
  { id: 'sleep-position', category: 'Sleep and rest', title: 'How to sleep, and which side', read: '2 min', body: [
    'From the second half of pregnancy, sleeping on your side is advised — the left side is the usual recommendation, as it helps blood flow to the placenta.',
    'A pillow between your knees and one under the bump makes it far more comfortable. A wedge behind your back stops you rolling over.',
    'If you wake up on your back, do not panic. Just turn to your side and go back to sleep.'] },
  { id: 'sleep-quality', category: 'Sleep and rest', title: 'When sleep will not come', read: '2 min', body: [
    'Broken sleep is very common in late pregnancy — the bump, heartburn, and needing to pass urine all interrupt.',
    'A short afternoon rest is more useful than lying awake at night worrying about sleep. Keep the last meal light and early.',
    'Do not take sleeping tablets, including anything herbal, without asking your doctor.'] },
  { id: 'heartburn-night', category: 'Sleep and rest', title: 'Heartburn at night', read: '2 min', body: [
    'Eat dinner at least two hours before lying down, keep the portion small, and raise the head end of the bed slightly.',
    'Milk, curd or a few almonds often help. Fried, very spicy or very oily food at night usually does not.',
    'If it is severe, there are safe antacids in pregnancy — ask rather than suffering through it.'] },
  { id: 'leg-cramps', category: 'Sleep and rest', title: 'Leg cramps and restless legs', read: '2 min', body: [
    'Night cramps in the calves are common from mid-pregnancy. Stretch the calf by pulling your toes towards you, and walk it off.',
    'Regular gentle walking, enough fluids and your calcium tablet all help reduce them.',
    'Pain in one calf with swelling, redness or warmth is different and needs to be seen the same day.'] },
  { id: 'rest-at-work', category: 'Sleep and rest', title: 'Resting when you have no time to rest', read: '2 min', body: [
    'Ten minutes with your feet up, twice a day, does more than an hour of lying down at midnight.',
    'If you stand or sit for long stretches at work, move every hour, even if only to the water cooler.',
    'Tiredness in the first and last three months is your body doing heavy work. It is not weakness.'] },

  /* ============ MOVEMENT ============ */
  { id: 'walking-how-much', category: 'Movement', title: 'How much walking is right', read: '2 min', body: [
    'For most women, 30 minutes of brisk-ish walking on most days is ideal. It can be split into two or three shorter walks.',
    'The test is simple: you should be able to hold a conversation while walking. If you cannot, slow down.',
    'Stop and rest for bleeding, pain, dizziness, breathlessness out of proportion, or tightening that keeps coming.'] },
  { id: 'safe-exercises', category: 'Movement', title: 'Exercises that suit pregnancy', read: '2 min', body: [
    'Walking, stationary cycling, swimming, prenatal yoga and light stretching all suit most pregnancies.',
    'Avoid contact sports, anything with a fall risk, lying flat on your back for long periods after the fourth month, and heavy weights.',
    'If you were very active before pregnancy you can usually continue, with adjustments. Ask your doctor about your specific routine.'] },
  { id: 'pelvic-floor', category: 'Movement', title: 'Pelvic floor exercises, properly explained', read: '2 min', body: [
    'Squeeze the muscles you would use to stop yourself passing urine, hold for a few seconds, then relax fully. Ten times, a few times a day.',
    'Do not do it while actually passing urine, and do not hold your breath.',
    'These exercises reduce leaking later, help recovery after delivery, and take under two minutes a day.'] },
  { id: 'back-pain', category: 'Movement', title: 'Back pain and how to sit', read: '2 min', body: [
    'Sit with your back supported and both feet on the floor. Avoid low soft sofas that you sink into.',
    'Bend at the knees to pick things up, and keep loads close to your body. Avoid carrying a child on one hip for long.',
    'Pelvic tilts, gentle stretching and a warm compress help. Severe or sudden back pain, especially with tightening, needs checking.'] },
  { id: 'yoga-pregnancy', category: 'Movement', title: 'Yoga in pregnancy', read: '2 min', body: [
    'Prenatal yoga classes are designed around what changes in pregnancy. A general class is not the same thing.',
    'Skip deep twists, strong abdominal work, inversions and hot yoga. Breathing practice and gentle stretching are the useful parts.',
    'Tell your instructor how many weeks you are, every time. What is fine at 16 weeks is not always fine at 34.'] },
  { id: 'travel-sitting', category: 'Movement', title: 'Long journeys and swollen legs', read: '2 min', body: [
    'On any journey over an hour, get up or shift position and stretch your calves regularly, and keep drinking water.',
    'Wear the seat belt low across the hips, under the bump, with the shoulder strap between the breasts — never across the bump.',
    'Compression stockings help on long flights. Ask your doctor before travelling far in the last weeks.'] },
  { id: 'after-delivery-movement', category: 'Movement', title: 'Moving again after delivery', read: '2 min', body: [
    'Short walks start early, even after a caesarean — moving reduces the risk of clots and helps recovery.',
    'Pelvic floor exercises can restart as soon as it is comfortable. Abdominal exercises wait until after your six-week check.',
    'Build up gradually. Bleeding that increases when you do more is a sign to slow down.'] },

  /* ============ DAILY ROUTINE ============ */
  { id: 'daily-routine', category: 'Daily routine', title: 'A day that works in pregnancy', read: '3 min', body: [
    'Wake at a regular time, eat within an hour, take your tablets at the times your doctor set, and drink water through the morning.',
    'Move a little after each meal. Rest with your feet up mid-afternoon. Keep dinner early and light.',
    'Log your readings at the same time each day — it takes a minute and it is what lets your hospital spot a change early.'] },
  { id: 'housework', category: 'Daily routine', title: 'Housework, standing and lifting', read: '2 min', body: [
    'Ordinary housework is fine. Avoid climbing on stools, moving furniture, and lifting anything heavy.',
    'Break long standing tasks into parts. Sit for chopping, and use a stool at the kitchen counter if you have one.',
    'Ask for help with the heavy work. In most families nobody offers until you say what you need.'] },
  { id: 'work-pregnancy', category: 'Daily routine', title: 'Working through pregnancy', read: '2 min', body: [
    'Most jobs are safe to continue. Ask about changed duties if your work involves heavy lifting, long standing, night shifts, chemicals or radiation.',
    'Keep water and a snack at your desk and take short walking breaks.',
    'Speak to HR early about maternity leave — what you are entitled to, when it starts and what documents they need.'] },
  { id: 'hygiene', category: 'Daily routine', title: 'Everyday hygiene that matters more now', read: '2 min', body: [
    'Wash hands before eating and after handling raw meat, soil or pets. Keep drinking water boiled or filtered.',
    'Change out of wet clothes promptly, keep the genital area dry, and wear cotton underwear — infections are commoner in pregnancy.',
    'Do not douche or use vaginal cleaning products. They do more harm than good.'] },
  { id: 'skin-hair', category: 'Daily routine', title: 'Skin, hair and cosmetics', read: '2 min', body: [
    'Dark patches, a line down the belly and stretch marks are normal and mostly fade. Moisturising helps the itching more than the marks.',
    'Avoid retinol and salicylic acid products, and skin-lightening creams of unknown composition.',
    'Hair colouring is generally considered low risk after the first trimester, in a ventilated room. Ask your doctor if unsure.'] },
  { id: 'intimacy', category: 'Daily routine', title: 'Intimacy in pregnancy', read: '2 min', body: [
    'For most pregnancies it is safe throughout, and it does not harm the baby.',
    'Your doctor may advise against it in specific situations — bleeding, a low-lying placenta, leaking, or a history of early delivery.',
    'Comfort changes as the bump grows. If anything hurts or causes bleeding afterwards, mention it at your visit.'] },

  /* ============ COMMON DISCOMFORTS ============ */
  { id: 'constipation', category: 'Common discomforts', title: 'Constipation and piles', read: '2 min', body: [
    'Iron tablets and pregnancy hormones both slow the bowel. More water, more fibre — fruit, vegetables, whole grains — and daily walking usually fix it.',
    'Do not strain. If you need a laxative, ask which one is safe rather than buying one.',
    'Piles are common and usually settle after delivery. Warm sitz baths and avoiding straining help most.'] },
  { id: 'nausea-later', category: 'Common discomforts', title: 'Acidity, gas and bloating', read: '2 min', body: [
    'Smaller, more frequent meals help more than anything else. So does not lying down for two hours after eating.',
    'Fried and very spicy food, large volumes of tea or coffee, and eating in a rush all make it worse.',
    'Safe antacids exist in pregnancy. Ask before taking anything you have at home.'] },
  { id: 'urination', category: 'Common discomforts', title: 'Passing urine often — and when it is a problem', read: '2 min', body: [
    'Frequent urination is normal, especially early and late in pregnancy, as the uterus presses on the bladder.',
    'Burning, urgency, blood, foul smell or back pain with fever is not normal. That is an infection and needs treatment.',
    'Do not cut down fluids to reduce trips. Dehydration causes contractions.'] },
  { id: 'discharge', category: 'Common discomforts', title: 'Vaginal discharge — normal and not', read: '2 min', body: [
    'Increased clear or milky-white discharge without itching or smell is normal in pregnancy.',
    'Itching, burning, a curdy or greenish discharge, or a strong smell suggests infection — treatable, but see your doctor.',
    'A watery gush or continuous trickle may be your waters. That needs assessment the same day, at any stage.'] },
  { id: 'headache', category: 'Common discomforts', title: 'Headaches', read: '2 min', body: [
    'Ordinary headaches are common — often from missed meals, poor sleep, or not enough fluid.',
    'Paracetamol at the advised dose is usually the safe option. Avoid other painkillers.',
    'A severe headache, especially with blurred vision, flashing lights, upper abdominal pain or sudden swelling, is an emergency. Call the hospital.'] },
  { id: 'dizzy', category: 'Common discomforts', title: 'Dizziness and fainting', read: '2 min', body: [
    'Standing up slowly, eating regularly and keeping fluids up prevents most of it. Do not stand for long in one place.',
    'Lying flat on your back later in pregnancy can make you feel faint — turn onto your side instead.',
    'Fainting, or dizziness with palpitations or breathlessness, should be checked. Anaemia is a common and treatable cause.'] },
  { id: 'braxton', category: 'Common discomforts', title: 'Tightening that is not labour', read: '2 min', body: [
    'Irregular painless tightening — Braxton Hicks — is normal from mid-pregnancy. It often settles with rest and water.',
    'Dehydration and a full bladder both bring it on. Drink, empty your bladder, lie on your side.',
    'Tightening that becomes regular, stronger and closer together, before 37 weeks, needs assessment now.'] },
  { id: 'breathless', category: 'Common discomforts', title: 'Feeling breathless', read: '2 min', body: [
    'Mild breathlessness on exertion is common as the uterus pushes up. It is usually not dangerous.',
    'Breathlessness at rest, at night, with chest pain, or with a fast heartbeat is not normal.',
    'Anaemia and thyroid problems both cause it, and both are easy to test for. Mention it rather than assuming it is the pregnancy.'] },

  /* ============ MIND ============ */
  { id: 'anxiety', category: 'Mind and family', title: 'Worry and anxiety in pregnancy', read: '2 min', body: [
    'Some anxiety is universal, especially after a previous loss or a difficult delivery. It does not make you a bad mother.',
    'Talk to someone — your partner, a friend, your doctor. Avoid searching symptoms online at 2am; it reliably makes things worse.',
    'If worry stops you sleeping, eating or functioning, tell your doctor. It is treatable, and treating it is better for the baby too.'] },
  { id: 'family-pressure', category: 'Mind and family', title: 'Advice from everyone', read: '2 min', body: [
    'Everyone will have advice, much of it from a different generation and some of it wrong. You do not have to argue with it.',
    'A useful phrase: "the doctor has told me to do it this way." It ends most conversations kindly.',
    'Bring the questions you cannot settle to your next visit, and ask them out loud.'] },
  { id: 'partner-role', category: 'Mind and family', title: 'What your partner can actually do', read: '2 min', body: [
    'Come to at least the scan visits. Learn the danger signs. Know the hospital route and where the bag is.',
    'Take over the heavy housework without being asked, and protect her sleep in the last weeks.',
    'After delivery, the most useful thing is taking the baby for an hour so she can sleep properly.'] },
  { id: 'previous-loss', category: 'Mind and family', title: 'Pregnancy after a loss', read: '2 min', body: [
    'It is normal to feel guarded rather than joyful, and to fear every scan. That is grief, not pessimism.',
    'Tell your doctor about the previous loss even if it was years ago — it changes what they watch for.',
    'Ask for extra reassurance visits if you need them. Most hospitals will arrange it without question.'] },

  /* ============ BIRTH PREP ============ */
  { id: 'hospital-bag', category: 'Preparing for birth', title: 'What to pack, and when', read: '2 min', body: [
    'Pack by 34 weeks. For you: loose front-opening clothes, comfortable underwear, maternity pads, toiletries, slippers, ID and hospital file.',
    'For the baby: clothes, blanket, nappies, soft towel, and a cap.',
    'Keep it by the door, and tell everyone in the house where it is.'] },
  { id: 'birth-plan-talk', category: 'Preparing for birth', title: 'Talking about your birth preferences', read: '2 min', body: [
    'Discuss who will be with you, pain relief options, and what happens if a caesarean becomes necessary — before labour, not during.',
    'A birth plan is a set of preferences, not a promise. Safe delivery decides the rest.',
    'Ask what your hospital does routinely, so nothing on the day is a surprise.'] },
  { id: 'when-to-come', category: 'Preparing for birth', title: 'When to leave for the hospital', read: '2 min', body: [
    'At term, the usual guide is contractions every five minutes, lasting a minute, for an hour.',
    'Come immediately at any stage for waters breaking, bleeding, reduced movements, severe headache with blurred vision, or constant severe pain.',
    'Use the emergency button in the app — it calls your hospital and sends them your details at the same time.'] },
  { id: 'caesarean-prep', category: 'Preparing for birth', title: 'If a caesarean is planned', read: '2 min', body: [
    'You will be told when to stop eating and drinking. Follow it exactly — it matters for the anaesthetic.',
    'Recovery is slower than a normal delivery. Arrange help at home for at least two weeks.',
    'Ask about pain relief afterwards. Being in pain makes feeding and moving harder, and both matter for recovery.'] }

]);

/* ---------- v15: the topics she asked for ---------- */
window.TRIMESTT_GUIDES = window.TRIMESTT_GUIDES.concat([

  { id: 'fears', category: 'Mind and family', title: 'The fears nobody says out loud', read: '3 min', body: [
    'Fear of losing the baby, of the pain, of a caesarean, of not being a good mother, of something being wrong at the scan — almost every pregnant woman carries at least one of these, and almost none of them say it.',
    'Naming the fear to your doctor is not wasting their time. It is often the fastest way to find out that what you are afraid of is either unlikely, or manageable, or already being watched for.',
    'What does not help: searching symptoms late at night, and comparing yourself to other people\'s pregnancies. What does help: asking a direct question and getting a direct answer.',
    'If fear is stopping you sleeping or eating, tell your doctor. Anxiety in pregnancy is common and treatable, and treating it is better for the baby too.'] },

  { id: 'liquids', category: 'Food', title: 'What to drink, and what to leave', read: '3 min', body: [
    'Good: water through the day, buttermilk, coconut water, milk if it suits you, fresh lime water, soups, and fresh fruit juice in small quantities.',
    'Limit: tea and coffee to about two cups a day, and keep them away from your iron tablet. Fruit juice raises sugar quickly, so eat the fruit instead where you can.',
    'Avoid: alcohol entirely, energy drinks, unpasteurised or raw milk, juice from cut fruit standing at a stall, and any herbal or "detox" drink you have not asked your doctor about.',
    'Sugarcane juice and packaged drinks are mostly sugar. If your sugar screening was borderline, treat them as a sweet, not a drink.'] },

  { id: 'myths', category: 'Myths and facts', title: 'Ten things people will tell you that are not true', read: '4 min', body: [
    'You must eat for two — no. Most women need only a small extra meal a day in the second half of pregnancy.',
    'Papaya or pineapple will cause a miscarriage — ripe papaya and pineapple in normal amounts are fine. Unripe papaya is the one to avoid.',
    'Ghee in the last month makes delivery easier — it does not. It adds calories, nothing else.',
    'A bump shape tells you the baby\'s sex — it does not, and asking is against the law in India.',
    'Saffron makes the baby fair — skin colour is decided by genes, not by food.',
    'You should not bathe daily, or wash your hair — you should. Hygiene matters more now, not less.',
    'Walking a lot brings on labour early — normal walking is safe and good for you.',
    'Heartburn means the baby has hair — an old story with no basis.',
    'A caesarean means you failed — it does not. It means a safe delivery needed a different route.',
    'Breastfeeding ruins your figure — it does not, and it lowers your risk of some cancers.'] },

  { id: 'constipation-detail', category: 'Common discomforts', title: 'Constipation, in detail', read: '3 min', body: [
    'It happens because pregnancy hormones slow the bowel and iron tablets make it worse. Almost everyone gets it at some point.',
    'What works: water through the day, fruit with the skin where safe, vegetables, whole grains, soaked raisins or figs, curd, and walking. A warm drink in the morning helps many women.',
    'What does not: straining, holding it in when you feel the urge, and buying laxatives off the shelf.',
    'If nothing has moved for three days, or there is pain, bleeding or a hard swollen abdomen, ask your doctor. There are safe options in pregnancy — you do not have to endure it.'] },

  { id: 'epilepsy', category: 'Existing conditions', title: 'Pregnancy with epilepsy or fits', read: '3 min', body: [
    'Most women with epilepsy have healthy pregnancies. The single most dangerous thing is stopping your medicine on your own — an uncontrolled fit is more risky for the baby than the tablets.',
    'Tell your obstetrician and your neurologist as early as possible, ideally before conceiving. Some medicines are changed and folic acid is often given at a higher dose.',
    'Sleep loss, missed doses and fever all make fits more likely. Keep the routine steady.',
    'A fit for the first time in pregnancy, especially in the second half with headache, swelling or high blood pressure, is an emergency — that can be eclampsia. Call the hospital immediately.'] },

  { id: 'spicy', category: 'Food', title: 'Spicy food, pickles and cravings', read: '2 min', body: [
    'Spicy food does not harm the baby. It can make heartburn and piles worse, which is the real reason to go easy on it later in pregnancy.',
    'Pickles and papads are mostly salt. Fine occasionally, less good if you swell easily or your blood pressure is being watched.',
    'Cravings are normal. Craving non-food things — mud, chalk, raw rice, ice — is not, and often means anaemia. Tell your doctor.'] },

  { id: 'pcos', category: 'Existing conditions', title: 'Pregnancy with PCOS or PCOD', read: '3 min', body: [
    'Women with PCOS have a somewhat higher chance of diabetes in pregnancy, high blood pressure and early delivery — which is why your doctor may screen you earlier and more often.',
    'If you were on metformin or thyroid medicine, do not stop it without asking. Many women continue.',
    'Steady eating, walking after meals, and keeping to your weight-gain range matter more for you than for most.',
    'Having PCOS does not mean a difficult pregnancy. It means a more closely watched one.'] },

  { id: 'thyroid', category: 'Existing conditions', title: 'Thyroid in pregnancy', read: '2 min', body: [
    'Thyroid problems are common in India and are picked up in your booking bloods. Untreated, they affect the baby\'s development — treated, the pregnancy usually goes normally.',
    'Take the tablet on an empty stomach, first thing, and wait half an hour before food, tea, calcium or iron.',
    'The dose often needs increasing during pregnancy, so keep the repeat tests your doctor asks for.'] },

  { id: 'clothing', category: 'Daily routine', title: 'What to wear, and what to avoid', read: '2 min', body: [
    'Loose, cotton and breathable is the whole rule. Anything tight at the waist makes heartburn and swelling worse.',
    'A well-fitted, non-wired bra with wide straps; go a size up as you change. Cotton underwear, changed daily.',
    'Flat or low, non-slip footwear. Balance changes, and falls are the injury we actually worry about.',
    'Saris and salwars are fine — just tie the petticoat below the bump, not across it. For sleeping, side-lying with a pillow between the knees is more comfortable than any special garment.',
    'Avoid tight abdominal binders unless your doctor prescribed one.'] },

  { id: 'hunger', category: 'Common discomforts', title: 'Hunger, and losing your appetite', read: '2 min', body: [
    'Constant hunger in the second trimester is normal. Answer it with protein and fibre rather than biscuits, or the hunger returns in an hour.',
    'Losing your appetite in the last weeks is also normal — the stomach has less room. Small frequent meals work better than trying to finish a large plate.',
    'What is not normal: no appetite with vomiting, weight loss, or feeling faint. That needs checking.',
    'Sudden extreme hunger with sweating or shakiness can be low blood sugar, especially if you are on diabetes treatment. Tell your doctor.'] },

  { id: 'ideal-sleep', category: 'Sleep and rest', title: 'How much sleep, and how to get it', read: '2 min', body: [
    'Seven to nine hours at night, plus a short rest in the day if you can. Sleep is when a great deal of the building work happens.',
    'From the middle of pregnancy, sleep on your side — the left is the usual advice — with a pillow between your knees and one supporting the bump.',
    'A regular bedtime, a light early dinner, no screen in the last half hour, and emptying your bladder just before lying down solves most of it.',
    'Loud snoring, gasping, or daytime sleepiness that is out of proportion should be mentioned — sleep apnoea in pregnancy is treatable and worth finding.'] },

  { id: 'ideal-day', category: 'Daily routine', title: 'An ideal day: food, water and sleep together', read: '3 min', body: [
    'Water: aim for the target your app shows — usually eight to twelve glasses, spread through the day rather than all at once. More in summer, less only if your doctor has restricted fluids.',
    'Food: three modest meals and two small snacks. A protein at every meal, a fruit between, curd once a day, and greens most days.',
    'Tablets: iron with something sour, calcium at a different time, everything else as prescribed.',
    'Movement: 30 minutes of walking, split if easier, and ten minutes after each main meal if your sugar is being watched.',
    'Rest: feet up for ten minutes twice in the day, and seven to nine hours at night on your side.',
    'Log: one minute in the app, at the same time daily. That is what lets your hospital see a change before it becomes a problem.'] },

  { id: 'water-why', category: 'Food', title: 'Why water matters more now', read: '2 min', body: [
    'Your blood volume rises by almost half in pregnancy, and the amniotic fluid around your baby is replaced constantly. Both need water.',
    'Being short of fluid causes headaches, constipation, urinary infections, dizziness and, in later pregnancy, tightening that feels like early labour.',
    'Sip through the day. Dark urine is the simplest sign you are behind; pale is what you want.',
    'If your doctor has restricted your fluids for a heart or kidney reason or for pre-eclampsia, follow their number and ignore the general advice.'] },

  { id: 'work-travel-safety', category: 'Travel and work', title: 'Two-wheelers, autos and Indian roads', read: '2 min', body: [
    'Riding pillion on bad roads is the commonest avoidable risk in an Indian pregnancy. Jolting does not cause miscarriage, but a fall or a collision can cause serious harm.',
    'Prefer a car or an auto with a seat you can hold on to. In a car, always wear the belt, low across the hips and never across the bump.',
    'Avoid long journeys on rough roads in the last weeks, and any travel far from a hospital if you have been told you are high risk.'] }

]);
