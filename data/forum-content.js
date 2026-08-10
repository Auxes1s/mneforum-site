export const SUBTHEMES = [
  {
    no: "01",
    color: "cerulean",
    title: "AI-Enabled M&E Systems and International Practices",
    body: "How development partners, international organizations, and other governments use AI in M&E — and the policy, governance, institutional, and capability lessons relevant to Philippine public agencies."
  },
  {
    no: "02",
    color: "royal",
    title: "AI in Government Monitoring",
    body: "Philippine use cases in field data collection, automated processing, analysis, visualization, and timely reporting that support program and project decisions."
  },
  {
    no: "03",
    color: "sun",
    title: "AI in Evaluation",
    body: "Current and emerging applications across the evaluation cycle, including data collection, qualitative coding, evidence synthesis, causal analysis, impact estimation, and communication of findings."
  },
  {
    no: "04",
    color: "berry",
    title: "Responsible Use of AI in M&E",
    body: "Governance, ethics, data privacy, transparency, accountability, human review, algorithmic bias, reliability, and safeguards that keep public evidence trustworthy."
  }
];

export const PROGRAM = [
  { time: "7:30", title: "Registration", tag: "Logistics", kind: "plain" },
  { time: "8:00", title: "Opening Session", tag: "Ceremony", kind: "plain" },
  { time: "8:10", title: "National Anthem", tag: "Ceremony", kind: "plain" },
  {
    time: "8:15",
    title: "Keynote Message",
    tag: "Keynote",
    kind: "session",
    desc: "The keynote message sets the national direction for the responsible use of artificial intelligence in public sector monitoring and evaluation."
  },
  {
    time: "8:35",
    title: "Overview of the 13th M&E Network Forum, House Rules, and Photo Opportunity",
    tag: "Ceremony",
    kind: "plain"
  },
  {
    time: "8:45",
    title: "Plenary 1 — Setting the Chrysalis: AI Readiness and Evidence Gaps in the Public Sector",
    tag: "Plenary",
    kind: "session",
    desc: "International and regional experience in using AI for data collection, evidence synthesis, and program monitoring will be discussed alongside the policy, governance, institutional, and capability gaps relevant to Philippine government agencies. Panel discussion and moderated Q&A."
  },
  { time: "10:15", title: "Morning Snack and Evaluation Gallery Walk", tag: "Break", kind: "plain" },
  {
    time: "10:30",
    title: "Breakout 1 — Unpacking the Cocoon: Practical AI Use Cases in Public Sector Monitoring",
    tag: "Breakout",
    kind: "session",
    desc: "Operational applications of AI in field data collection, automated processing, spatial analysis, visualization, and reporting across local, regional, and national government, with attention to data quality, privacy, reliability, maintenance, staff capability, and human review.",
    tracks: [
      {
        room: "Track A · Hall 1",
        title: "Signals from Antennae: Prototyping Naga City’s AI Planner to Collect Data on Transportation",
        focus: "Prototyping Naga City's AI planner: computer vision and automated capture to model municipal traffic, transit and urban infrastructure.",
        people: ["Dr. Syrus Gomari, Seermo", "Naga City Government", "Moderator: Regional Director Edna Cynthia S. Berces, DEPDev Regional Office V"]
      },
      {
        room: "Track B · Hall 2",
        title: "A Data Path: Tracking Data on Environment, Mobility, and Tourism",
        focus: "Data analytics and sensor fusion tracking environmental impact, pedestrian mobility and tourism capacity in high-density ecosystems.",
        people: ["Baguio City Government", "Analytics and Data Science Lead, Asian Institute of Management (AIM)", "Moderator: Regional Director Apollo Edwin S. Pagano, DEPDev Regional Office Cordillera Administrative Region"]
      },
      {
        room: "Track C · Hall 3",
        title: "Flying from Afar: Advanced Technologies for Monitoring",
        focus: "Earth observation, satellite imagery, computer vision and drone analytics for macro-monitoring of infrastructure, food security and agricultural assets.",
        people: ["Philippine Space Agency (PhilSA)", "Department of Agriculture, Bureau of Agricultural and Fisheries Engineering (DA-BAFE)", "Moderator: DEPDev Infrastructure Staff (IS)"]
      }
    ]
  },
  { time: "11:45", title: "Lunch Break", tag: "Break", kind: "plain" },
  {
    time: "1:00",
    title: "Evaluation Dialogue Session",
    tag: "Dialogue",
    kind: "session",
    desc: "An open-floor exchange between evaluators, commissioning agencies and users of evidence on what is and is not working in the national M&E ecosystem."
  },
  {
    time: "1:45",
    title: "Breakout 2 — Taking Shape: Emerging AI-Enabled Methodologies in Evaluation",
    tag: "Breakout",
    kind: "session",
    desc: "Practical applications of AI across the evaluation cycle, including data collection, qualitative coding, evidence synthesis, causal analysis, impact estimation, and communication of findings, together with methodological validation, data protection, and human judgment.",
    tracks: [
      {
        room: "Track A · Hall 1",
        title: "Laying the Foundation: Processing Qualitative Evidence at Scale",
        focus: "Processing qualitative evidence at scale, and the safeguards qualitative data demands.",
        people: ["Dr. Erika Fille Legara, Education Center for AI Research, DepEd", "PIDS / UP CIDS", "Philippine Statistics Authority (PSA)", "Dr. Christopher Monterola, Asian Institute of Management", "Moderator: DEPDev Monitoring and Evaluation Staff"]
      },
      {
        room: "Track B · Hall 2",
        title: "Unfolding the Wings: Enhancing Causal Inference and Impact Evaluation with Machine Learning",
        focus: "Enhancing causal inference and impact evaluation with machine learning.",
        people: ["Dr. Michael Ralph M. Abrigo, Senior Research Fellow, PIDS", "Dr. Karl Robert L. Jandoc, UP School of Economics", "Dr. Christopher James R. Cabuay, De La Salle University", "Undersecretary Joseph J. Capuno, DEPDev IPG", "Moderator: Dr. Josefina V. Almeda, Executive Director, PSRTI"]
      },
      {
        room: "Track C · Hall 3",
        title: "Taking Flight: Generative AI for Rapid Evidence Synthesis and Communication",
        focus: "Generative AI and NLP for rapid evidence synthesis and policy translation.",
        people: ["UNDP", "ADB", "DEPDev Policy and Planning Group", "Congressional Policy and Budget Research Department (CPBRD)", "Senate Economic Planning Office (SEPO)", "Department of Budget and Management (DBM)", "Moderator: Dr. Aleli Kraft, Professor, UP School of Economics"]
      }
    ]
  },
  {
    time: "3:00",
    title: "Plenary 2 — Blooming Forward: Safeguarding Trust, Integrity, and Governance in AI-Enabled M&E",
    tag: "Plenary",
    kind: "session",
    desc: "Public institutions need clear rules and safeguards for AI-supported M&E. This plenary will address transparency, privacy, fairness, accountability, reliable outputs, documentation, human review, algorithmic bias, and the conditions that enable decision-makers to trust AI-supported evidence."
  },
  { time: "4:00", title: "Forum Awards: People’s Choice Poster Award", tag: "Awards", kind: "plain" },
  { time: "4:30", title: "Closing Message", tag: "Ceremony", kind: "plain" },
  { time: "4:40", title: "Photo Opportunity, Final Reminders, and Same-Day Edit Video Presentation", tag: "Ceremony", kind: "plain" },
  { time: "5:00", title: "Afternoon Snack and Socials", tag: "Break", kind: "plain" }
];

