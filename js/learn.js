// Learn library: evidence-based training topics. Summaries and key points are written for this app
// in our own words; links point to the original publishers. General education only, not medical advice.
// No affiliation with or endorsement by any linked author, organisation or channel is implied.
export const LEARN=[
  {cat:"Training principles",topics:[
    {id:"overload",title:"Progressive overload",
     summary:"Muscles adapt to the work you give them, so the challenge has to rise slowly over time. Adding weight is one way, but adding reps at the same weight works too. Double progression uses both: build reps to the top of a range, then raise the load and climb again.",
     points:["Add reps first, then weight, then repeat","Small steady jumps beat big irregular ones","Rep and load progression worked similarly in one trial"],
     links:[
      {t:"Load vs repetition progression trial — PeerJ",u:"https://pmc.ncbi.nlm.nih.gov/articles/PMC9528903/",k:"study"},
      {t:"Progression models in resistance training — ACSM",u:"https://pubmed.ncbi.nlm.nih.gov/19204579/",k:"guideline"},
      {t:"Evidence-based training explainers — Jeff Nippard (YouTube)",u:"https://www.youtube.com/@JeffNippard",k:"video"}]},
    {id:"reps",title:"Rep ranges: strength vs size",
     summary:"Muscle grows across a wide spread of loads, from heavy triples to light sets of twenty or more, as long as the sets are hard. Maximal strength responds best to heavier loads, partly because lifting heavy is a skill you have to practise. Many people use a heavier range for main lifts and moderate ranges for accessories.",
     points:["Heavier loads favour maximal strength","Size gains are similar across loads when effort is high","6–15 reps is a practical middle ground"],
     links:[
      {t:"Low- vs high-load training meta-analysis — J Strength Cond Res",u:"https://pubmed.ncbi.nlm.nih.gov/28834797/",k:"study"},
      {t:"Re-examining the repetition continuum — Sports",u:"https://pubmed.ncbi.nlm.nih.gov/33671664/",k:"study"},
      {t:"Resistance training prescription position stand (2026) — ACSM",u:"https://pmc.ncbi.nlm.nih.gov/articles/PMC12965823/",k:"guideline"}]},
    {id:"volume",title:"Training volume",
     summary:"Volume is usually counted as hard sets per muscle per week. More sets tend to bring more growth, but each extra set adds a little less, and strength levels off sooner than size. Around ten or more weekly sets per muscle is a common evidence-based target, provided you can recover from it.",
     points:["Count hard sets per muscle, per week","Roughly 10+ weekly sets per muscle is a common target","Returns shrink as volume climbs","Raise volume gradually, not all at once"],
     links:[
      {t:"Weekly volume and muscle growth meta-analysis — J Sports Sci",u:"https://pubmed.ncbi.nlm.nih.gov/27433992/",k:"study"},
      {t:"Volume and frequency dose-response (2026) — Sports Medicine",u:"https://pubmed.ncbi.nlm.nih.gov/41343037/",k:"study"},
      {t:"Hypertrophy and volume explainers — Renaissance Periodization (YouTube)",u:"https://www.youtube.com/@RenaissancePeriodization",k:"video"}]},
    {id:"rest",title:"Rest between sets",
     summary:"Very short rests can leave you weaker on the next set, cutting into the useful work you get done. Pooled data now suggests rest length matters less for growth than once thought, though very short breaks may be slightly worse. A practical rule is to rest until you can repeat a quality set.",
     points:["Big compound lifts: about 2–3 minutes or more","Small isolation moves: 1–2 minutes often suffices","Rest long enough to keep rep quality high"],
     links:[
      {t:"Longer rest periods trial — J Strength Cond Res",u:"https://pubmed.ncbi.nlm.nih.gov/26605807/",k:"study"},
      {t:"Rest interval and hypertrophy meta-analysis — Frontiers",u:"https://pmc.ncbi.nlm.nih.gov/articles/PMC11349676/",k:"study"}]},
    {id:"frequency",title:"Training frequency",
     summary:"For muscle growth, how often you train a muscle matters less than the total hard sets you do each week. Spreading those sets over two or more sessions can make them easier to perform well. Strength on a specific lift seems to benefit a little more from practising it often.",
     points:["Training each muscle twice weekly is a sound default","Weekly sets drive growth more than frequency","Frequent practice helps strength on a given lift"],
     links:[
      {t:"Training frequency and hypertrophy meta-analysis (2016) — Sports Medicine",u:"https://pubmed.ncbi.nlm.nih.gov/27102172/",k:"study"},
      {t:"How many times per week to train a muscle — J Sports Sci",u:"https://pubmed.ncbi.nlm.nih.gov/30558493/",k:"study"},
      {t:"Volume and frequency dose-response (2026) — Sports Medicine",u:"https://pubmed.ncbi.nlm.nih.gov/41343037/",k:"study"}]},
    {id:"rir",title:"Effort & reps in reserve",
     summary:"Reps in reserve (RIR) is your estimate of how many more clean reps you could have managed. For size, sets finished close to failure appear to work better than easy ones, while strength gains look similar across a wide range of effort. Reaching absolute failure on every set isn't required and piles on fatigue.",
     points:["Finish most working sets with about 0–3 reps left","Save true failure for last sets or isolation work","Strength doesn't require grinding to failure","Your RIR guesses improve with practice"],
     links:[
      {t:"Using the RIR-based effort scale — Strength Cond J",u:"https://pmc.ncbi.nlm.nih.gov/articles/PMC4961270/",k:"article"},
      {t:"Proximity to failure and hypertrophy meta-analysis — Sports Medicine",u:"https://pmc.ncbi.nlm.nih.gov/articles/PMC9935748/",k:"study"},
      {t:"Proximity to failure dose-response — Sports Medicine",u:"https://pubmed.ncbi.nlm.nih.gov/38970765/",k:"study"}]},
    {id:"warmup",title:"Warming up",
     summary:"A warm-up raises body temperature and rehearses the movement you're about to load. Reviews find warm-ups help performance far more often than they hurt it. For lifting, a few minutes of easy movement followed by lighter ramp-up sets of your first exercise is simple and effective.",
     points:["5–10 minutes of easy movement first","Then 2–4 lighter ramp-up sets of your first lift","Short stretches are fine; long holds may sap power"],
     links:[
      {t:"Warm-up and performance meta-analysis — J Strength Cond Res",u:"https://pubmed.ncbi.nlm.nih.gov/19996770/",k:"study"},
      {t:"Upper-body warm-up review — Br J Sports Med",u:"https://pubmed.ncbi.nlm.nih.gov/25694615/",k:"study"},
      {t:"How to warm up before exercising — NHS",u:"https://www.nhs.uk/live-well/exercise/how-to-warm-up-before-exercising/",k:"guideline"}]},
    {id:"deload",title:"Deloads",
     summary:"A deload is a planned easier week where you cut sets or load so accumulated fatigue can fade. Many lifters and coaches schedule one every several weeks, though research on ideal timing is thin. In one trial a full week off mid-programme didn't affect muscle growth but slightly slowed strength gains, which is one reason many prefer a lighter week to complete rest.",
     points:["Cut sets or load for a week; keep moving","Useful when progress stalls or joints feel worn","Evidence on ideal timing is still limited"],
     links:[
      {t:"One-week deload trial — PeerJ",u:"https://pmc.ncbi.nlm.nih.gov/articles/PMC10809978/",k:"study"},
      {t:"Deloading practices survey — Sports Medicine Open",u:"https://pmc.ncbi.nlm.nih.gov/articles/PMC10948666/",k:"study"}]},
  ]},
  {cat:"Workout types",topics:[
    {id:"strength",title:"Strength training basics",
     summary:"Resistance training improves strength, muscle size, power and everyday physical function compared with doing none. A large 2026 ACSM overview found most programme details matter less than training consistently and progressively. Build sessions around a few multi-joint patterns (squat, hinge, push, pull, carry) and learn the movement before chasing weight.",
     points:["Train the major muscle groups at least twice weekly","Learn the movement before loading it heavily","Full range of motion is a sensible default","Consistency beats the perfect programme"],
     links:[
      {t:"Resistance training prescription position stand (2026) — ACSM",u:"https://pmc.ncbi.nlm.nih.gov/articles/PMC12965823/",k:"guideline"},
      {t:"Strength exercises — NHS",u:"https://www.nhs.uk/live-well/exercise/strength-exercises/",k:"guideline"},
      {t:"Technique and joint-health videos — Squat University (YouTube)",u:"https://www.youtube.com/@SquatUniversity",k:"video"}]},
    {id:"kettlebell",title:"Kettlebell training",
     summary:"Kettlebells blend strength and conditioning, mixing fast ballistic moves like swings with slower grinds like presses and goblet squats. The swing is a hip hinge: the power comes from driving the hips, not lifting with the arms. A small study found six weeks of swing training improved both maximal and explosive strength.",
     points:["Master the hinge and deadlift before swinging","Hips drive the bell; arms just guide it","Finish tall with glutes and abs braced","Start lighter than you think you need"],
     links:[
      {t:"Kettlebell swing training and strength — J Strength Cond Res",u:"https://pubmed.ncbi.nlm.nih.gov/22580981/",k:"study"},
      {t:"Kettlebell training scoping review — BMC Sports Sci Med Rehabil",u:"https://pmc.ncbi.nlm.nih.gov/articles/PMC6719359/",k:"study"},
      {t:"Swing technique cues — StrongFirst",u:"https://www.strongfirst.com/two-swing-cues-to-unlock-power/",k:"article"}]},
    {id:"bands",title:"Resistance bands",
     summary:"Elastic bands get harder as they stretch, so tension peaks near the end of each rep. A meta-analysis found strength gains from band training similar to those from machines and free weights. Bands are cheap and portable, which makes them handy for home sessions, warm-ups and travel.",
     points:["Progress with thicker bands or less slack","Control the return; don't let it snap back","Check bands for nicks or tears before use"],
     links:[
      {t:"Elastic vs conventional resistance meta-analysis — SAGE Open Med",u:"https://pmc.ncbi.nlm.nih.gov/articles/PMC6383082/",k:"study"},
      {t:"Resistance training prescription position stand (2026) — ACSM",u:"https://pmc.ncbi.nlm.nih.gov/articles/PMC12965823/",k:"guideline"}]},
    {id:"bodyweight",title:"Bodyweight & calisthenics",
     summary:"Your own body can supply plenty of resistance as long as you keep making the exercise harder. Progress by moving to tougher variations, such as incline to floor to feet-elevated push-ups, or by adding reps, slowing the tempo or pausing. In trials, progressive push-up training built strength comparable to bench pressing.",
     points:["Progress the variation, not just the reps","Slow tempos and pauses add difficulty","Balance pushing with pull-ups and rows"],
     links:[
      {t:"Progressive push-up training trial — J Strength Cond Res",u:"https://pubmed.ncbi.nlm.nih.gov/29466268/",k:"study"},
      {t:"Push-up vs bench press strength trial — J Strength Cond Res",u:"https://pubmed.ncbi.nlm.nih.gov/24983847/",k:"study"},
      {t:"Strength exercises — NHS",u:"https://www.nhs.uk/live-well/exercise/strength-exercises/",k:"guideline"}]},
    {id:"cardio",title:"Cardio & conditioning",
     summary:"Health guidelines call for at least 150 minutes of moderate or 75 minutes of vigorous aerobic activity a week, or a mix of the two. Moderate effort still lets you hold a conversation; vigorous leaves you only a few words at a time. Cardio and lifting complement each other, and spreading activity through the week works better than cramming it.",
     points:["150 min moderate or 75 min vigorous weekly","Some is better than none; more adds benefit","Pair cardio with two or more strength days"],
     links:[
      {t:"Adult activity overview — CDC",u:"https://www.cdc.gov/physical-activity-basics/guidelines/adults.html",k:"guideline"},
      {t:"Physical Activity Guidelines for Americans — ODPHP",u:"https://odphp.health.gov/our-work/nutrition-physical-activity/physical-activity-guidelines/current-guidelines",k:"guideline"},
      {t:"Physical activity guidelines — ACSM",u:"https://acsm.org/education-resources/trending-topics-resources/physical-activity-guidelines/",k:"guideline"}]},
  ]},
  {cat:"Joints & resilience",topics:[
    {id:"kot",title:"Knees over toes & knee resilience",
     summary:"The knees-over-toes approach, popularised by Ben Patrick (ATG), trains joints through deep ranges using gradual, regressed loading: tibialis raises, backward walking or sled pulls, split squats, and Nordic and reverse Nordic variations. Independent research backs the broad premise that knees travelling forward is normal; blocking it in a squat shifts stress to the hips and lower back. Many specific exercises in the system have little direct trial evidence yet.",
     points:["Start with easy regressions and build range slowly","Knees past toes is a normal squat pattern","Reviews don't show deep squats harm healthy knees","Many individual exercises lack direct trials"],
     links:[
      {t:"Official channel — The Kneesovertoesguy (YouTube)",u:"https://www.youtube.com/@TheKneesovertoesguy",k:"video"},
      {t:"Official programme site — ATG",u:"https://www.atgonlinecoaching.com/",k:"article"},
      {t:"Knee position and squat torques — J Strength Cond Res",u:"https://pubmed.ncbi.nlm.nih.gov/14636100/",k:"study"},
      {t:"Squat depth and knee/spine load review — Sports Medicine",u:"https://pubmed.ncbi.nlm.nih.gov/23821469/",k:"study"}]},
    {id:"nordic",title:"Nordic curls & hamstring health",
     summary:"The Nordic hamstring curl is an eccentric move: kneel with heels anchored and lower your torso slowly while the hamstrings brake. Programmes that include it have been linked to roughly half as many hamstring injuries in athletes, though a later reappraisal argued the evidence is less certain than that headline. Reverse Nordics, a controlled backward lean from kneeling, give the quads similar lengthened work.",
     points:["Lower slowly; catch yourself with your hands","Start with partial range or band assistance","Expect soreness early; build up gradually"],
     links:[
      {t:"Nordic hamstring exercise trial in amateur soccer — Am J Sports Med",u:"https://pubmed.ncbi.nlm.nih.gov/25794868/",k:"study"},
      {t:"Nordic hamstring exercise meta-analysis — Br J Sports Med",u:"https://pubmed.ncbi.nlm.nih.gov/30808663/",k:"study"},
      {t:"Reappraisal of the Nordic evidence — J Clin Epidemiol",u:"https://pubmed.ncbi.nlm.nih.gov/34520846/",k:"study"}]},
    {id:"mobility",title:"Mobility & flexibility",
     summary:"Both stretching and full-range strength training improve range of motion, and a meta-analysis found them about equal. Short stretches before training have little effect on performance, especially when followed by dynamic movement, while long static holds just before lifting may slightly reduce power. Choose the method you'll stick with and train the ranges you actually use.",
     points:["Lifting through full range also builds mobility","Dynamic moves before training, longer holds after","Gains come from regular practice, not one session"],
     links:[
      {t:"Strength training vs stretching for range of motion — Healthcare",u:"https://pmc.ncbi.nlm.nih.gov/articles/PMC8067745/",k:"study"},
      {t:"Acute effects of stretching review — Appl Physiol Nutr Metab",u:"https://pubmed.ncbi.nlm.nih.gov/26642915/",k:"study"},
      {t:"Flexibility exercises — NHS",u:"https://www.nhs.uk/live-well/exercise/flexibility-exercises/",k:"guideline"}]},
  ]},
  {cat:"Recovery & lifestyle",topics:[
    {id:"sleep",title:"Sleep & recovery",
     summary:"Sleep experts recommend that adults get at least seven hours a night on a regular basis, and hard-training people may need more. Short or broken sleep tends to make training feel harder and recovery slower. Consistent bed and wake times, a dark cool room, and less caffeine late in the day are easy places to start.",
     points:["Aim for 7+ hours on a steady schedule","Needs vary; athletes may need more","Limit late caffeine and screens before bed"],
     links:[
      {t:"Recommended sleep for adults consensus — AASM & SRS",u:"https://pmc.ncbi.nlm.nih.gov/articles/PMC4434546/",k:"guideline"},
      {t:"About sleep — CDC",u:"https://www.cdc.gov/sleep/about/index.html",k:"guideline"},
      {t:"Sleep and the athlete expert consensus — Br J Sports Med",u:"https://pubmed.ncbi.nlm.nih.gov/33144349/",k:"study"},
      {t:"Sleep and tiredness — NHS",u:"https://www.nhs.uk/live-well/sleep-and-tiredness/",k:"guideline"}]},
    {id:"protein",title:"Protein & nutrition basics",
     summary:"Protein provides the raw material for repairing and building muscle. Pooled trial data found extra protein boosted gains from lifting, with little further benefit beyond about 1.6 g per kg of body weight per day. Think food first: spread protein across meals and build the rest of your diet around a balanced, varied plate.",
     points:["About 1.6 g/kg/day covers most lifters","Spread protein across 3–4 meals","Supplements are convenient, not essential"],
     links:[
      {t:"Protein supplementation meta-analysis — Br J Sports Med",u:"https://pubmed.ncbi.nlm.nih.gov/28698222/",k:"study"},
      {t:"Protein and exercise position stand — ISSN",u:"https://pmc.ncbi.nlm.nih.gov/articles/PMC5477153/",k:"guideline"},
      {t:"The Eatwell Guide — NHS",u:"https://www.nhs.uk/live-well/eat-well/food-guidelines-and-food-labels/the-eatwell-guide/",k:"guideline"}]},
    {id:"guidelines",title:"Physical activity guidelines",
     summary:"Major health bodies broadly agree that adults should get 150 to 300 minutes of moderate activity (or 75 to 150 vigorous) each week, plus muscle-strengthening on two or more days. They also advise breaking up long stretches of sitting. Any activity beats none, and benefits keep building as you do more.",
     points:["150–300 min of moderate activity weekly","Strength work on at least two days","Break up long periods of sitting"],
     links:[
      {t:"Guidelines on physical activity and sedentary behaviour — WHO",u:"https://www.who.int/publications/i/item/9789240015128",k:"guideline"},
      {t:"Physical activity fact sheet — WHO",u:"https://www.who.int/news-room/fact-sheets/detail/physical-activity",k:"guideline"},
      {t:"Physical activity guidelines for adults 19 to 64 — NHS",u:"https://www.nhs.uk/live-well/exercise/physical-activity-guidelines-for-adults-aged-19-to-64/",k:"guideline"}]},
  ]},
];

export function learnTopic(id){
  for(const c of LEARN){const t=c.topics.find(x=>x.id===id);if(t)return t;}
  return null;
}
