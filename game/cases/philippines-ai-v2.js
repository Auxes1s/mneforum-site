(function (root) {
  'use strict';

  const packId = 'philippines-ai-v2';
  const stages = ['check', 'connect', 'commit', 'track'];
  const themes = ['shared-mandate', 'technological-innovations', 'local-partners', 'collaborative-action'];

  const caseSpecs = [
    {
      id: 'cash-aid-risk-screening', domain: 'Social protection', title: 'Cash aid risk screening', subject: 'cash aid screening', gap: 'remote households are excluded more often', cause: 'blank addresses trigger exclusions', response: 'Assisted cash-aid review', outcomes: 'restored access, false exclusions, or repeat errors',
      lines: {
        check: 'Staff use an AI risk list for cash aid, but its address errors and exclusion rate are unknown.',
        connect: 'Staff confirmed remote households are excluded more often, but do not know whether addresses or access cause it.',
        commit: 'Staff know address gaps cause exclusions, but no assisted review process or accountable owner has been assigned.',
        track: 'Assisted review has started, but staff have not measured restored access, false exclusions, or repeat errors.'
      }
    },
    {
      id: 'grievance-chatbot-routing', domain: 'Social protection', title: 'Grievance chatbot routing', subject: 'grievance routing', gap: 'seniors receive more wrong chatbot routes', cause: 'language gaps cause routing errors', response: 'Human grievance review', outcomes: 'resolution, repeat complaints, or access gaps',
      lines: {
        check: 'The grievance chatbot reports high success, but staff excluded reopened cases and Filipino errors from the count.',
        connect: 'Staff confirmed seniors and low-connectivity users are routed incorrectly, but do not know which chatbot step causes it.',
        commit: 'Staff know language and access problems cause failures, but no human fallback process or owner exists.',
        track: 'A human fallback is operating, but staff have not measured resolution, repeat complaints, or access gaps.'
      }
    },
    {
      id: 'dengue-forecasting', domain: 'Public health', title: 'Dengue hotspot forecast', subject: 'dengue forecasting', gap: 'dengue hotspots differ across barangays', cause: 'local conditions drive dengue hotspots', response: 'Targeted dengue prevention', outcomes: 'new cases, missed areas, or community burden',
      lines: {
        check: 'Barangay health teams use an AI dengue map, but incomplete reports make its recent accuracy unknown.',
        connect: 'Health teams confirmed hotspots, but have not explained how housing, water storage, and care-seeking create them.',
        commit: 'Teams understand the local dengue drivers, but no targeted prevention plan or responsible office has been assigned.',
        track: 'Targeted prevention has started, but teams have not measured new cases, missed areas, or community burden.'
      }
    },
    {
      id: 'rhu-teleconsult-triage', domain: 'Primary health', title: 'RHU teleconsult triage', subject: 'teleconsult triage', gap: 'island barangays complete fewer referrals', cause: 'poor connectivity blocks referrals', response: 'The backup referral pathway', outcomes: 'completed referrals, delays, or missed emergencies',
      lines: {
        check: 'RHU staff use AI to flag urgent teleconsults, but referral records and false alarms were never checked.',
        connect: 'Island barangays complete fewer referrals; staff still do not know whether signal, transport, or triage causes the gap.',
        commit: 'Staff know connectivity blocks referrals, but no backup pathway, safety rule, or accountable owner exists.',
        track: 'A backup pathway is active, but staff have not measured completed referrals, delays, or missed emergencies.'
      }
    },
    {
      id: 'vaccine-cold-chain-alerts', domain: 'Public health', title: 'Vaccine cold-chain alerts', subject: 'cold-chain alerts', gap: 'breaches cluster on certain delivery routes', cause: 'route delays cause temperature breaches', response: 'The revised cold-chain protocol', outcomes: 'spoilage, missed routes, or false alerts',
      lines: {
        check: 'Health staff use AI temperature alerts, but sensor calibration and outage records are missing.',
        connect: 'Staff confirmed breaches on certain delivery routes, but do not know which transport delays cause them.',
        commit: 'Staff know route delays cause breaches, but no revised cold-chain protocol or responsible officer has been assigned.',
        track: 'The revised protocol is running, but staff have not measured spoilage, missed routes, or false alerts.'
      }
    },
    {
      id: 'maternal-referral-risk', domain: 'Maternal health', title: 'Maternal referral risk', subject: 'maternal referral risk', gap: 'rural patients complete fewer maternal referrals', cause: 'transport barriers block referrals', response: 'Maternal transport support', outcomes: 'timely referrals, outcomes, or unequal access',
      lines: {
        check: 'RHU staff use an AI maternal-risk score, but incomplete prenatal records leave its rural accuracy unknown.',
        connect: 'Staff confirmed rural referral gaps, but do not know how transport, cost, and family decisions create them.',
        commit: 'Staff understand the referral barriers, but no transport support plan or accountable owner exists.',
        track: 'Transport support has started, but staff have not measured timely referrals, maternal outcomes, or unequal access.'
      }
    },
    {
      id: 'reading-risk-model', domain: 'Basic education', title: 'Reading risk model', subject: 'reading risk model', gap: 'reading gains differ by language and attendance', cause: 'language and attendance barriers limit learning', response: 'Targeted reading support', outcomes: 'reading gains, language equity, or labeling harm',
      lines: {
        check: 'Schools use AI to flag struggling readers, but home-language coverage and assessment comparability were never tested.',
        connect: 'Teachers confirmed reading gaps by language and attendance, but have not explained why they persist.',
        commit: 'Teachers understand the learning barriers, but no targeted support plan or accountable owner exists.',
        track: 'Targeted support is running, but schools have not measured reading gains, language equity, or labeling harm.'
      }
    },
    {
      id: 'als-learner-support', domain: 'Alternative education', title: 'ALS learner support', subject: 'ALS support', gap: 'working learners attend fewer ALS sessions', cause: 'work and travel barriers reduce attendance', response: 'Flexible ALS support', outcomes: 'participation, completion, or privacy complaints',
      lines: {
        check: 'ALS staff use AI attendance alerts, but delayed session logs leave the missed-learner rate unknown.',
        connect: 'Staff confirmed participation gaps, but do not know how work, caregiving, and travel prevent attendance.',
        commit: 'Staff understand attendance barriers, but no flexible support plan, privacy rule, or responsible officer exists.',
        track: 'Flexible support is active, but staff have not measured participation, completion, or privacy complaints.'
      }
    },
    {
      id: 'school-feeding-targeting', domain: 'Education and nutrition', title: 'School feeding targeting', subject: 'feeding targeting', gap: 'distant sitios have lower feeding participation', cause: 'distance limits feeding participation', response: 'Adjusted feeding delivery', outcomes: 'attendance, nutrition gains, or stigma',
      lines: {
        check: 'Schools use AI to rank feeding needs, but enrollment changes and nutrition-screening gaps were not reconciled.',
        connect: 'Staff confirmed distant sitios participate less, but do not know whether distance, schedules, or stigma cause it.',
        commit: 'Staff know distance limits participation, but no adjusted delivery plan or accountable owner exists.',
        track: 'Adjusted delivery is active, but staff have not measured attendance, nutrition gains, or stigma.'
      }
    },
    {
      id: 'classroom-repair-vision', domain: 'Education infrastructure', title: 'AI-assisted repair inspection', subject: 'repair inspection', gap: 'classroom usability differs across repaired schools', cause: 'ventilation defects limit classroom use', response: 'Classroom corrections', outcomes: 'safe use, missed defects, or learning disruption',
      lines: {
        check: 'Engineers use image analysis to confirm repairs, but photo dates, locations, and school acceptance records conflict.',
        connect: 'Inspectors confirmed incomplete repairs, but do not know why classroom usability differs across schools.',
        commit: 'Inspectors know ventilation remains inadequate, but no correction plan, responsible contractor, or deadline exists.',
        track: 'Corrections have started, but schools have not measured safe use, missed defects, or learning disruption.'
      }
    },
    {
      id: 'crop-disease-classifier', domain: 'Agriculture', title: 'Crop disease classifier', subject: 'crop disease advice', gap: 'upland farmers receive more wrong crop advice', cause: 'limited local data causes crop errors', response: 'Expert crop review', outcomes: 'crop recovery, farmer costs, or harmful advice',
      lines: {
        check: 'Extension workers use AI crop advice, but local varieties and field accuracy were never tested.',
        connect: 'Workers confirmed tenant and upland farmers receive more wrong advice, but do not know why.',
        commit: 'Workers know limited local data causes errors, but no expert review process or responsible office exists.',
        track: 'Expert review is active, but workers have not measured crop recovery, farmer costs, or harmful advice.'
      }
    },
    {
      id: 'irrigation-scheduling-ai', domain: 'Agriculture and water', title: 'AI irrigation scheduling', subject: 'irrigation scheduling', gap: 'tail-end farms receive less irrigation water', cause: 'canal position drives water shortages', response: 'The revised irrigation rotation', outcomes: 'water delivery, yields, or farmer disputes',
      lines: {
        check: 'Irrigation staff use AI schedules, but sensor maintenance and tail-end farm coverage are incomplete.',
        connect: 'Staff confirmed tail-end farms receive less water, but have not separated canal, crop, and scheduling causes.',
        commit: 'Staff know canal position drives shortages, but no fair rotation plan or responsible manager exists.',
        track: 'A revised rotation is active, but staff have not measured water delivery, yields, or farmer disputes.'
      }
    },
    {
      id: 'fish-catch-forecast', domain: 'Fisheries', title: 'Municipal catch forecast', subject: 'catch forecasting', gap: 'small-boat forecasts fail more often', cause: 'poor small-boat coverage weakens forecasts', response: 'Revised fishing advisories', outcomes: 'catch, safety, or small-boat outcomes',
      lines: {
        check: 'Municipal staff use AI catch forecasts, but changing landing coverage leaves small-boat accuracy unknown.',
        connect: 'Staff confirmed small-boat forecasts fail more often, but do not know whether weather, grounds, or gear explain why.',
        commit: 'Staff know small-boat coverage causes errors, but no safer advisory process or accountable owner exists.',
        track: 'Revised advisories are active, but staff have not measured catch, safety, or small-boat outcomes.'
      }
    },
    {
      id: 'farm-market-price-advice', domain: 'Agriculture markets', title: 'Farm price advice', subject: 'price advice', gap: 'farmers receive unequal price advice', cause: 'market access differences distort price advice', response: 'Revised farm price advice', outcomes: 'farmer prices, market access, or losses',
      lines: {
        check: 'Agriculture staff use AI price advice, but several municipal markets and transaction dates are missing.',
        connect: 'Staff confirmed farmers receive unequal prices, but have not explained the roles of transport, buyers, and bargaining.',
        commit: 'Staff understand the market barriers, but no revised advisory plan or responsible office exists.',
        track: 'Revised advice is active, but staff have not measured farmer prices, market access, or losses.'
      }
    },
    {
      id: 'flood-nowcasting', domain: 'Disaster risk reduction', title: 'Barangay flood nowcast', subject: 'flood nowcasting', gap: 'riverside sitios receive flood alerts late', cause: 'signal gaps delay flood warnings', response: 'Backup flood alerts', outcomes: 'alert reach, evacuation, or false alarms',
      lines: {
        check: 'Disaster staff use AI flood alerts, but patchy rain gauges leave recent-storm accuracy unknown.',
        connect: 'Staff confirmed riverside sitios receive alerts late, but do not know whether sensors, signal, or delivery cause it.',
        commit: 'Staff know signal gaps delay warnings, but no backup channel, threshold, or responsible officer exists.',
        track: 'Backup alerts are active, but staff have not measured reach, evacuation, or false alarms.'
      }
    },
    {
      id: 'evacuation-allocation', domain: 'Disaster response', title: 'Evacuation center allocation', subject: 'evacuation allocation', gap: 'some families avoid assigned evacuation centers', cause: 'privacy and transport concerns deter families', response: 'Revised center assignments', outcomes: 'safe use, exclusion, or crowding',
      lines: {
        check: 'Disaster staff use AI to assign evacuation centers, but capacity, accessibility, and household definitions conflict.',
        connect: 'Staff confirmed families avoid assigned centers, but have not explained their privacy, safety, or transport concerns.',
        commit: 'Staff understand these access concerns, but no revised assignment rule or accountable manager exists.',
        track: 'Revised assignments are active, but staff have not measured safe use, exclusion, or crowding.'
      }
    },
    {
      id: 'urban-heat-mapping', domain: 'Climate adaptation', title: 'Urban heat risk map', subject: 'heat risk mapping', gap: 'heat exposure differs across worker groups', cause: 'work locations drive unequal heat exposure', response: 'Community cooling measures', outcomes: 'cooling use, heat exposure, or displacement',
      lines: {
        check: 'City staff use an AI heat map, but informal settlements lack sensors and several days are missing.',
        connect: 'Staff confirmed heat hotspots, but have not explained exposure among vendors, commuters, and outdoor workers.',
        commit: 'Staff understand who faces the greatest heat exposure, but no cooling plan or responsible office exists.',
        track: 'Cooling measures are active, but staff have not measured use, heat exposure, or displacement.'
      }
    },
    {
      id: 'illegal-dumping-detection', domain: 'Environment', title: 'Illegal dumping detection', subject: 'dumping detection', gap: 'dumping clusters where collection is limited', cause: 'poor collection access drives dumping', response: 'Revised waste collection', outcomes: 'dumping, missed service, or false flags',
      lines: {
        check: 'Environment staff use image analysis to flag dumping, but duplicate images and barangay coverage were never checked.',
        connect: 'Staff confirmed dumping clusters, but do not know whether poor collection, timing, or household constraints cause them.',
        commit: 'Staff understand the service barriers, but no collection change or accountable owner has been assigned.',
        track: 'Collection changes are active, but staff have not measured dumping, missed service, or false flags.'
      }
    },
    {
      id: 'water-leak-detection', domain: 'Water services', title: 'Water leak detection', subject: 'leak detection', gap: 'upland households wait longer for repairs', cause: 'repair delays prolong water interruptions', response: 'Priority leak repairs', outcomes: 'water continuity, water loss, or household equity',
      lines: {
        check: 'Water staff use AI leak alerts, but pressure-sensor gaps leave the false-alarm rate unknown.',
        connect: 'Staff confirmed upland households face longer interruptions, but have not explained why repairs reach them later.',
        commit: 'Staff know repair delays worsen interruptions, but no priority rule or accountable manager exists.',
        track: 'Priority repairs are active, but staff have not measured continuity, water loss, or household equity.'
      }
    },
    {
      id: 'waste-route-optimization', domain: 'Solid waste', title: 'Waste collection routing', subject: 'waste routing', gap: 'some barangays have more missed pickups', cause: 'road and timing barriers disrupt collection', response: 'The new collection schedule', outcomes: 'collection, worker burden, or missed areas',
      lines: {
        check: 'Waste staff use AI routes, but missed pickups and informal collection points are absent from the data.',
        connect: 'Staff confirmed missed pickups, but do not know whether roads, timing, or household practices cause them.',
        commit: 'Staff understand route barriers, but no schedule change, labor protection, or responsible manager exists.',
        track: 'A new schedule is active, but staff have not measured collection, worker burden, or missed areas.'
      }
    },
    {
      id: 'jeepney-crowding-forecast', domain: 'Public transport', title: 'Jeepney crowding forecast', subject: 'crowding forecast', gap: 'crowding worsens at transfer points', cause: 'transfer delays cause crowding', response: 'The timetable trial', outcomes: 'waits, crowding, or driver workload',
      lines: {
        check: 'Transport staff use an AI crowding forecast, but dispatch logs are incomplete and off-peak accuracy is unknown.',
        connect: 'Staff confirmed transfer-point crowding, but have not explained how delays, schedules, and commuter limits cause it.',
        commit: 'Staff understand the transfer problem, but no timetable trial or accountable manager exists.',
        track: 'A timetable trial is active, but staff have not measured waits, crowding, or driver workload.'
      }
    },
    {
      id: 'permit-document-screening', domain: 'Digital government', title: 'Permit document screening', subject: 'permit screening', gap: 'remote applicants are rejected more often', cause: 'document and access barriers drive rejections', response: 'Assisted permit filing', outcomes: 'approvals, delays, or appeal outcomes',
      lines: {
        check: 'Permit staff use AI to screen documents, but scan quality and Filipino-form accuracy were never tested.',
        connect: 'Remote applicants are rejected more often; staff still do not know whether access or document design causes it.',
        commit: 'Staff know document barriers drive rejections, but no assisted process, appeal route, or accountable office exists.',
        track: 'Assisted filing is active, but staff have not measured approvals, delays, or appeal outcomes.'
      }
    },
    {
      id: 'procurement-anomaly-screening', domain: 'Public procurement', title: 'Procurement anomaly screening', subject: 'anomaly screening', gap: 'legitimate bids receive more AI flags', cause: 'the AI misreads some legitimate bids', response: 'Human bid review', outcomes: 'corrected flags, delays, or bidder appeals',
      lines: {
        check: 'Procurement officers use AI to flag unusual bids, but its error rate and training labels were never tested.',
        connect: 'Officers confirmed that legitimate bids are flagged more often, but they do not know why.',
        commit: 'Officers know the AI misreads certain bids, but no human review process, owner, or appeal route exists.',
        track: 'Human review has started, but officers have not measured corrected flags, delays, or bidder appeals.'
      }
    },
    {
      id: 'road-progress-vision', domain: 'Public infrastructure', title: 'Road progress verification', subject: 'road progress checks', gap: 'some sitios report smaller travel gains', cause: 'drainage limits road benefits', response: 'Drainage repairs', outcomes: 'road condition, market access, or missed defects',
      lines: {
        check: 'Engineers use image analysis to confirm roadwork, but photo dates, coordinates, and inspection records conflict.',
        connect: 'Engineers confirmed completion, but have not explained why farmers in some sitios report smaller travel gains.',
        commit: 'Engineers know drainage limits road benefits, but no correction plan, contractor, or deadline has been assigned.',
        track: 'Drainage repairs are active, but staff have not measured road condition, market access, or missed defects.'
      }
    },
    {
      id: 'budget-chatbot', domain: 'Public finance', title: 'Local budget chatbot', subject: 'budget chatbot', gap: 'barangay users misunderstand some budget projects', cause: 'inaccurate chatbot answers cause confusion', response: 'Revised budget chatbot answers', outcomes: 'understanding, access, or false answers',
      lines: {
        check: 'Budget staff use an AI chatbot, but project codes, source links, and update dates are missing.',
        connect: 'Staff confirmed barangay users misunderstand some projects, but do not know which chatbot answers cause confusion.',
        commit: 'Staff know inaccurate answers cause confusion, but no content owner or correction process exists.',
        track: 'Revised answers are live, but staff have not measured understanding, access gaps, or fabricated claims.'
      }
    },
    {
      id: 'job-matching-recommender', domain: 'Employment services', title: 'Public job matching', subject: 'job matching', gap: 'some applicants receive poorer job matches', cause: 'access barriers reduce job placements', response: 'Revised job matching', outcomes: 'placement, retention, or wrongful exclusion',
      lines: {
        check: 'Employment staff use AI job matching, but duplicate profiles and employer-confirmed vacancies were not reconciled.',
        connect: 'Staff confirmed lower placement for some applicants, but have not separated transport, skills, and caregiving causes.',
        commit: 'Staff understand the matching barriers, but no support plan, fairness rule, or accountable owner exists.',
        track: 'Revised matching is active, but staff have not measured placement, retention, or wrongful exclusion.'
      }
    },
    {
      id: 'training-recommendation', domain: 'Skills development', title: 'Training recommendation', subject: 'training recommendations', gap: 'rural learners receive poorer course matches', cause: 'cost and access barriers limit training', response: 'Revised training guidance', outcomes: 'enrollment, completion, or employment',
      lines: {
        check: 'Training staff use AI course recommendations, but rural vacancies and graduate job outcomes are missing.',
        connect: 'Staff confirmed poorer matches for rural learners, but have not explained how costs, goals, and job access contribute.',
        commit: 'Staff understand rural access barriers, but no guidance change or accountable owner exists.',
        track: 'Revised guidance is active, but staff have not measured enrollment, completion, or employment.'
      }
    },
    {
      id: 'tourism-demand-forecast', domain: 'Local economic development', title: 'Tourism demand forecast', subject: 'tourism forecasting', gap: 'smaller destinations gain fewer tourism benefits', cause: 'market access limits small destinations', response: 'Local tourism support', outcomes: 'local income, congestion, or displacement',
      lines: {
        check: 'Tourism staff use AI demand forecasts, but online bookings omit walk-ins and community-run destinations.',
        connect: 'Staff confirmed smaller destinations benefit less, but have not explained access, promotion, or visitor-flow causes.',
        commit: 'Staff understand the market barriers, but no support plan or responsible tourism office exists.',
        track: 'Destination support is active, but staff have not measured local income, congestion, or displacement.'
      }
    },
    {
      id: 'incident-report-classification', domain: 'Community safety', title: 'Incident report classification', subject: 'incident classification', gap: 'some barangays abandon hotline reports', cause: 'language and routing barriers discourage reports', response: 'Human incident review', outcomes: 'response time, missed cases, or privacy complaints',
      lines: {
        check: 'Hotline staff use AI to classify incidents, but Cebuano reports and duplicate cases were never tested.',
        connect: 'Staff confirmed some barangays abandon reports, but do not know whether language, routing, or response time causes it.',
        commit: 'Staff understand reporting barriers, but no human review process, privacy rule, or accountable owner exists.',
        track: 'Human review is active, but staff have not measured response time, missed cases, or privacy complaints.'
      }
    },
    {
      id: 'citizen-request-translation', domain: 'Citizen services', title: 'Citizen request translation', subject: 'request translation', gap: 'users leave some translated service channels', cause: 'translation errors reduce service access', response: 'Interpreter fallback', outcomes: 'completion, misunderstanding, or privacy complaints',
      lines: {
        check: 'Service staff use AI translation, but regional-language accuracy and handling of sensitive terms were never tested.',
        connect: 'Staff confirmed users leave some translated channels, but do not know whether errors, trust, or access cause it.',
        commit: 'Staff know translation errors block access, but no interpreter fallback, privacy rule, or responsible owner exists.',
        track: 'Interpreter fallback is active, but staff have not measured completion, misunderstanding, or privacy complaints.'
      }
    },
    {
      id: 'accessible-service-recommender', domain: 'Disability inclusion', title: 'Accessible service guidance', subject: 'accessibility guidance', gap: 'disabled users face more service barriers', cause: 'inaccessible channels limit service access', response: 'Accessible service adjustments', outcomes: 'independent access, delays, or exclusions',
      lines: {
        check: 'Service staff use AI to recommend channels, but accessibility data and screen-reader performance were never tested.',
        connect: 'Staff confirmed disabled users face access gaps, but have not explained mobility, communication, or caregiver barriers.',
        commit: 'Staff understand the access barriers, but no service adjustment, rights safeguard, or accountable owner exists.',
        track: 'Service adjustments are active, but staff have not measured independent access, delays, or wrongful exclusion.'
      }
    },
    {
      id: 'ofw-helpdesk-triage', domain: 'Migrant services', title: 'OFW helpdesk triage', subject: 'helpdesk triage', gap: 'some OFWs receive slower helpdesk responses', cause: 'time-zone and connectivity barriers delay responses', response: 'The helpdesk escalation process', outcomes: 'resolution, delays, or missed emergencies',
      lines: {
        check: 'Helpdesk staff use AI to rank urgent OFW requests, but overseas coverage and Filipino-language accuracy are untested.',
        connect: 'Staff confirmed slower responses for some OFWs, but have not explained time-zone, document, and connectivity barriers.',
        commit: 'Staff understand the access barriers, but no escalation process, confidentiality rule, or responsible officer exists.',
        track: 'Escalation is active, but staff have not measured resolution, delays, or missed emergencies.'
      }
    }
  ];

  const secondarySignals = {
    check: spec => 'Officials cannot rely on AI for ' + spec.subject + ' until its data coverage and error rate are tested.',
    connect: spec => 'Officials confirmed ' + spec.gap + ', but still do not know why.',
    commit: spec => 'Officials know ' + spec.cause + ', but no action or accountable owner has been agreed.',
    track: spec => 'Officials started ' + spec.response.charAt(0).toLowerCase() + spec.response.slice(1) + ', but have not measured ' + spec.outcomes + '.'
  };

  const rationales = {
    check: [
      'The AI output must be compared with source records before staff use it.',
      'Staff need tested accuracy and known error rates before acting on an automated flag.'
    ],
    connect: [
      'The gap is real; staff now need to learn why it happens and who is most affected.',
      'Official records show what happened. Staff and residents can explain why.'
    ],
    commit: [
      'The cause is clear; staff must now assign a specific action, owner, deadline, and safeguard.',
      'The team needs one agreed action, a responsible owner, and a date to review progress.'
    ],
    track: [
      'The action has started; staff must measure results, unequal effects, and new harms.',
      'Results will show whether the action works fairly and what should change.'
    ]
  };

  const cues = {
    check: 'The AI result has not been tested against source records or known error rates.',
    connect: 'The gap is confirmed, but staff still do not know why it happens or who is most affected.',
    commit: 'The cause is understood, but nobody has been assigned a specific action or deadline.',
    track: 'The action is already underway, but nobody has measured what happened.'
  };

  const stageThemes = {
    check: ['technological-innovations', 'shared-mandate'],
    connect: ['local-partners', 'shared-mandate'],
    commit: ['collaborative-action', 'shared-mandate'],
    track: ['collaborative-action', 'technological-innovations']
  };

  const cases = caseSpecs.map(function (spec) {
    const builtStages = {};
    stages.forEach(function (stage) {
      const signals = [spec.lines[stage], secondarySignals[stage](spec)];
      builtStages[stage] = signals.map(function (signal, variantIndex) {
        const tags = [stage === 'check' ? 'ai-assisted' : 'human-led'];
        if (stage === 'connect') tags.unshift('official-and-community');
        return {
          id: spec.id + '-' + stage + '-' + (variantIndex + 1),
          difficulty: variantIndex + 1,
          signal: signal,
          rationale: rationales[stage][variantIndex],
          cue: cues[stage],
          themeIds: stageThemes[stage].slice(),
          tags: tags
        };
      });
    });
    return { id: spec.id, domain: spec.domain, title: spec.title, stages: builtStages };
  });

  const pack = {
    schemaVersion: 1,
    packId: packId,
    name: 'Philippine responsible AI scenarios',
    description: 'Thirty-two fictional Philippine public-service cases for responsible evidence-to-action decisions with AI.',
    locale: 'en-PH',
    themeIds: themes,
    cases: cases
  };

  if (root.BuzzCasePacks && typeof root.BuzzCasePacks.register === 'function') {
    root.BuzzCasePacks.register(packId, pack);
  } else {
    root.BuzzContent = pack;
  }
}(typeof window !== 'undefined' ? window : globalThis));
