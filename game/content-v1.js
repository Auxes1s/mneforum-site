(function (root) {
  'use strict';

  const themes = [
    'global-frontiers',
    'practical-use-cases',
    'emerging-methodologies',
    'responsible-governance'
  ];
  const stages = ['check', 'connect', 'commit', 'track'];

  const caseSpecs = [
    {
      id: 'clinic-waits', domain: 'Health', title: 'Clinic waiting time',
      evidence: 'official-and-community',
      lines: {
        check: ['Residents report longer clinic waits, but the logbook has gaps.', 'A weekly dashboard shows delays after several records were back-entered.'],
        connect: ['Validated wait data differ sharply by shift and patient group.', 'Interviews explain why the same queue measure feels different to older patients.'],
        commit: ['Staff and patients agree on one feasible change to the intake flow.', 'The team has options, but no named owner or review date yet.'],
        track: ['The new intake step is running; early averages hide peak-hour delays.', 'Waiting time improved overall, while one patient group still reports barriers.']
      }
    },
    {
      id: 'reading-support', domain: 'Education', title: 'Reading support',
      evidence: 'official-and-community',
      lines: {
        check: ['A class summary suggests reading scores fell after tutoring began.', 'Teachers flag a sudden score jump in one grade-level report.'],
        connect: ['Verified scores improve, while learner interviews describe uneven access.', 'Attendance and reading data point in different directions across classrooms.'],
        commit: ['Teachers propose a targeted schedule and a clear person to coordinate it.', 'Families and staff agree on a small trial, but its success measure is vague.'],
        track: ['The trial raised attendance; progress checks show mixed reading gains.', 'Early gains faded after two weeks when tutor coverage changed.']
      }
    },
    {
      id: 'evacuation-alerts', domain: 'Disaster response', title: 'Evacuation alerts',
      evidence: 'official-and-community',
      lines: {
        check: ['Several residents say a flood alert arrived after water entered homes.', 'A response log shows fast alerts, but its timestamps share one unusual pattern.'],
        connect: ['Validated alert times differ by location and phone access.', 'Community accounts reveal why a technically timely warning was not understood.'],
        commit: ['Responders identify an accessible backup alert and a responsible unit.', 'A new alert protocol is drafted without a test date or accountable lead.'],
        track: ['A drill improved receipt rates, but one riverside area remains unreached.', 'The backup channel worked in daylight and failed during a night drill.']
      }
    },
    {
      id: 'crop-advice', domain: 'Agriculture', title: 'Crop advice',
      evidence: 'official-and-community',
      lines: {
        check: ['A model flags crop stress where field reports describe healthy plots.', 'Satellite estimates show a yield dip after several cloudy observations.'],
        connect: ['Ground checks confirm stress only in farms with limited irrigation.', 'Farmers explain a local planting shift missing from the official calendar.'],
        commit: ['Extension workers select a targeted visit plan and a named coordinator.', 'The team agrees to issue advice, but not how uncertainty will be disclosed.'],
        track: ['Advice reached most farms; follow-up shows lower use among tenant farmers.', 'Field checks show recovery, while the model still reports widespread stress.']
      }
    },
    {
      id: 'bus-reliability', domain: 'Transport', title: 'Bus reliability',
      evidence: 'official-and-community',
      lines: {
        check: ['Commuters report missed trips that do not appear in the route summary.', 'A dashboard marks all trips complete despite identical arrival times.'],
        connect: ['Verified trip logs and rider diaries locate delays at two transfer points.', 'Average travel time improves, but accessibility feedback tells another story.'],
        commit: ['Operators choose a transfer-point trial with an owner and end date.', 'A timetable change is approved before anyone defines the result to monitor.'],
        track: ['On-time trips increase; missed connections persist on the evening route.', 'The trial reduces delay but creates crowding at one transfer point.']
      }
    },
    {
      id: 'benefit-access', domain: 'Social protection', title: 'Benefit access',
      evidence: 'official-and-community',
      lines: {
        check: ['A registry shows full coverage while help desks report many exclusions.', 'Applications appear to fall just after a form was moved online.'],
        connect: ['Validated records show exclusions concentrated among remote households.', 'Applicants explain a document barrier hidden by the completion rate.'],
        commit: ['Program staff select an assisted channel and name its accountable owner.', 'Partners support outreach, but the referral path is still undefined.'],
        track: ['Completed applications rise; repeat visits remain high for one document.', 'Outreach reaches more households but processing time begins to increase.']
      }
    },
    {
      id: 'river-quality', domain: 'Environment', title: 'River quality',
      evidence: 'official-and-community',
      lines: {
        check: ['Residents report a river odor after sensors show normal readings.', 'One station shows a sudden improvement during a known maintenance gap.'],
        connect: ['Lab samples and community observations locate a short pollution window.', 'Official averages mask a downstream pattern reported by fishing households.'],
        commit: ['Partners agree on targeted sampling, a lead unit, and a response trigger.', 'A monitoring expansion is proposed without a decision rule for acting.'],
        track: ['New samples detect fewer events, but downstream complaints continue.', 'Water indicators improve while fishers report no change in catch conditions.']
      }
    },
    {
      id: 'permit-service', domain: 'Local services', title: 'Permit processing',
      evidence: 'official-and-community',
      lines: {
        check: ['A portal reports faster permits while applicants describe repeat visits.', 'Completion time drops after unresolved applications disappear from the total.'],
        connect: ['Verified files and applicant journeys reveal a hidden document loop.', 'Service data improve overall, but small businesses face a different bottleneck.'],
        commit: ['The office chooses a checklist trial with an owner and review date.', 'A digital fix is funded before the team agrees on its success measure.'],
        track: ['Repeat visits fall; applicants still struggle with one unclear requirement.', 'The checklist speeds simple cases and slows permits needing technical review.']
      }
    }
  ];

  const rationales = {
    check: [
      'Verify definitions, coverage, and source quality before treating a signal as a finding.',
      'A responsible first move tests the signal and documents uncertainty before interpretation.'
    ],
    connect: [
      'Combine verified measures with lived experience to understand who is affected and why.',
      'Evidence becomes useful when people can interpret differences, context, and possible causes together.'
    ],
    commit: [
      'Turn shared understanding into a specific action with an owner, measure, and review point.',
      'Accountability requires a feasible decision, a named lead, and a clear signal of progress.'
    ],
    track: [
      'Follow implementation and outcomes, look for uneven effects, then adapt the response.',
      'Tracking tests whether action worked for different groups and shows what needs adjustment.'
    ]
  };

  const cases = caseSpecs.map(function (spec, caseIndex) {
    const builtStages = {};
    stages.forEach(function (stage, stageIndex) {
      builtStages[stage] = spec.lines[stage].map(function (signal, variantIndex) {
        const advanced = ((caseIndex + stageIndex) % 2 === 0) ? 3 : 2;
        return {
          id: spec.id + '-' + stage + '-' + (variantIndex + 1),
          difficulty: variantIndex === 0 ? 1 : advanced,
          signal: signal,
          rationale: rationales[stage][variantIndex],
          themeIds: [themes[(caseIndex + stageIndex) % themes.length], themes[(caseIndex + stageIndex + 1) % themes.length]],
          tags: [spec.evidence, caseIndex === 3 && variantIndex === 1 ? 'ai-assisted' : 'human-led']
        };
      });
    });
    return { id: spec.id, domain: spec.domain, title: spec.title, stages: builtStages };
  });

  root.BuzzContent = {
    schemaVersion: 1,
    locale: 'en-PH',
    themeIds: themes,
    cases: cases
  };
}(typeof window !== 'undefined' ? window : globalThis));
