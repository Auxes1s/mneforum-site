(function (root) {
  'use strict';

  const packId = 'philippines-ai-v2';
  const stages = ['check', 'connect', 'commit', 'track'];
  const themes = ['shared-mandate', 'technological-innovations', 'local-partners', 'collaborative-action'];

  const caseSpecs = [
    {
      id: 'cash-aid-risk-screening', domain: 'Social protection', title: 'Cash aid risk screening', subject: 'cash aid screening',
      lines: {
        check: 'An AI risk list excludes many records with blank addresses, and its error rate is unknown.',
        connect: 'The exclusion gap is verified, but why remote households are affected more remains unexplained.',
        commit: 'Address barriers are confirmed, but no assisted review, owner, safeguard, measure, or review date exists.',
        track: 'Assisted reviews are active, but access, false exclusions, subgroup effects, and model drift remain unmeasured.'
      }
    },
    {
      id: 'grievance-chatbot-routing', domain: 'Social protection', title: 'Grievance chatbot routing', subject: 'grievance routing',
      lines: {
        check: 'A chatbot reports high resolution, but reopened cases and Filipino-language errors were omitted.',
        connect: 'Routing errors are verified, but why seniors and low-connectivity users struggle remains unclear.',
        commit: 'Language and access causes are established, but no human fallback, owner, standard, or review date exists.',
        track: 'A human fallback is operating, but resolution, repeat complaints, access gaps, and chatbot drift are unmeasured.'
      }
    },
    {
      id: 'dengue-forecasting', domain: 'Public health', title: 'Dengue hotspot forecast', subject: 'dengue forecasting',
      lines: {
        check: 'An AI hotspot map uses incomplete barangay reports, and recent outbreak accuracy has not been tested.',
        connect: 'Hotspots are validated, but housing, water storage, and care-seeking differences remain unexplained.',
        commit: 'Local drivers are confirmed, but no targeted response, owner, safeguard, measure, or review trigger exists.',
        track: 'Targeted prevention is underway, but cases, missed areas, community burden, and forecast drift remain unmeasured.'
      }
    },
    {
      id: 'rhu-teleconsult-triage', domain: 'Primary health', title: 'RHU teleconsult triage', subject: 'teleconsult triage',
      lines: {
        check: 'An AI triage tool marks cases urgent, but referral records and false-alarm rates were not checked.',
        connect: 'Urgency patterns are verified, but why island barangays complete fewer referrals remains unclear.',
        commit: 'Connectivity barriers are established, but no backup pathway, owner, safety rule, measure, or review date exists.',
        track: 'A backup pathway is active, but completed referrals, delays, missed emergencies, and triage drift remain unmeasured.'
      }
    },
    {
      id: 'vaccine-cold-chain-alerts', domain: 'Public health', title: 'Vaccine cold-chain alerts', subject: 'cold-chain alerts',
      lines: {
        check: 'AI alerts show temperature breaches, but sensor calibration and outage periods are undocumented.',
        connect: 'Breaches are confirmed, but why they cluster on certain delivery routes remains unexplained.',
        commit: 'Route delays are established, but no revised protocol, owner, safety threshold, measure, or review date exists.',
        track: 'A revised protocol is running, but spoilage, route gaps, false alerts, and sensor drift remain unmeasured.'
      }
    },
    {
      id: 'maternal-referral-risk', domain: 'Maternal health', title: 'Maternal referral risk', subject: 'maternal referral risk',
      lines: {
        check: 'An AI risk score uses incomplete prenatal records, and accuracy across rural health units is unknown.',
        connect: 'Referral gaps are verified, but transport, cost, and family decision barriers remain unexplained.',
        commit: 'Referral barriers are confirmed, but no transport response, owner, consent safeguard, measure, or review date exists.',
        track: 'Transport support is active, but timely referrals, maternal outcomes, inequities, and model drift remain unmeasured.'
      }
    },
    {
      id: 'reading-risk-model', domain: 'Basic education', title: 'Reading risk model', subject: 'reading risk model',
      lines: {
        check: 'An AI model flags struggling readers, but home-language coverage and assessment comparability are untested.',
        connect: 'Reading gaps are verified, but why learners differ by language and attendance remains unexplained.',
        commit: 'Learning barriers are established, but no targeted support, owner, safeguard, measure, or review date exists.',
        track: 'Targeted support is running, but learning gains, language equity, labeling harms, and model drift remain unmeasured.'
      }
    },
    {
      id: 'als-learner-support', domain: 'Alternative education', title: 'ALS learner support', subject: 'ALS support',
      lines: {
        check: 'An AI attendance alert uses delayed session logs, and its missed-learner rate is unknown.',
        connect: 'Participation gaps are verified, but work, caregiving, and travel constraints remain unexplained.',
        commit: 'Attendance barriers are established, but no flexible support, owner, privacy safeguard, measure, or review date exists.',
        track: 'Flexible support is active, but participation, completion, privacy concerns, and alert drift remain unmeasured.'
      }
    },
    {
      id: 'school-feeding-targeting', domain: 'Education and nutrition', title: 'School feeding targeting', subject: 'feeding targeting',
      lines: {
        check: 'AI targeting ranks schools, but enrollment changes and nutrition-screening gaps were not reconciled.',
        connect: 'Coverage gaps are verified, but why distant sitios participate less remains unexplained.',
        commit: 'Distance barriers are confirmed, but no delivery adjustment, owner, inclusion safeguard, measure, or review date exists.',
        track: 'Adjusted delivery is active, but participation, nutrition outcomes, stigma, and model drift remain unmeasured.'
      }
    },
    {
      id: 'classroom-repair-vision', domain: 'Education infrastructure', title: 'AI-assisted repair inspection', subject: 'repair inspection',
      lines: {
        check: 'Image analysis marks classrooms repaired, but photo dates, locations, and acceptance records conflict.',
        connect: 'Incomplete repairs are verified, but why usability differs across schools remains unexplained.',
        commit: 'Ventilation gaps are established, but no correction, owner, standard, measure, or review date exists.',
        track: 'Corrections are underway, but safe use, learning disruption, missed defects, and model drift remain unmeasured.'
      }
    },
    {
      id: 'crop-disease-classifier', domain: 'Agriculture', title: 'Crop disease classifier', subject: 'crop disease advice',
      lines: {
        check: 'An AI classifier recommends treatment, but local crop varieties and field accuracy were not tested.',
        connect: 'Misclassification is verified, but why tenant and upland farmers are affected more remains unclear.',
        commit: 'Coverage gaps are established, but no extension review, owner, safety rule, measure, or review date exists.',
        track: 'Extension review is active, but crop recovery, costs, harmful advice, and model drift remain unmeasured.'
      }
    },
    {
      id: 'irrigation-scheduling-ai', domain: 'Agriculture and water', title: 'AI irrigation scheduling', subject: 'irrigation scheduling',
      lines: {
        check: 'AI schedules use moisture sensors, but maintenance records and tail-end farm coverage are incomplete.',
        connect: 'Water gaps are verified, but canal position, crop choice, and farm constraints remain unexplained.',
        commit: 'Tail-end shortages are established, but no rotation change, owner, fairness rule, measure, or review date exists.',
        track: 'A revised rotation is active, but delivery, yields, disputes, and forecast drift remain unmeasured.'
      }
    },
    {
      id: 'fish-catch-forecast', domain: 'Fisheries', title: 'Municipal catch forecast', subject: 'catch forecasting',
      lines: {
        check: 'An AI catch forecast uses changing landing coverage, and accuracy for small boats is unknown.',
        connect: 'Catch differences are verified, but weather, fishing grounds, and gear constraints remain unexplained.',
        commit: 'Access constraints are confirmed, but no advisory change, owner, safety rule, measure, or review date exists.',
        track: 'Revised advisories are active, but catch, safety, small-boat effects, and model drift remain unmeasured.'
      }
    },
    {
      id: 'farm-market-price-advice', domain: 'Agriculture markets', title: 'Farm price advice', subject: 'price advice',
      lines: {
        check: 'AI price advice omits several municipal markets, and quoted transaction dates are inconsistent.',
        connect: 'Price gaps are verified, but transport, buyer access, and bargaining differences remain unexplained.',
        commit: 'Market barriers are established, but no advisory response, owner, fairness safeguard, measure, or review date exists.',
        track: 'Revised advice is active, but farmer prices, access gaps, losses, and model drift remain unmeasured.'
      }
    },
    {
      id: 'flood-nowcasting', domain: 'Disaster risk reduction', title: 'Barangay flood nowcast', subject: 'flood nowcasting',
      lines: {
        check: 'An AI flood alert relies on patchy rain gauges, and accuracy during recent storms is untested.',
        connect: 'Warning gaps are verified, but why riverside sitios receive alerts late remains unexplained.',
        commit: 'Signal barriers are established, but no backup channel, owner, warning threshold, measure, or drill date exists.',
        track: 'Backup alerts are active, but reach, evacuation, false alarms, and forecast drift remain unmeasured.'
      }
    },
    {
      id: 'evacuation-allocation', domain: 'Disaster response', title: 'Evacuation center allocation', subject: 'evacuation allocation',
      lines: {
        check: 'AI allocation estimates capacity, but usable space, accessibility, and household counts use conflicting definitions.',
        connect: 'Capacity gaps are verified, but privacy, safety, and transport concerns remain unexplained.',
        commit: 'Access concerns are established, but no allocation change, owner, safeguard, measure, or review date exists.',
        track: 'Revised allocation is active, but safe use, exclusion, crowding, and model drift remain unmeasured.'
      }
    },
    {
      id: 'urban-heat-mapping', domain: 'Climate adaptation', title: 'Urban heat risk map', subject: 'heat risk mapping',
      lines: {
        check: 'An AI heat map lacks sensor coverage in informal settlements and records several missing days.',
        connect: 'Hotspots are verified, but exposure among vendors, commuters, and outdoor workers remains unexplained.',
        commit: 'Exposure patterns are established, but no cooling response, owner, equity rule, measure, or review date exists.',
        track: 'Cooling measures are active, but use, heat exposure, displacement harms, and model drift remain unmeasured.'
      }
    },
    {
      id: 'illegal-dumping-detection', domain: 'Environment', title: 'Illegal dumping detection', subject: 'dumping detection',
      lines: {
        check: 'Image analysis flags dumping sites, but duplicate images and barangay coverage were not checked.',
        connect: 'Dumping clusters are verified, but collection access and household constraints remain unexplained.',
        commit: 'Service barriers are established, but no collection response, owner, safeguard, measure, or review date exists.',
        track: 'Collection changes are active, but dumping, service equity, false flags, and model drift remain unmeasured.'
      }
    },
    {
      id: 'water-leak-detection', domain: 'Water services', title: 'Water leak detection', subject: 'leak detection',
      lines: {
        check: 'AI leak alerts use incomplete pressure-sensor data, and false-positive rates are undocumented.',
        connect: 'Leak patterns are verified, but why upland households face longer interruptions remains unexplained.',
        commit: 'Repair delays are established, but no priority rule, owner, service safeguard, measure, or review date exists.',
        track: 'Priority repairs are active, but continuity, water loss, household equity, and model drift remain unmeasured.'
      }
    },
    {
      id: 'waste-route-optimization', domain: 'Solid waste', title: 'Waste collection routing', subject: 'waste routing',
      lines: {
        check: 'AI routes show full coverage, but missed pickups and informal collection points are absent.',
        connect: 'Missed pickups are verified, but road access, timing, and household constraints remain unexplained.',
        commit: 'Route barriers are established, but no schedule change, owner, labor safeguard, measure, or review date exists.',
        track: 'A new schedule is active, but collection, worker burden, missed areas, and model drift remain unmeasured.'
      }
    },
    {
      id: 'jeepney-crowding-forecast', domain: 'Public transport', title: 'Jeepney crowding forecast', subject: 'crowding forecast',
      lines: {
        check: 'An AI forecast uses incomplete dispatch logs, and accuracy outside peak hours is unknown.',
        connect: 'Crowding patterns are verified, but transfer delays and commuter constraints remain unexplained.',
        commit: 'Transfer causes are established, but no timetable trial, owner, worker safeguard, measure, or review date exists.',
        track: 'A timetable trial is active, but waits, crowding, driver effects, and model drift remain unmeasured.'
      }
    },
    {
      id: 'permit-document-screening', domain: 'Digital government', title: 'Permit document screening', subject: 'permit screening',
      lines: {
        check: 'AI screening marks applications incomplete, but scan quality and Filipino document accuracy are untested.',
        connect: 'Rejection gaps are verified, but why microenterprises and remote applicants struggle remains unexplained.',
        commit: 'Document barriers are established, but no assisted process, owner, appeal safeguard, measure, or review date exists.',
        track: 'Assisted filing is active, but approvals, delays, appeal outcomes, and model drift remain unmeasured.'
      }
    },
    {
      id: 'procurement-anomaly-screening', domain: 'Public procurement', title: 'Procurement anomaly screening', subject: 'anomaly screening',
      lines: {
        check: 'AI flags unusual bids, but historical labels, thresholds, and false-positive rates are undocumented.',
        connect: 'Flag differences are verified, but procurement process and market context remain unexplained.',
        commit: 'Review needs are established, but no human protocol, owner, due-process safeguard, measure, or review date exists.',
        track: 'Human review is active, but resolution, delays, unfair flags, and model drift remain unmeasured.'
      }
    },
    {
      id: 'road-progress-vision', domain: 'Public infrastructure', title: 'Road progress verification', subject: 'road progress checks',
      lines: {
        check: 'Image analysis marks roadwork complete, but photo dates, coordinates, and inspection records conflict.',
        connect: 'Progress is verified, but why farmers report uneven travel benefits remains unexplained.',
        commit: 'Drainage causes are established, but no correction, owner, engineering standard, measure, or review date exists.',
        track: 'Drainage correction is active, but road condition, market access, missed defects, and model drift remain unmeasured.'
      }
    },
    {
      id: 'budget-chatbot', domain: 'Public finance', title: 'Local budget chatbot', subject: 'budget chatbot',
      lines: {
        check: 'An AI chatbot summarizes spending, but project codes, source links, and update dates are incomplete.',
        connect: 'Information gaps are verified, but why barangay users misunderstand projects remains unexplained.',
        commit: 'Communication barriers are established, but no content owner, accuracy safeguard, measure, or review date exists.',
        track: 'Revised answers are live, but understanding, access gaps, hallucinations, and model drift remain unmeasured.'
      }
    },
    {
      id: 'job-matching-recommender', domain: 'Employment services', title: 'Public job matching', subject: 'job matching',
      lines: {
        check: 'AI matches applicants to vacancies, but duplicate profiles and employer confirmations were not reconciled.',
        connect: 'Placement gaps are verified, but transport, skills, and caregiving constraints remain unexplained.',
        commit: 'Matching barriers are established, but no support response, owner, fairness safeguard, measure, or review date exists.',
        track: 'Revised matching is active, but placement, retention, exclusion harms, and model drift remain unmeasured.'
      }
    },
    {
      id: 'training-recommendation', domain: 'Skills development', title: 'Training recommendation', subject: 'training recommendations',
      lines: {
        check: 'AI recommends courses, but rural vacancy data and prior-training outcomes are incomplete.',
        connect: 'Recommendation gaps are verified, but learner goals, costs, and local job access remain unexplained.',
        commit: 'Access causes are established, but no guidance change, owner, fairness safeguard, measure, or review date exists.',
        track: 'Revised guidance is active, but enrollment, completion, jobs, and model drift remain unmeasured.'
      }
    },
    {
      id: 'tourism-demand-forecast', domain: 'Local economic development', title: 'Tourism demand forecast', subject: 'tourism forecasting',
      lines: {
        check: 'An AI forecast relies on online bookings, excluding many walk-ins and community-run destinations.',
        connect: 'Demand patterns are verified, but why smaller sites benefit less remains unexplained.',
        commit: 'Market barriers are established, but no support owner, community safeguard, measure, or review date exists.',
        track: 'Destination support is active, but local income, congestion, displacement, and model drift remain unmeasured.'
      }
    },
    {
      id: 'incident-report-classification', domain: 'Community safety', title: 'Incident report classification', subject: 'incident classification',
      lines: {
        check: 'AI classifies hotline reports, but Cebuano entries and duplicate incidents were not tested.',
        connect: 'Routing gaps are verified, but why some barangays abandon reports remains unexplained.',
        commit: 'Reporting barriers are established, but no human review, owner, privacy safeguard, measure, or review date exists.',
        track: 'Human review is active, but response time, missed cases, privacy harms, and model drift remain unmeasured.'
      }
    },
    {
      id: 'citizen-request-translation', domain: 'Citizen services', title: 'Citizen request translation', subject: 'request translation',
      lines: {
        check: 'AI translates service requests, but regional-language accuracy and sensitive-term handling are untested.',
        connect: 'Translation gaps are verified, but why users abandon certain service channels remains unexplained.',
        commit: 'Language barriers are established, but no interpreter owner, privacy safeguard, measure, or review date exists.',
        track: 'Interpreter fallback is active, but completion, misunderstanding, privacy harms, and model drift remain unmeasured.'
      }
    },
    {
      id: 'accessible-service-recommender', domain: 'Disability inclusion', title: 'Accessible service guidance', subject: 'accessibility guidance',
      lines: {
        check: 'AI recommends service channels, but accessibility data and screen-reader testing are incomplete.',
        connect: 'Access gaps are verified, but mobility, communication, and caregiver constraints remain unexplained.',
        commit: 'Access causes are established, but no service owner, rights safeguard, measure, or review date exists.',
        track: 'Service adjustments are active, but independent access, delays, exclusion harms, and model drift remain unmeasured.'
      }
    },
    {
      id: 'ofw-helpdesk-triage', domain: 'Migrant services', title: 'OFW helpdesk triage', subject: 'helpdesk triage',
      lines: {
        check: 'AI ranks urgent requests, but overseas channel coverage and Filipino-language accuracy are untested.',
        connect: 'Response gaps are verified, but time zones, documents, and connectivity constraints remain unexplained.',
        commit: 'Access barriers are established, but no escalation owner, confidentiality safeguard, measure, or review date exists.',
        track: 'Escalation is active, but resolution, delays, missed emergencies, and model drift remain unmeasured.'
      }
    }
  ];

  const secondarySignals = {
    check: subject => subject + ' AI flags lack tested accuracy, source coverage, and a documented threshold.',
    connect: subject => 'Verified ' + subject + ' differs across groups; staff and residents have not explained why.',
    commit: subject => subject + ' cause is known, but no response, owner, safeguard, measure, or review date is assigned.',
    track: subject => subject + ' response is active, but outcomes, subgroup effects, harms, and model drift remain unmeasured.'
  };

  const rationales = {
    check: [
      'Verify the source, definition, coverage, and AI validation before accepting this as evidence.',
      'An automated flag is only a lead until records and known error rates confirm it.'
    ],
    connect: [
      'Investigate why the verified pattern differs by group, place, or service route.',
      'Combine official findings with staff and community experience to explain causes and affected groups.'
    ],
    commit: [
      'Assign a feasible action, named owner, safeguard, success measure, and review date.',
      'The cause is established; now assign the action, accountability, protection, and decision point.'
    ],
    track: [
      'Measure results, subgroup effects, harms, and model drift while the response is underway.',
      'Check whether the action works fairly and adapt when new evidence appears.'
    ]
  };

  const cues = {
    check: 'The AI output is uncertain; verify it against source records and known limitations.',
    connect: 'The finding is sound, but its causes and affected groups still need human investigation.',
    commit: 'The explanation is ready; assign the action, owner, safeguard, measure, and review point.',
    track: 'The response has started; measure outcomes, uneven effects, harms, and the need to adapt.'
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
      const signals = [spec.lines[stage], secondarySignals[stage](spec.subject)];
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
