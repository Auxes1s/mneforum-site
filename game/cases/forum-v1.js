(function (root) {
  'use strict';

  const packId = 'forum-v1';

  const themes = [
    'shared-mandate',
    'technological-innovations',
    'local-partners',
    'collaborative-action'
  ];
  const stages = ['check', 'connect', 'commit', 'track'];

  const caseSpecs = [
    {
      id: 'clinic-waits', domain: 'Health', title: 'Clinic waiting time',
      evidence: 'official-and-community',
      lines: {
        check: ['Residents report longer clinic waits, but the logbook has gaps.', 'A weekly dashboard shows delays after several records were back-entered.'],
        connect: ['Wait data are verified, but differences by shift and patient group remain unexplained.', 'Records confirm unequal waits; staff and patients have not interpreted the pattern together.'],
        commit: ['Staff and patients understand the bottleneck, but no intake change or owner is agreed.', 'The delay is understood, but options still lack an owner and success measure.'],
        track: ['A new intake step is running, but results have not been compared across shifts.', 'Waiting times improved overall; persistent barriers for one patient group have not been reviewed.']
      }
    },
    {
      id: 'reading-support', domain: 'Education', title: 'Reading support',
      evidence: 'official-and-community',
      lines: {
        check: ['A class summary suggests reading scores fell after tutoring began.', 'Teachers flag a sudden score jump in one grade-level report.'],
        connect: ['Scores are verified, but differences in tutoring access and learner experience remain unexplained.', 'Attendance and reading measures are reliable, but classrooms interpret their mismatch differently.'],
        commit: ['Teachers understand the access gap, but no targeted schedule, owner, or review date is agreed.', 'Families and staff share the diagnosis, but the proposed trial lacks a success measure.'],
        track: ['A tutoring trial is running; attendance rose, but reading gains have not been compared.', 'Early gains faded after tutor coverage changed, and the response has not been adjusted.']
      }
    },
    {
      id: 'evacuation-alerts', domain: 'Disaster response', title: 'Evacuation alerts',
      evidence: 'official-and-community',
      lines: {
        check: ['Several residents say a flood alert arrived after water entered homes.', 'A response log shows fast alerts, but its timestamps share one unusual pattern.'],
        connect: ['Alert times are verified, but differences by location and phone access remain unexplained.', 'The warning was technically timely, but responders do not know why residents misunderstood it.'],
        commit: ['Responders understand the access gap, but no backup alert, responsible unit, or test date is agreed.', 'Partners share the diagnosis, but the draft protocol has no accountable lead or success measure.'],
        track: ['A new alert protocol is being tested, but receipt rates are not reviewed by area.', 'The backup channel failed during a night drill, and no adaptation has been assessed.']
      }
    },
    {
      id: 'crop-advice', domain: 'Agriculture', title: 'Crop advice',
      evidence: 'official-and-community',
      lines: {
        check: ['A model flags crop stress where field reports describe healthy plots.', 'Satellite estimates show a yield dip after several cloudy observations.'],
        connect: ['Crop stress is verified, but differences by irrigation access and tenure remain unexplained.', 'A planting-calendar shift is confirmed, but its local causes have not been interpreted with farmers.'],
        commit: ['Extension workers understand the risk, but no targeted visit plan or owner is agreed.', 'The advice is drafted, but no one owns how uncertainty and safeguards will be communicated.'],
        track: ['New advice is circulating, but use and outcomes have not been compared by farm tenure.', 'Field recovery differs from the model, and the advisory response has not been reassessed.']
      }
    },
    {
      id: 'bus-reliability', domain: 'Transport', title: 'Bus reliability',
      evidence: 'official-and-community',
      lines: {
        check: ['Commuters report missed trips that do not appear in the route summary.', 'A dashboard marks all trips complete despite identical arrival times.'],
        connect: ['Trip delays are verified, but rider experiences at transfer points remain unexplained.', 'Travel time improved overall, but the team has not interpreted conflicting accessibility feedback.'],
        commit: ['Operators understand the transfer problem, but no trial, owner, or review date is agreed.', 'Partners support a timetable change, but its success measure and accountable lead are missing.'],
        track: ['A timetable trial is running; missed evening connections have not been reviewed.', 'The trial reduced delay but created crowding, and no adjustment has been tested.']
      }
    },
    {
      id: 'benefit-access', domain: 'Social protection', title: 'Benefit access',
      evidence: 'official-and-community',
      lines: {
        check: ['A registry shows full coverage while help desks report many exclusions.', 'Applications appear to fall just after a form was moved online.'],
        connect: ['Exclusions are verified, but barriers facing remote households remain unexplained.', 'Completion rates are reliable, but applicants and staff have not interpreted the document barrier together.'],
        commit: ['Staff understand the access barrier, but no assisted channel, owner, or review point is agreed.', 'Partners share the diagnosis, but the outreach and referral path remain undefined.'],
        track: ['An assisted channel is operating, but repeat visits by document type are not reviewed.', 'Outreach expanded while processing slowed, and the trade-off has not been assessed.']
      }
    },
    {
      id: 'river-quality', domain: 'Environment', title: 'River quality',
      evidence: 'official-and-community',
      lines: {
        check: ['Residents report a river odor after sensors show normal readings.', 'One station shows a sudden improvement during a known maintenance gap.'],
        connect: ['Pollution readings are verified, but the short downstream pattern remains unexplained.', 'Official averages are reliable, but fishing households interpret downstream conditions differently.'],
        commit: ['Partners understand the sampling gap, but no lead unit or response trigger is agreed.', 'A monitoring expansion is proposed without an owner, decision rule, or review date.'],
        track: ['Targeted sampling is underway, but downstream complaints are not reviewed with new results.', 'Water indicators improved while catches did not, and the response has not been adapted.']
      }
    },
    {
      id: 'permit-service', domain: 'Local services', title: 'Permit processing',
      evidence: 'official-and-community',
      lines: {
        check: ['A portal reports faster permits while applicants describe repeat visits.', 'Completion time drops after unresolved applications disappear from the total.'],
        connect: ['Repeat visits are verified, but the hidden document loop remains unexplained.', 'Service times improved overall, but staff have not interpreted the small-business bottleneck with applicants.'],
        commit: ['The office understands the document loop, but no checklist trial, owner, or review date is agreed.', 'Partners support a digital fix, but its success measure and safeguards remain undefined.'],
        track: ['A checklist trial is running, but repeat visits by permit type are not reviewed.', 'The checklist slowed technical permits, and no adjustment has been assessed.']
      }
    }
  ];

  const rationales = {
    check: [
      'Verify definitions, coverage, and source quality before treating a signal as a finding.',
      'A responsible first move tests the signal and documents uncertainty before interpretation.',
      'Technology can surface a signal, but people must still verify its sources, limits, and uncertainty.'
    ],
    connect: [
      'Combine verified measures with lived experience to understand who is affected and why.',
      'Evidence becomes useful when people can interpret differences, context, and possible causes together.',
      'Local partners help explain uneven patterns and reveal context that an overall measure cannot show.'
    ],
    commit: [
      'Turn shared understanding into a specific action with an owner, measure, and review point.',
      'Accountability requires a feasible decision, a named lead, and a clear signal of progress.',
      'Collaborative action needs clear ownership, safeguards, success measures, and a scheduled review.'
    ],
    track: [
      'Follow implementation and outcomes, look for uneven effects, then adapt the response.',
      'Measuring results shows whether the response worked for different groups and what needs adjustment.',
      'Shared monitoring should surface trade-offs early enough for partners to adjust the response.'
    ]
  };

  const advancedSignals = {
    check: title => 'An automated summary of ' + title.toLowerCase() + ' conflicts with source records and omits uncertainty.',
    connect: title => 'The verified ' + title.toLowerCase() + ' pattern differs across groups, but the reasons remain unclear.',
    commit: title => 'A proposed ' + title.toLowerCase() + ' response lacks clear ownership, safeguards, success measures, and review criteria.',
    track: title => 'A ' + title.toLowerCase() + ' response is underway, but one subgroup shows an unreviewed trade-off.'
  };
  const stageCues = {
    check: 'The signal conflicts with another source or still has a data-quality gap.',
    connect: 'The pattern is verified, but who is affected, why, or how people understand it is still unclear.',
    commit: 'The issue is understood, but the action, owner, measure, or review point is still missing.',
    track: 'An action is already underway, so its results, uneven effects, and need for adaptation must be reviewed.'
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
      const signals = spec.lines[stage].concat(advancedSignals[stage](spec.title));
      builtStages[stage] = signals.map(function (signal, variantIndex) {
        return {
          id: spec.id + '-' + stage + '-' + (variantIndex + 1),
          difficulty: variantIndex + 1,
          signal: signal,
          rationale: rationales[stage][variantIndex],
          cue: stageCues[stage],
          themeIds: stageThemes[stage].slice(),
          tags: [spec.evidence, stage === 'check' && variantIndex === 2 ? 'ai-assisted' : 'human-led']
        };
      });
    });
    return { id: spec.id, domain: spec.domain, title: spec.title, stages: builtStages };
  });

  const pack = {
    schemaVersion: 1,
    packId: packId,
    name: '13th Forum practice cases',
    description: 'Eight fictional public-service cases grounded in the Forum concept-note themes.',
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
