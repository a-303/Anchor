// Default content. Everything personal you type stays on the phone; this file only holds the starting set.
window.ANCHORS_DATA = {
  // Habits, in the order of the day. block 0 = always on, block 1 = from the start date,
  // later blocks switch on at their dates (editable in More > Blocks).
  habits: [
    { id: "wake",    block: 1, slot: "morning", at: "{wake}",  name: "Up on time", full: "Alarm across the room, feet on the floor at {wake}, however short the night was", min: "Up within 30 minutes of {wake}" },
    { id: "care",    block: 0, slot: "morning", at: "",        name: "Morning care", full: "Teeth, quick lukewarm shower, body lotion on damp skin, face moisturiser with SPF 30+, deodorant", min: "Teeth and moisturiser", first: "First move: turn the water on." },
    { id: "body",    block: 2, slot: "morning", at: "",        name: "Morning body", full: "5 min outside, then today's routine from Body (5 to 15 min)", min: "The 5-minute wake-up routine", link: "body" },
    { id: "hard",    block: 5, slot: "morning", at: "",        name: "Hard thing first", full: "First 25-min block on the most avoided task, with the Stuck? steps", min: "3 breaths, then write the one objective", stuck: true },
    { id: "fuel",    block: 1, slot: "day",     at: "",        name: "Eat like training", full: "Three real meals plus one snack, protein at each", min: "The extra snack" },
    { id: "python",  block: 3, slot: "day",     at: "",        name: "Python, 25 min", full: "25 min on the learning path, 5 days a week", min: "Open the file, write one line", stuck: true },
    { id: "drawing", block: 4, slot: "day",     at: "",        name: "Drawing, 10 min", full: "Five quick planes-of-the-face copies", min: "One 2-minute sketch" },
    { id: "skin",    block: 0, slot: "evening", at: "",        name: "Shower and skin", full: "Lukewarm shower (shampoo Mon, Wed, Fri), body lotion on damp skin, face cleanser and cream, scalp treatment", min: "Quick rinse and scalp treatment", first: "First move: turn the water on." },
    { id: "phone",   block: 1, slot: "night",   at: "{phone}", name: "Phone out", full: "Downtime on, phone on the charger outside the room at {phone}", min: "Phone out of the bedroom" },
    { id: "journal", block: 1, slot: "night",   at: "",        name: "Journal", full: "The template, 2 to 5 minutes", min: "One line. That is a full pass.", link: "journal" },
    { id: "bed",     block: 1, slot: "night",   at: "{bed}",   name: "In bed on time", full: "Teeth and floss, then in bed with a book at {bed}", min: "Teeth, in bed within 30 minutes of {bed}" },
  ],
  blocks: {
    1: { start: "2026-11-16", name: "Sleep anchor, food and journal" },
    2: { start: "2026-11-30", name: "Morning body" },
    3: { start: "2026-12-14", name: "Python, 25 min" },
    4: { start: "2026-12-28", name: "Drawing, 10 min" },
    5: { start: "2027-01-11", name: "Hard thing first" },
  },
  extras: [
    { id: "showedUp", name: "Showed up", desc: "First move on something I was avoiding" },
    { id: "courage",  name: "Courage rep", desc: "One small social stretch" },
  ],
  // Dates that get a card on Today.
  special: [
    { date: "2026-11-19", every: "year", title: "Alive Day", text: "One deliberate act today: a swim, dinner with family, a short thank-you note." },
    { date: "2026-12-27", title: "Recheck day", text: "Read the parking lot. Look at six weeks of the Week tab. Decide what stays. Today, and only today, a new plan is allowed." },
  ],
  recheck: "2026-12-27",
  chapterEnd: "2027-02-28",
  // Free time: "Got free time?" on Today hands out ONE of these for the time you have.
  // mins is the bucket (10, 30 or 60). timer:false hides the timer button. Editable in More.
  menu: [
    { id: "read-10",   mins: 10, kind: "read",   name: "Read 10 pages", how: "{book}. Paper, sitting up, phone in another room." },
    { id: "sketch-10", mins: 10, kind: "draw",   name: "Three 2-minute sketches", how: "Whatever is in front of you. Fast and bad is the point." },
    { id: "chess-10",  mins: 10, kind: "play",   name: "Three chess puzzles", how: "Three, then close it." },
    { id: "msg-10",    mins: 10, kind: "people", name: "Write to someone you care about", how: "One honest line. No need for a reason.", timer: false },
    { id: "tidy-10",   mins: 10, kind: "home",   name: "Clear one surface", how: "Desk, bag or bedside. One, completely." },
    { id: "air-10",    mins: 10, kind: "rest",   name: "Ten minutes outside, no phone", how: "Walk slowly. Look far away. That is the whole task." },
    { id: "py-10",     mins: 10, kind: "code",   name: "One small Python snippet from memory", how: "Retype something you used this week without looking, then run it." },
    { id: "sql-10",    mins: 10, kind: "code",   name: "One SQL query", how: "One question about a table you touched this week. Write it, run it." },
    { id: "math-10",   mins: 10, kind: "maths",  name: "One worked example, pen and paper", how: "Copy it once, then redo it with the page closed." },
    { id: "prep-10",   mins: 10, kind: "home",   name: "Lay out tomorrow", how: "Clothes, bag, breakfast. Tomorrow starts easier.", timer: false },
    { id: "body-10",   mins: 10, kind: "body",   name: "A short routine from Body", how: "Pick 5 or 10 minutes there.", link: "body" },
    { id: "read-30",   mins: 30, kind: "read",   name: "Read for 25 minutes", how: "{book}. Start the timer and stop when it rings." },
    { id: "py-30",     mins: 30, kind: "code",   name: "Python, one 25-minute block", how: "The next step of the learning path. One tiny objective first." },
    { id: "apps-30",   mins: 30, kind: "future", name: "Applications: one paragraph or one email", how: "Write it badly, send or save it. Finished beats perfect." },
    { id: "math-30",   mins: 30, kind: "maths",  name: "Maths: one exercise set", how: "Three problems. Check the answers only at the end." },
    { id: "draw-30",   mins: 30, kind: "draw",   name: "One slow drawing from a reference", how: "One object, 25 minutes, no erasing for the first 10." },
    { id: "walk-30",   mins: 30, kind: "rest",   name: "Walk for 30 minutes", how: "No headphones for the first 10.", timer: false },
    { id: "hist-30",   mins: 30, kind: "read",   name: "One chapter of history or myth", how: "A book or one long article. Not a feed." },
    { id: "cook-30",   mins: 30, kind: "food",   name: "Cook one real meal", how: "Protein first, then whatever goes with it.", timer: false },
    { id: "mob-30",    mins: 30, kind: "body",   name: "Mobility flow", how: "The 15-minute one in Body, done slowly, twice.", link: "body" },
    { id: "rest-30",   mins: 30, kind: "rest",   name: "Rest on purpose", how: "Lie down for 20 minutes, phone outside the room. Rest counts.", timer: false },
    { id: "swim-60",   mins: 60, kind: "body",   name: "Go for a swim", how: "Easy pace. Log the lengths in Body afterwards.", link: "body" },
    { id: "deep-60",   mins: 60, kind: "future", name: "Two 25-minute blocks on the big thing", how: "The model or the applications. Five minutes off in between." },
    { id: "fam-60",    mins: 60, kind: "people", name: "A long walk with someone from the family", how: "Ask one real question and listen to the answer.", timer: false },
    { id: "read-60",   mins: 60, kind: "read",   name: "Read for an hour, somewhere that isn't your room", how: "{book}." },
    { id: "gems-60",   mins: 60, kind: "gems",   name: "Study one stone", how: "Look closely, then draw what you see and write three lines about it." },
    { id: "call-60",   mins: 60, kind: "people", name: "Call someone you haven't spoken to in a while", how: "Ten minutes is enough. This is a courage rep.", timer: false },
    { id: "film-60",   mins: 60, kind: "rest",   name: "A film from your list", how: "A whole one, phone in another room. Chosen rest is not wasted time.", timer: false },
  ],
  routines: [
    { id: "wake-5", name: "5-minute wake-up", minutes: 5, moves: [
      "Cat-cow x8, slow",
      "Glute bridge hold 30 s",
      "Bird dog 3 x 10 s holds per side",
      "Single-leg balance next to a wall, 2 x 15 s, weaker side first",
      "3 deep nasal breaths, 6 s in, 6 s out"
    ], note: "For days with no time. Counts as showing up." },
    { id: "plan-daily-10", name: "Daily 10-minute block", minutes: 10, moves: [
      "0-2 min, feet: ball roll 30 s and big-toe stretch 30 s per foot, then 10 toe splays",
      "2-4 min, kneeling: toes pointed 1 min, then toes tucked 1 min (build up slowly)",
      "4-6 min, hips: seated hip circles x3 per side, then 6 90/90 switches",
      "6-9 min, McGill Big 3: curl-up, side plank, bird dog, as 5, 3, 1 reps of 10 s holds",
      "9-10 min, breathing: 3 physiological sighs, then nasal 6 s in, 6 s out"
    ], note: "From your plan. Show it to your physio." },
    { id: "feet-balance-10", name: "Feet and balance", minutes: 10, moves: [
      "Short foot: lift the arch without curling the toes, 5 x 10 s per foot",
      "Toe yoga: big toe up and others down, then swap, 10 each",
      "Tibialis raises with your back on a wall x15",
      "Single-leg balance: stronger side 30 s, weaker side 3 x 15-20 s by a wall",
      "Balance with head turns, looking left and right, 20 s per side when steady"
    ], note: "Builds toward surfing. Toe spacers afterwards if you have them." },
    { id: "right-side-15", name: "Weak side catch-up", minutes: 15, moves: [
      "Warm-up: 10 glute bridges on two legs",
      "Single-leg glute bridge: weaker side 3 sets, stronger side 2, stop when form breaks",
      "Side plank: weaker side 3 x 20-30 s, stronger side 2 x 30 s, clean form only",
      "Clamshells: weaker side 2 x 15, stronger side 1 x 15",
      "Calf raises on two legs, weight shifted to the weaker side, 2 x 12, slow down",
      "Weaker-leg balance by a wall 3 x 15-20 s, eyes open"
    ], note: "Weak side first, with the extra set." },
    { id: "back-chain-15", name: "Back chain", minutes: 15, moves: [
      "Cat-cow x8",
      "Superman hold 3 x 20-30 s (back-extension hold if you have the machine)",
      "Reverse plank 3 x 20-30 s, straight line, no low-back arch",
      "Bird dog 2 x 5 per side, 10 s holds",
      "Glute bridge hold 2 x 30 s",
      "Prone Y and T raises 2 x 8 each, light"
    ], note: "Every second day at most. Stop if the elbow or wrist complains on reverse plank." },
    { id: "push-core-15", name: "Push-ups and core", minutes: 15, moves: [
      "Push-ups 4 sets, stop 2 reps before form breaks",
      "Front plank 3 x 40 s",
      "Dead bug 2 x 6 per side, slow",
      "Side plank 2 x 20 s per side, weaker side first",
      "Band anti-rotation hold 2 x 20 s per side (skip if no band)"
    ], note: "Skip on days your trainer does chest or shoulders." },
    { id: "mobility-15", name: "Mobility flow", minutes: 15, moves: [
      "Cat-cow x10",
      "90/90 hip switches x8",
      "Half-kneeling hip flexor stretch 45 s per side, glute squeezed",
      "Thoracic open books x6 per side",
      "Knee-to-wall ankle rocks x10 per side",
      "Deep squat hold with support 2 x 30 s, only as deep as is comfortable",
      "Child's pose 1 min with slow breathing"
    ], note: "Good the morning after a hard trainer session." },
    { id: "pool-25", name: "Pool run", minutes: 25, pool: true, moves: [
      "5 min easy swim or water walking",
      "15 min deep-water running with the belt: upright, knees driving, toes pulled up on the swing",
      "After 2 to 3 weeks: 6 x 2 min harder, 1 min easy instead",
      "5 min easy, then hip flexor and calf stretches"
    ], note: "Cardio will feel ready before the legs and spine are. Keep effort moderate the first weeks." },
    { id: "swim-easy", name: "Easy swim", minutes: 25, pool: true, moves: [
      "5 min easy, any stroke",
      "Main set: swim as far as you can without stopping at an easy pace, then rest 1 min",
      "Repeat until 20 min in total",
      "Count the lengths, and the longest stretch without stopping, then log them below"
    ], note: "Goal before you leave: 1 km without stopping. Add about 2 lengths a week to the longest stretch." },
  ],
};
