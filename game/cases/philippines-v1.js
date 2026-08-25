(function (root) {
  'use strict';

  const packId = 'philippines-v1';
  const stages = ['check', 'connect', 'commit', 'track'];
  const themes = ['shared-mandate', 'technological-innovations', 'local-partners', 'collaborative-action'];

  const caseSpecs = [
    {
      id: 'national-results-matrix', domain: 'National planning', title: 'Regional target reporting',
      lines: {
        check: 'The dashboard shows full completion, but regional reports use different denominators.',
        connect: 'Totals are verified, but regional gaps remain unexplained by implementers or service users.',
        commit: 'Regions agree on the bottleneck, but no corrective action, owner, measure, or review date exists.',
        track: 'Corrective actions have started, but regional outcomes and uneven effects remain unreviewed.'
      },
      cues: {
        check: 'Definitions conflict, so the source reports are not yet comparable.',
        connect: 'The pattern is credible, but operational reasons and affected groups are missing.',
        commit: 'Understanding is shared, but an accountable response is absent.',
        track: 'Implementation exists, but follow-through and adaptation are missing.'
      }
    },
    {
      id: 'cbms-water-access', domain: 'Local planning', title: 'Household water access',
      lines: {
        check: 'A CBMS map shows universal water access, but several barangay records lack source fields.',
        connect: 'Access figures are validated, but seasonal shortages among upland households remain unexplained.',
        commit: 'Barangays identify the seasonal gap, but no intervention, lead office, indicator, or review date exists.',
        track: 'Water deliveries have begun, but reliability across upland sitios remains unmeasured.'
      },
      cues: {
        check: 'Coverage and data quality remain uncertain.',
        connect: 'Verified coverage still needs local and seasonal context.',
        commit: 'The issue is understood, but ownership and action are missing.',
        track: 'An intervention is running, but equitable results remain unknown.'
      }
    },
    {
      id: 'barangay-medicine-stock', domain: 'Barangay health', title: 'Medicine availability',
      lines: {
        check: 'The report shows no stock-outs, but paper and electronic medicine logs disagree.',
        connect: 'Stock-outs are confirmed, but caregivers and health workers have not explained when shortages occur.',
        commit: 'Workers identify the replenishment delay, but no owner, reorder trigger, or review schedule exists.',
        track: 'A reorder trigger is active, but missed prescriptions by medicine type remain unreviewed.'
      },
      cues: {
        check: 'The records must be reconciled before availability is established.',
        connect: 'The shortage is verified, but timing and user experience are unclear.',
        commit: 'A shared diagnosis still needs an accountable response.',
        track: 'Implementation has begun, but service outcomes are not yet followed.'
      }
    },
    {
      id: 'early-grade-reading', domain: 'Education', title: 'Reading recovery',
      lines: {
        check: 'Reading scores rose sharply, but several schools changed assessment administration midway.',
        connect: 'Comparable gains are verified, but differences by home language and attendance remain unexplained.',
        commit: 'Teachers explain the gap, but no targeted schedule, owner, measure, or review date exists.',
        track: 'Targeted tutorials are running, but sustained gains across language groups remain unmeasured.'
      },
      cues: {
        check: 'Comparability is uncertain, so improvement cannot yet be attributed.',
        connect: 'The result is credible, but who benefits and why remain unclear.',
        commit: 'The evidence is understood, but a feasible response is missing.',
        track: 'Implementation has started, but learning and equity outcomes remain unknown.'
      }
    },
    {
      id: 'school-feeding-reach', domain: 'Education and nutrition', title: 'Feeding participation',
      lines: {
        check: 'Attendance shows complete feeding participation, but several dates contain duplicate entries.',
        connect: 'Participation is validated, but children in distant sitios attend less often for unknown reasons.',
        commit: 'Families identify transport and timing barriers, but no adjusted delivery plan or owner exists.',
        track: 'A revised schedule is operating, but attendance and nutrition outcomes by sitio remain unchecked.'
      },
      cues: {
        check: 'Duplicate records make the reach estimate unreliable.',
        connect: 'The gap is real, but its local access barriers need explanation.',
        commit: 'Shared understanding has not become a specific accountable action.',
        track: 'The change is running, but reach and intended outcomes remain unknown.'
      }
    },
    {
      id: 'immunization-dropout', domain: 'Health', title: 'Childhood immunization',
      lines: {
        check: 'Completion fell, but transferred records and duplicate entries were not reconciled.',
        connect: 'The decline is confirmed, but caregiver reasons and barangay access differences remain unknown.',
        commit: 'Caregivers identify missed follow-ups, but no outreach owner, target, or review date exists.',
        track: 'Reminder outreach has started, but completion and missed groups remain unassessed.'
      },
      cues: {
        check: 'The denominator and records are not yet reliable.',
        connect: 'Verified coverage needs lived context about access barriers.',
        commit: 'The bottleneck is understood, but an accountable action is missing.',
        track: 'Implementation has begun, but results and uneven reach are unknown.'
      }
    },
    {
      id: 'rhu-wait-times', domain: 'Primary health', title: 'Rural clinic waiting time',
      lines: {
        check: 'Average waits appear shorter, but many encounters lack arrival timestamps.',
        connect: 'Waits are verified, but differences by service, shift, and patient group remain unexplained.',
        commit: 'Staff identify the intake bottleneck, but no trial owner, measure, or review point exists.',
        track: 'A revised intake flow is running, but peak-hour and priority-patient results remain unknown.'
      },
      cues: {
        check: 'Missing timestamps prevent a reliable conclusion.',
        connect: 'Credible measures now need operational and patient context.',
        commit: 'A shared diagnosis has not become accountable action.',
        track: 'The service change is active, but outcomes across times and groups are unknown.'
      }
    },
    {
      id: 'four-ps-grievances', domain: 'Social protection', title: '4Ps grievance resolution',
      lines: {
        check: 'Resolved grievances increased, but closure codes and supporting notes do not match.',
        connect: 'Valid resolutions are counted, but repeated complaints from remote barangays remain unexplained.',
        commit: 'Beneficiaries identify referral delays, but no revised pathway, owner, or service standard exists.',
        track: 'A new referral pathway is active, but recurrence and resolution time by channel remain unreviewed.'
      },
      cues: {
        check: 'The meaning of resolved is not yet verified.',
        connect: 'The pattern is verified, but accessibility and user experience need interpretation.',
        commit: 'Shared insight still needs a defined response and owner.',
        track: 'The pathway is active, but equitable performance remains unknown.'
      }
    },
    {
      id: 'senior-aid-access', domain: 'Social protection', title: 'Senior assistance access',
      lines: {
        check: 'The registry suggests full reach, but inactive and duplicate records were not reviewed.',
        connect: 'Eligible coverage is verified, but homebound seniors complete fewer claims for unknown reasons.',
        commit: 'Seniors identify mobility barriers, but no assisted process or responsible office exists.',
        track: 'Assisted claims have begun, but completion time and reach among homebound seniors remain unmeasured.'
      },
      cues: {
        check: 'The beneficiary list and denominator remain uncertain.',
        connect: 'The disparity is real, but its accessibility barriers need explanation.',
        commit: 'Understanding has not become an owned service adjustment.',
        track: 'The assisted process is active, but speed and inclusion remain unknown.'
      }
    },
    {
      id: 'seed-distribution', domain: 'Agriculture', title: 'Seed assistance',
      lines: {
        check: 'Distribution shows complete delivery, but registry status and signed receipts conflict.',
        connect: 'Deliveries are confirmed, but planting rates differ by irrigation access and tenure.',
        commit: 'Farmers identify irrigation constraints, but no targeted support owner or measure exists.',
        track: 'Targeted support is underway, but planting, yield, and tenant-farmer results remain unreviewed.'
      },
      cues: {
        check: 'Recipient and delivery evidence conflict.',
        connect: 'Verified delivery still needs farm-level context about use.',
        commit: 'A shared diagnosis lacks a specific accountable response.',
        track: 'Support is underway, but outcomes and differential effects remain unknown.'
      }
    },
    {
      id: 'irrigation-advisory', domain: 'Agriculture and climate', title: 'Irrigation scheduling',
      lines: {
        check: 'A moisture dashboard signals stress, but sensor maintenance and field coverage are undocumented.',
        connect: 'Stress is confirmed, but farm impacts differ by canal location for unexplained reasons.',
        commit: 'Farmers identify tail-end shortages, but no revised schedule, accountable lead, or review trigger exists.',
        track: 'A revised rotation is operating, but delivery and crop effects by canal section remain unknown.'
      },
      cues: {
        check: 'The technology and its coverage have not been verified.',
        connect: 'The signal is credible, but local water-access patterns need interpretation.',
        commit: 'Shared understanding has not become a governed adjustment.',
        track: 'The rotation is active, but implementation and distributional effects remain unknown.'
      }
    },
    {
      id: 'municipal-fish-catch', domain: 'Fisheries', title: 'Municipal fish catch',
      lines: {
        check: 'Reported catch increased, but landing coverage and vessel classifications changed during the quarter.',
        connect: 'The catch trend is verified, but small-boat fishers report different conditions for unknown reasons.',
        commit: 'Fishers identify uneven access, but no monitoring response, owner, or decision rule exists.',
        track: 'Expanded landing monitoring is running, but coverage and livelihood effects remain unassessed.'
      },
      cues: {
        check: 'Changing coverage and classifications threaten comparability.',
        connect: 'Credible totals still need fishing-ground and livelihood context.',
        commit: 'Shared interpretation lacks a concrete accountable step.',
        track: 'Monitoring is expanded, but data quality and livelihood outcomes remain unknown.'
      }
    },
    {
      id: 'flood-alert-reach', domain: 'Disaster risk reduction', title: 'Flood warning reach',
      lines: {
        check: 'The alert log shows rapid delivery, but several timestamps were batch-entered later.',
        connect: 'Delivery times are validated, but residents differ in receipt and understanding.',
        commit: 'Residents identify signal and language barriers, but no backup channel, owner, or drill date exists.',
        track: 'Backup alerts are active, but nighttime reach and comprehension across sitios remain untested.'
      },
      cues: {
        check: 'The timing evidence must be verified before judging performance.',
        connect: 'Technical success still needs community context about access and comprehension.',
        commit: 'The gap is understood, but an accountable response is missing.',
        track: 'The backup is active, but performance under varied conditions remains unknown.'
      }
    },
    {
      id: 'evacuation-center-access', domain: 'Disaster response', title: 'Evacuation center access',
      lines: {
        check: 'The center count shows enough capacity, but usable-space and occupancy definitions differ.',
        connect: 'Usable capacity is confirmed, but some groups still avoid assigned centers.',
        commit: 'Evacuees identify access and privacy barriers, but no improvement plan, owner, or standard exists.',
        track: 'Accessibility changes are underway, but use, safety, and subgroup experience remain unreviewed.'
      },
      cues: {
        check: 'Capacity definitions and actual usable space remain uncertain.',
        connect: 'Resource levels are known, but accessibility and safety perceptions need explanation.',
        commit: 'Shared findings still need a specific safeguarded response.',
        track: 'Changes are underway, but outcomes and unintended effects remain unknown.'
      }
    },
    {
      id: 'heat-action-plan', domain: 'Climate adaptation', title: 'Urban heat response',
      lines: {
        check: 'A heat map flags priority areas, but sensor placement and missing days are undocumented.',
        connect: 'Hotspots are verified, but exposure differs among commuters, vendors, and outdoor workers.',
        commit: 'Groups identify priority places, but no intervention owner, threshold, or review date exists.',
        track: 'Cooling measures are operating, but usage, heat exposure, and displacement effects remain unknown.'
      },
      cues: {
        check: 'The heat signal and its coverage remain uncertain.',
        connect: 'Verified physical risk still needs interpretation with affected groups.',
        commit: 'Shared risk understanding has not become a defined decision.',
        track: 'Measures are active, but benefits and unintended shifts remain unknown.'
      }
    },
    {
      id: 'river-water-quality', domain: 'Environment', title: 'River quality',
      lines: {
        check: 'Residents report odor, but routine sampling missed the reported period.',
        connect: 'A pollution window is confirmed, but upstream activities and affected livelihoods remain unexplored.',
        commit: 'Stakeholders identify the likely window, but no sampling lead, trigger, or response protocol exists.',
        track: 'Targeted sampling is active, but downstream conditions and community reports remain unreviewed.'
      },
      cues: {
        check: 'The signal has not been tested with appropriate timing.',
        connect: 'Verified contamination still needs multi-sector interpretation.',
        commit: 'Shared understanding lacks an accountable monitoring response.',
        track: 'Sampling is active, but technical and lived outcomes remain unreviewed.'
      }
    },
    {
      id: 'materials-recovery', domain: 'Solid waste', title: 'Barangay waste recovery',
      lines: {
        check: 'Recovery volume increased, but weighing methods and collection coverage changed.',
        connect: 'The increase is validated, but low participation in two puroks remains unexplained.',
        commit: 'Residents identify schedule confusion, but no revised collection plan, owner, or target exists.',
        track: 'A new schedule is active, but segregation quality and participation by purok remain unmeasured.'
      },
      cues: {
        check: 'Changing measurement and coverage threaten comparability.',
        connect: 'The pattern is credible, but household and collector context is missing.',
        commit: 'Understanding has not become an accountable service change.',
        track: 'The schedule is active, but behavior and service results remain unknown.'
      }
    },
    {
      id: 'jeepney-route-reliability', domain: 'Public transport', title: 'Route reliability',
      lines: {
        check: 'Dispatch records show complete trips, but identical arrival times appear across several vehicles.',
        connect: 'Missed trips are confirmed, but delays cluster at transfer points for unexplained reasons.',
        commit: 'Commuters identify transfer delays, but no timetable trial, owner, or success measure exists.',
        track: 'A timetable trial is running, but connections, crowding, and evening access remain unreviewed.'
      },
      cues: {
        check: 'The log accuracy must be verified before judging reliability.',
        connect: 'Reliable records still need operator and commuter context.',
        commit: 'Shared insight lacks an accountable operational test.',
        track: 'The trial is running, but intended and unintended effects remain unknown.'
      }
    },
    {
      id: 'terminal-accessibility', domain: 'Transport inclusion', title: 'Terminal access',
      lines: {
        check: 'An inspection reports full accessibility, but several checklist items lack measurements or photographs.',
        connect: 'Physical barriers are documented, but passenger experiences across routes and peak periods remain unknown.',
        commit: 'Passengers prioritize two barriers, but no improvement owner, standard, or review date exists.',
        track: 'Accessibility upgrades have begun, but independent use and waiting time remain unassessed.'
      },
      cues: {
        check: 'Compliance evidence is incomplete and needs verification.',
        connect: 'Verified facilities data still need user context.',
        commit: 'Agreed priorities lack a specific accountable response.',
        track: 'Upgrades are underway, but actual access outcomes remain unknown.'
      }
    },
    {
      id: 'farm-road-progress', domain: 'Infrastructure', title: 'Farm-to-market road',
      lines: {
        check: 'The project appears complete online, but photographs lack reliable coordinates and dates.',
        connect: 'Construction progress is confirmed, but farmers report uneven travel benefits across sitios.',
        commit: 'Farmers identify a drainage gap, but no corrective owner, standard, or deadline exists.',
        track: 'Drainage correction is underway, but road condition and market access after rain remain unmeasured.'
      },
      cues: {
        check: 'Physical accomplishment evidence is not yet reliable.',
        connect: 'Verified outputs still need user and network context.',
        commit: 'A shared finding lacks an enforceable response.',
        track: 'Correction is underway, but service outcomes remain unknown.'
      }
    },
    {
      id: 'classroom-repair', domain: 'Education infrastructure', title: 'Classroom repair',
      lines: {
        check: 'The tracker lists repairs complete, but school acceptance records and site photographs conflict.',
        connect: 'Completed repairs are verified, but classroom usability differs across schools.',
        commit: 'Schools identify ventilation gaps, but no correction owner, standard, or review date exists.',
        track: 'Corrections have started, but safe use and learning disruption remain unreviewed.'
      },
      cues: {
        check: 'Actual completion and acceptance remain uncertain.',
        connect: 'Physical completion still needs teacher and learner context.',
        commit: 'Validated usability issues lack accountable action.',
        track: 'Remedial work is underway, but functional outcomes remain unknown.'
      }
    },
    {
      id: 'online-business-permits', domain: 'Digital government', title: 'Online permit renewal',
      lines: {
        check: 'Portal data show faster renewals, but abandoned and unresolved applications are excluded.',
        connect: 'Processing gains are confirmed, but microenterprises and low-connectivity areas benefit less.',
        commit: 'Applicants identify connectivity barriers, but no assisted pathway or responsible office exists.',
        track: 'Assisted renewal is available, but repeat visits, completion time, and subgroup reach remain unmeasured.'
      },
      cues: {
        check: 'The denominator excludes incomplete cases and is not reliable.',
        connect: 'The outcome is credible, but unequal access needs user context.',
        commit: 'Shared understanding lacks a concrete service response.',
        track: 'The service is available, but access and performance remain unknown.'
      }
    },
    {
      id: 'beneficiary-data-match', domain: 'Digital government', title: 'Registry matching',
      lines: {
        check: 'The match flags exclusions, but linkage rules and false-match rates are undocumented.',
        connect: 'Potential exclusions are validated in aggregate, but local reasons and affected groups remain unclear.',
        commit: 'Partners understand the gap, but no lawful referral process, owner, safeguard, or review point exists.',
        track: 'Protected referrals have begun, but successful access, errors, and correction requests remain unreviewed.'
      },
      cues: {
        check: 'Method, accuracy, and safeguards are not yet verified.',
        connect: 'The credible aggregate pattern still needs contextual interpretation.',
        commit: 'Insight has not become an accountable privacy-preserving response.',
        track: 'Referrals are active, but outcomes, harms, and remedy remain unknown.'
      }
    },
    {
      id: 'emergency-work-wages', domain: 'Labor', title: 'Emergency employment',
      lines: {
        check: 'The report shows timely payment, but payroll dates and worker acknowledgments disagree.',
        connect: 'Payment delays are confirmed, but differences by municipality and payout channel remain unexplained.',
        commit: 'Workers identify validation bottlenecks, but no revised workflow, owner, or service standard exists.',
        track: 'A revised payout workflow is active, but timeliness and failed transactions remain unreviewed.'
      },
      cues: {
        check: 'Payment evidence conflicts and must be verified.',
        connect: 'The delay is real, but process and access context are missing.',
        commit: 'A shared diagnosis lacks accountable process change.',
        track: 'The workflow is active, but performance across channels remains unknown.'
      }
    },
    {
      id: 'livelihood-grant-survival', domain: 'Livelihood', title: 'Livelihood sustainability',
      lines: {
        check: 'Reports show all enterprises operating, but visits covered only easily reached participants.',
        connect: 'Operating status is verified, but income stability differs by market access and care responsibilities.',
        commit: 'Participants identify market barriers, but no tailored support, owner, or outcome target exists.',
        track: 'Tailored support is underway, but income, continuity, and workload effects remain unmeasured.'
      },
      cues: {
        check: 'Coverage and selection bias make the success claim uncertain.',
        connect: 'The outcome is credible, but its differences need interpretation.',
        commit: 'Shared findings lack a feasible accountable response.',
        track: 'Support is active, but sustainability and unintended burdens remain unknown.'
      }
    },
    {
      id: 'gad-livelihood-outcomes', domain: 'Gender and development', title: 'Enterprise support outcomes',
      lines: {
        check: 'The report shows equal reach, but participant records are incomplete and inconsistently disaggregated.',
        connect: 'Participation is validated, but income and decision-making outcomes differ across groups.',
        commit: 'Participants explain the gaps, but no redesigned support, owner, indicator, or review date exists.',
        track: 'Redesigned support is running, but income, control, safety, and workload outcomes remain unreviewed.'
      },
      cues: {
        check: 'The evidence needed for gender analysis is incomplete.',
        connect: 'Verified outputs still need interpretation of gendered outcomes and constraints.',
        commit: 'The gender analysis has not become an accountable adjustment.',
        track: 'The redesign is active, but meaningful results and unintended effects remain unknown.'
      }
    },
    {
      id: 'pwd-assistive-services', domain: 'Disability inclusion', title: 'Assistive service referrals',
      lines: {
        check: 'The registry shows high referral completion, but completion codes lack provider confirmation.',
        connect: 'Completed referrals are confirmed, but rural clients experience longer pathways for unknown reasons.',
        commit: 'Clients identify referral handoff gaps, but no accessible protocol, owner, or standard exists.',
        track: 'A new handoff protocol is active, but completion time and user experience remain unmeasured.'
      },
      cues: {
        check: 'The meaning of completion is not yet verified.',
        connect: 'The disparity is real, but access context is missing.',
        commit: 'Shared understanding lacks an accessible accountable process.',
        track: 'The protocol is active, but access and service quality remain unknown.'
      }
    },
    {
      id: 'ancestral-domain-project', domain: 'Indigenous Peoples', title: 'Watershed monitoring',
      lines: {
        check: 'A project map suggests overlap, but coordinates and boundary sources remain unvalidated.',
        connect: 'The overlap is confirmed, but customary use and community monitoring priorities remain unexplored.',
        commit: 'Partners agree to co-design monitoring, but no protocol, custodian, safeguard, or review date exists.',
        track: 'Joint monitoring has begun, but participation, data use, and community-defined outcomes remain unreviewed.'
      },
      cues: {
        check: 'Location evidence must be verified before proceeding.',
        connect: 'Verified geography still needs interpretation with legitimate community representatives.',
        commit: 'Shared intent lacks an accountable culturally appropriate arrangement.',
        track: 'Joint work is active, but participation and community-defined results remain unknown.'
      }
    },
    {
      id: 'peace-project-use', domain: 'Peace and development', title: 'Community facility use',
      lines: {
        check: 'The report shows full facility use, but logs repeat entries and omit operating days.',
        connect: 'Low use is confirmed, but groups describe different access and scheduling barriers.',
        commit: 'Groups agree on priorities, but no lead, grievance route, or review point exists.',
        track: 'A shared schedule is operating, but equitable use, disputes, and livelihood benefits remain unreviewed.'
      },
      cues: {
        check: 'Utilization evidence is incomplete and unreliable.',
        connect: 'The result is credible, but conflict-sensitive community interpretation is needed.',
        commit: 'Shared understanding lacks transparent ownership and safeguards.',
        track: 'The schedule is active, but outcomes, inclusion, and tensions remain unknown.'
      }
    },
    {
      id: 'local-budget-delivery', domain: 'Public finance', title: 'Development fund delivery',
      lines: {
        check: 'Disbursement is high, but project codes and physical accomplishments do not reconcile.',
        connect: 'Disbursement is validated, but service completion varies by project type and barangay.',
        commit: 'Teams identify the delay, but no corrective owner, milestone, or review date exists.',
        track: 'Corrective milestones are active, but completion, service quality, and barangay equity remain unreviewed.'
      },
      cues: {
        check: 'Financial and physical records conflict and need verification.',
        connect: 'Credible spending totals still need operational and community context.',
        commit: 'The shared diagnosis lacks an accountable delivery decision.',
        track: 'Milestones are active, but usable and equitable services remain unreviewed.'
      }
    },
    {
      id: 'coastal-shelter-repair', domain: 'Housing recovery', title: 'Shelter repair assistance',
      lines: {
        check: 'The tracker shows completed repairs, but inspection dates and household acknowledgments conflict.',
        connect: 'Completed repairs are verified, but coastal households report uneven safety improvements.',
        commit: 'Households identify material gaps, but no correction owner, standard, or deadline exists.',
        track: 'Corrections are underway, but safety, habitability, and repeat damage remain unreviewed.'
      },
      cues: {
        check: 'Completion evidence conflicts and must be verified.',
        connect: 'Verified repairs still need household and location context.',
        commit: 'A shared finding lacks an accountable correction.',
        track: 'Corrections are active, but safety and durability outcomes remain unknown.'
      }
    },
    {
      id: 'youth-job-referrals', domain: 'Youth employment', title: 'Youth job referrals',
      lines: {
        check: 'Referral counts increased, but duplicate profiles and unconfirmed employer matches remain included.',
        connect: 'Valid matches are confirmed, but placement differs by location and training background.',
        commit: 'Youth identify matching barriers, but no revised support, owner, or placement target exists.',
        track: 'Revised matching is active, but placement, retention, and participant experience remain unreviewed.'
      },
      cues: {
        check: 'Duplicate and unconfirmed records make the result uncertain.',
        connect: 'The outcome is credible, but differences need participant and employer context.',
        commit: 'Shared insight lacks a defined accountable response.',
        track: 'The revised process is active, but sustained outcomes remain unknown.'
      }
    }
  ];

  const secondarySignals = {
    check: title => 'A digital summary of ' + title.toLowerCase() + ' conflicts with source records and leaves its denominator undocumented.',
    connect: title => 'The verified ' + title.toLowerCase() + ' pattern differs across groups, but the reasons remain unclear.',
    commit: title => 'A proposed ' + title.toLowerCase() + ' response lacks ownership, safeguards, success measures, and review criteria.',
    track: title => 'A ' + title.toLowerCase() + ' response is underway, but aggregate gains conceal an unreviewed subgroup trade-off.'
  };
  const rationales = {
    check: [
      'Verify definitions, coverage, comparability, and source quality before treating the signal as a finding.',
      'Technology can surface a signal, but people must still test its sources, limits, and uncertainty.'
    ],
    connect: [
      'Combine verified measures with local experience to understand who is affected and why.',
      'Evidence becomes useful when people interpret differences, context, and possible causes together.'
    ],
    commit: [
      'Turn shared understanding into a feasible action with an owner, measure, safeguards, and review point.',
      'Accountability requires a defined response, named lead, success measure, and scheduled review.'
    ],
    track: [
      'Follow implementation and outcomes, examine uneven effects, and adapt the response.',
      'Shared monitoring should surface trade-offs early enough for partners to adjust.'
    ]
  };
  const stageThemes = {
    check: ['shared-mandate', 'technological-innovations'],
    connect: ['local-partners', 'shared-mandate'],
    commit: ['collaborative-action', 'shared-mandate'],
    track: ['collaborative-action', 'technological-innovations']
  };

  const cases = caseSpecs.map(function (spec) {
    const builtStages = {};
    stages.forEach(function (stage) {
      builtStages[stage] = [spec.lines[stage], secondarySignals[stage](spec.title)].map(function (signal, variantIndex) {
        return {
          id: spec.id + '-' + stage + '-' + (variantIndex + 1),
          difficulty: variantIndex + 1,
          signal: signal,
          rationale: rationales[stage][variantIndex],
          cue: spec.cues[stage],
          themeIds: stageThemes[stage].slice(),
          tags: ['official-and-community', stage === 'check' && variantIndex === 1 ? 'ai-assisted' : 'human-led']
        };
      });
    });
    return { id: spec.id, domain: spec.domain, title: spec.title, stages: builtStages };
  });

  const pack = {
    schemaVersion: 1,
    packId: packId,
    name: 'Philippine public-service scenarios',
    description: 'Thirty-two fictional Philippine-context cases for practicing the Forum evidence-to-action loop.',
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