export const SPEAKERS = [
  ["DEPDev Secretary", "Department of Economy, Planning, and Development", "Keynote", "Keynote Message", "plenary"],
  ["Asian Development Bank (ADB)", "Development partner", "Panelist", "Plenary 1", "plenary"],
  ["United Nations Development Programme (UNDP)", "Development partner", "Panelist", "Plenary 1", "plenary"],
  ["World Bank Independent Evaluation Group (WB IEG)", "World Bank", "Panelist", "Plenary 1", "plenary"],
  ["Department of Information and Communications Technology (DICT)", "Government partner", "Panelist", "Plenary 1", "plenary"],
  ["Department of Science and Technology (DOST)", "Government partner", "Panelist", "Plenary 1", "plenary"],
  ["DEPDev Policy and Planning Group (PPG)", "Department of Economy, Planning, and Development", "Panelist", "Plenary 1", "plenary"],
  ["DEPDev Innovation Staff (InnovS)", "Department of Economy, Planning, and Development", "Moderator", "Plenary 1", "plenary"],
  ["Dr. Syrus Gomari", "Seermo", "Presenter", "Breakout 1.1 · Signals from Antennae", "breakout1"],
  ["Naga City Government", "City Planning and Development Office", "Presenter", "Breakout 1.1 · Signals from Antennae", "breakout1"],
  ["Regional Director Edna Cynthia S. Berces", "DEPDev Regional Office V", "Moderator", "Breakout 1.1 · Signals from Antennae", "breakout1"],
  ["Baguio City Government", "City Government of Baguio", "Presenter", "Breakout 1.2 · A Data Path", "breakout1"],
  ["Analytics and Data Science Lead", "Asian Institute of Management (AIM)", "Panelist", "Breakout 1.2 · A Data Path", "breakout1"],
  ["Regional Director Apollo Edwin S. Pagano", "DEPDev Regional Office Cordillera Administrative Region", "Moderator", "Breakout 1.2 · A Data Path", "breakout1"],
  ["Philippine Space Agency (PhilSA)", "Philippine Space Agency", "Presenter", "Breakout 1.3 · Flying from Afar", "breakout1"],
  ["Department of Agriculture, Bureau of Agricultural and Fisheries Engineering (DA-BAFE)", "Department of Agriculture", "Presenter", "Breakout 1.3 · Flying from Afar", "breakout1"],
  ["DEPDev Infrastructure Staff (IS)", "Department of Economy, Planning, and Development", "Moderator", "Breakout 1.3 · Flying from Afar", "breakout1"],
  ["Dr. Erika Fille Legara", "DepEd AI Research Center", "Presenter", "Breakout 2.1 · Laying the Foundation", "breakout2"],
  ["PIDS / UP CIDS", "Panelist / reactor", "Panelist / Reactor", "Breakout 2.1 · Laying the Foundation", "breakout2"],
  ["Philippine Statistics Authority (PSA)", "Panelist / reactor", "Panelist / Reactor", "Breakout 2.1 · Laying the Foundation", "breakout2"],
  ["Dr. Christopher Monterola", "Asian Institute of Management", "Panelist / Reactor", "Breakout 2.1 · Laying the Foundation", "breakout2"],
  ["DEPDev Monitoring and Evaluation Staff", "Department of Economy, Planning, and Development", "Moderator", "Breakout 2.1 · Laying the Foundation", "breakout2"],
  ["Dr. Michael Ralph M. Abrigo", "Philippine Institute for Development Studies (PIDS)", "Presenter", "Breakout 2.2 · Unfolding the Wings", "breakout2"],
  ["Dr. Karl Robert L. Jandoc", "University of the Philippines School of Economics", "Panelist", "Breakout 2.2 · Unfolding the Wings", "breakout2"],
  ["Dr. Christopher James R. Cabuay", "De La Salle University", "Panelist", "Breakout 2.2 · Unfolding the Wings", "breakout2"],
  ["Undersecretary Joseph J. Capuno", "DEPDev Investment Programming Group", "Panelist", "Breakout 2.2 · Unfolding the Wings", "breakout2"],
  ["Dr. Josefina V. Almeda", "PSRTI", "Moderator", "Breakout 2.2 · Unfolding the Wings", "breakout2"],
  ["United Nations Development Programme (UNDP)", "Presenter", "Presenter", "Breakout 2.3 · Taking Flight", "breakout2"],
  ["Asian Development Bank (ADB)", "Presenter", "Presenter", "Breakout 2.3 · Taking Flight", "breakout2"],
  ["DEPDev Policy and Planning Group (PPG)", "Panelist / reactor", "Panelist / Reactor", "Breakout 2.3 · Taking Flight", "breakout2"],
  ["Congressional Policy and Budget Research Department (CPBRD)", "Panelist / reactor", "Panelist / Reactor", "Breakout 2.3 · Taking Flight", "breakout2"],
  ["Senate Economic Planning Office (SEPO)", "Panelist / reactor", "Panelist / Reactor", "Breakout 2.3 · Taking Flight", "breakout2"],
  ["Department of Budget and Management (DBM)", "Panelist / reactor", "Panelist / Reactor", "Breakout 2.3 · Taking Flight", "breakout2"],
  ["Dr. Aleli Kraft", "University of the Philippines School of Economics", "Moderator", "Breakout 2.3 · Taking Flight", "breakout2"],
  ["Department of Budget and Management (DBM)", "Government partner", "Panelist", "Plenary 2", "plenary2"],
  ["Department of Economy, Planning, and Development (DEPDev)", "Government partner", "Panelist", "Plenary 2", "plenary2"],
  ["Department of Labor and Employment (DOLE)", "Service provider", "Panelist", "Plenary 2", "plenary2"],
  ["Department of Health (DOH)", "Service provider", "Panelist", "Plenary 2", "plenary2"],
  ["Department of Social Welfare and Development (DSWD)", "Service provider", "Panelist", "Plenary 2", "plenary2"],
  ["National Privacy Commission (NPC)", "Data privacy and governance", "Panelist", "Plenary 2", "plenary2"],
  ["Undersecretary Joseph J. Capuno", "DEPDev", "Panelist", "Plenary 2", "plenary2"],
  ["Ms. Vivien Suerte-Cortez", "United Nations Development Programme (UNDP)", "Moderator", "Plenary 2", "plenary2"]
].map(([name, org, role, session, group]) => ({ name, org, role, session, group }));

export const TALLY_HOW = [
  {
    no: "01",
    title: "One marker per delegate",
    body: "Participants receive a voting marker at registration and select the evaluation poster that best demonstrates the use of evidence."
  },
  {
    no: "02",
    title: "Vote during the Gallery Walk",
    body: "The Evaluation Gallery presents completed evaluations from DEPDev Monitoring and Evaluation Staff and DEPDev Regional Offices."
  },
  {
    no: "03",
    title: "People’s Choice recognition",
    body: "The highest-rated poster receives the People’s Choice Award during the Forum’s recognition program."
  }
];
