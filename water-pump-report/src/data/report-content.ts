export type SlideContent = {
  id: string;
  title: string;
  subtitle?: string;
  paragraphs?: string[];
  bulletPoints?: { boldText?: string; text: string }[];
  table?: {
    headers: string[];
    rows: string[][];
  };
};

export const reportSlides: SlideContent[] = [
  {
    id: "slide-1",
    title: "Market Analysis Report: Ireland Water Pump Industry & Opportunities",
    subtitle: "Prepared By Hardik Vyas For Field marshal Pumps",
  },
  {
    id: "slide-2",
    title: "Strategic Entry Point",
    paragraphs: [
      "Ireland serves as a strategic entry point due to its expanding construction sector and agricultural modernisation needs.",
      "To capitalize on the Irish market, FieldMarshal already has aligned product range with the Government of Ireland's 'Project Ireland 2040' and the 2025–2029 Strategic Funding Plans. As of February 2026, Ireland is aggressively funding water infrastructure and green energy transitions.",
      "The following project report outlines the specific government and private market strategies and how FieldMarshal can pivot to meet them."
    ]
  },
  {
    id: "slide-3",
    title: "A. Irish Government Water Policy (2025–2030) - Water Infra Plan",
    paragraphs: [
      "The national water utility, Uisce Éireann, has secured approval for a €16.9 billion Strategic Funding Plan for the 2025–2029 period. This is the largest investment in Irish water history."
    ],
    bulletPoints: [
      { boldText: "Pumping Station Modernization", text: "The plan specifically mandates the upgrade of 118 new and upgraded pumping stations across the country to improve supply resilience and reduce 'lost supply' minutes by 33%." },
      { boldText: "Leakage Reduction", text: "A core pillar is the 'National Leakage Reduction Programme.' This requires high-precision pressure booster systems that can maintain constant pressure while minimizing pipe stress." },
      { boldText: "Wastewater Treatment", text: "The government is upgrading 61 wastewater plants. FieldMarshal’s sewage and dewatering pumps are perfectly suited for these industrial-scale municipal tenders." }
    ]
  },
  {
    id: "slide-4",
    title: "A. Irish Government Energy Policy - Agricultural & Residential",
    subtitle: "TAMS 3 Grant & SEAI Grants 2026",
    bulletPoints: [
      { boldText: "60% Grant Aid (TAMS 3)", text: "Farmers can receive up to 60% reimbursement for installing renewable energy systems, including Solar PV and Solar Water Pumps. Dairy and livestock farms are incentivized to move away from grid-dependent electric pumps." },
      { boldText: "FieldMarshal Opportunity (TAMS 3)", text: "Your range of borehole solar pumps can be marketed directly to Irish farmers as 'TAMS-ready' solutions." },
      { boldText: "Heat Pump Grant Increase (SEAI)", text: "The maximum grant for a Heat Pump system has been raised to €12,500. There is a specific 'High Temperature Heat Pump' pilot program launching in March 2026." },
      { boldText: "FieldMarshal Opportunity (SEAI)", text: "If your heat pumps meet the EcoDesign Directive, you can tap into the massive residential retrofit market." }
    ]
  },
  {
    id: "slide-5",
    title: "B. Action Plan: How Field Marshal Takes Advantage",
    paragraphs: ["To succeed, FieldMarshal should follow this three-pronged strategy:"],
    bulletPoints: [
      { boldText: "Regulatory 'Passporting'", text: "Ireland requires CE Marking and EPREL registration. Strategy: Highlight FieldMarshal's IE4/IE5 motors. The 'Revenue Control 4' mandates 10% utility cost reduction—high efficiency wins tenders." },
      { boldText: "Partner with 'One Stop Shops'", text: "Government-registered companies manage full retrofits. Strategy: Position as the 'Value-for-Money' alternative to German brands for high-volume middle-market capture." },
      { boldText: "Technical Alignment", text: "Irish water has high iron/manganese and coastal salt air. Strategy: Market SS 304/316 Stainless Steel components highlighting 'Corrosion Resistance'." }
    ]
  },
  {
    id: "slide-6",
    title: "C. Farms as an Opportunity - Ireland is 'Best Fit'",
    paragraphs: [
      "Ireland's unique geography and ambitious 2026 agricultural policies make it one of the most lucrative niche markets for submersible borehole pumps. Because Ireland relies heavily on groundwater for its massive dairy and livestock sectors, the demand for reliable, deep-well extraction is permanent."
    ],
    bulletPoints: [
      { boldText: "High Groundwater Dependency", text: "Over 25% of drinking water and the vast majority of private farm water come from boreholes." },
      { boldText: "The 'Dairy Island' Factor", text: "Over 17,000 dairy farms. A cow needs 100L a day. High-pressure submersible pumps are essential to move water from deep wells to distant troughs." },
      { boldText: "Geological Requirements", text: "Limestone or granite terrain requires multistage submersible pumps (FieldMarshal’s specialty) capable of handling varying 'heads' (depths)." }
    ]
  },
  {
    id: "slide-7",
    title: "C. Government Strategy & Farmer Subsidies (2026)",
    paragraphs: [
      "The primary vehicle for farm investment is TAMS 3. Funding is at an all-time high to meet climate goals."
    ],
    bulletPoints: [
      { boldText: "Solar Capital Investment Scheme (SCIS)", text: "60% grant aid, standalone €90,000 ceiling. Young & Women Farmers get priority." },
      { boldText: "Dairy Equipment Scheme", text: "40% grant for water pressure systems. Pumps must meet 2026 Efficiency Standards (FieldMarshal's IE4/IE5 are a perfect fit)." },
      { boldText: "Better Farming for Water (2026 Campaign)", text: "Funding for fencing off watercourses up to 85%. Farmers must then install new boreholes for cattle, driving massive pump sales across 8 major River Catchments." }
    ]
  },
  {
    id: "slide-8",
    title: "Summary of Grant Benefits",
    table: {
      headers: ["Scheme", "Grant Rate", "Maximum Investment", "FieldMarshal Product"],
      rows: [
        ["Solar SCIS", "60%", "€90,000", "Solar Submersible Pumps"],
        ["Dairy Scheme", "40%", "€90,000", "Pressure Booster Systems"],
        ["Young Farmer", "60%", "€90,000", "All Borehole Pumps"],
        ["Water Quality EIP", "Up to 85%", "Varies", "Small Borehole/Well Pumps"]
      ]
    }
  },
  {
    id: "slide-9",
    title: "D. FieldMarshal Advantage",
    paragraphs: [
      "FieldMarshal already manages the product portfolio that is the best fit for European as well as the Irish market, offering a 'Grant-Ready' Product Package:"
    ],
    bulletPoints: [
      { boldText: "1. TAMS-Compliant Inverters", text: "FieldMarshal solar pumps come with smart inverters that can be easily integrated into the Irish farm grid or off-grid systems." },
      { boldText: "2. Efficiency Certification", text: "Providing clear documentation for European EcoDesign Directive compliance allows farmers to easily claim 60% grants." },
      { boldText: "3. The 'Hard Water' Spec", text: "Market pumps with 'Sand-Resistant' impellers and SS316 Stainless Steel bodies designed for the 'Irish Borehole Environment' to handle high lime content." }
    ]
  },
  {
    id: "slide-10",
    title: "Market Value & Revenue Potential",
    paragraphs: [
      "The Irish water pump market is currently experiencing a 'Super-Cycle' due to the €16.9 Billion Uisce Éireann Investment Plan. A joint FieldMarshal-Irish entity can target the following revenue within 3 years (20-25% CAGR growth potential):"
    ],
    table: {
      headers: ["Market Segment", "Estimated Annual Irish Market Size", "Targeted Market Share (Year 3)", "Annual Revenue Potential"],
      rows: [
        ["Municipal & Infrastructure", "€220 Million", "8%", "€17.6 Million"],
        ["Agricultural (Solar/Borehole)", "€140 Million", "12%", "€16.8 Million"],
        ["Residential (Booster/Heat Pumps)", "€110 Million", "10%", "€11 Million"],
        ["Industrial & Dewatering", "€80 Million", "15%", "€12 Million"],
        ["TOTAL ESTIMATES (3 YEARS)", "€550 Million", "~11.25%", "~ €60 Million"]
      ]
    }
  }
];
