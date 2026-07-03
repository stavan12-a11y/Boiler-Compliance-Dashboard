import type { Boiler, Inspection } from "../types";
import { WORKFLOW_STEPS } from "../types";

const DAY = 1000 * 60 * 60 * 24;

function iso(daysAgo: number, hour = 9): string {
  const d = new Date(Date.now() - daysAgo * DAY);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

function dateOnly(daysAgo: number): string {
  return new Date(Date.now() - daysAgo * DAY).toISOString().slice(0, 10);
}

function completedSteps(
  startDaysAgo: number,
  notes: Partial<Record<string, string>> = {}
): Inspection["steps"] {
  return WORKFLOW_STEPS.map((s, i) => ({
    key: s.key,
    label: s.label,
    completed: true,
    completedAt: iso(startDaysAgo - i, 10 + i),
    notes: notes[s.key] ?? "",
  }));
}

function partialSteps(
  completedCount: number,
  startDaysAgo: number,
  notes: Partial<Record<string, string>> = {}
): Inspection["steps"] {
  return WORKFLOW_STEPS.map((s, i) => ({
    key: s.key,
    label: s.label,
    completed: i < completedCount,
    completedAt: i < completedCount ? iso(startDaysAgo - i, 10 + i) : null,
    notes: i < completedCount ? notes[s.key] ?? "" : "",
  }));
}

export function createDemoBoilers(): Boiler[] {
  return [
    // GREEN — passed & complete (archived), with prior history
    {
      id: "blr_riverside_a1",
      name: "Riverside A1",
      type: "Water-tube",
      capacity: "8,500 kg/h",
      stampedMawp: "261 psi",
      manufacturer: "Cleaver-Brooks",
      installDate: "2016-04-12",
      location: "Riverside Plant — Hall A",
      texasBoilerNumber: "TX-4821",
      nationalBoardNumber: "NB-12458",
      inspectionIntervalYears: 1,
      activeInspection: null,
      history: [
        {
          id: "insp_riverside_current",
          date: dateOnly(12),
          startedAt: iso(12, 8),
          completedAt: iso(8, 16),
          notes: "Annual statutory inspection. All readings within tolerance.",
          result: "pass",
          steps: completedSteps(12, {
            inspection: "Visual and ultrasonic shell inspection passed.",
            invoice: "Inspector invoice #INV-4821 received and approved.",
            po: "PO #PO-2026-114 raised for certification body.",
            certificate_received:
              "Certificate #RA1-2026-04 received from M. Doyle.",
            certificate_installed:
              "Certificate filed and posted on the boiler house board.",
          }),
          repairs: [],
          status: "completed",
        },
        {
          id: "insp_riverside_prev",
          date: dateOnly(380),
          startedAt: iso(380, 8),
          completedAt: iso(376, 15),
          notes: "Previous annual inspection.",
          result: "pass",
          steps: completedSteps(380),
          repairs: [],
          status: "completed",
        },
      ],
    },

    // AMBER — inspection underway (workflow in progress)
    {
      id: "blr_north_dock_2",
      name: "North Dock 2",
      type: "Fire-tube",
      capacity: "4,200 kg/h",
      stampedMawp: "174 psi",
      manufacturer: "Fulton",
      installDate: "2019-09-01",
      location: "North Dock — Boiler House 2",
      texasBoilerNumber: "TX-5102",
      nationalBoardNumber: "NB-18903",
      inspectionIntervalYears: 1,
      activeInspection: {
        id: "insp_northdock_active",
        date: dateOnly(3),
        startedAt: iso(3, 9),
        completedAt: null,
        notes: "Routine annual inspection in progress.",
        result: "pass",
        steps: partialSteps(2, 3, {
          inspection: "Shell, tubes and mountings inspected — no defects.",
          invoice: "Inspection invoice received, awaiting PO.",
        }),
        repairs: [],
        status: "in-progress",
      },
      history: [],
    },

    // RED — failed, needs repairs
    {
      id: "blr_west_annex_5",
      name: "West Annex 5",
      type: "Condensing",
      capacity: "1,100 kW",
      stampedMawp: "87 psi",
      manufacturer: "Viessmann",
      installDate: "2021-02-20",
      location: "West Annex — Mechanical Room",
      texasBoilerNumber: "TX-6347",
      nationalBoardNumber: "NB-22104",
      inspectionIntervalYears: 0.5,
      activeInspection: {
        id: "insp_westannex_failed",
        date: dateOnly(5),
        startedAt: iso(5, 9),
        completedAt: null,
        notes:
          "Failed: relief valve lifting below set pressure and a weeping flange on the return header.",
        result: "fail",
        steps: [],
        repairs: [
          {
            id: "rep_west_1",
            loggedAt: iso(4, 11),
            description: "Replaced pressure relief valve (set 6 bar) and re-sealed.",
          },
          {
            id: "rep_west_2",
            loggedAt: iso(2, 14),
            description: "Renewed return header flange gasket; torqued to spec.",
          },
        ],
        status: "in-progress",
      },
      history: [
        {
          id: "insp_west_prev",
          date: dateOnly(190),
          startedAt: iso(190, 9),
          completedAt: iso(189, 13),
          notes: "Six-month inspection.",
          result: "pass",
          steps: completedSteps(190),
          repairs: [],
          status: "completed",
        },
      ],
    },

    // GRAY — no inspection started yet, and OVERDUE
    {
      id: "blr_south_yard_7",
      name: "South Yard 7",
      type: "Fire-tube",
      capacity: "2,800 kg/h",
      stampedMawp: "145 psi",
      manufacturer: "Hurst",
      installDate: dateOnly(500),
      location: "South Yard — Skid 7",
      texasBoilerNumber: "TX-2901",
      nationalBoardNumber: "NB-9876",
      inspectionIntervalYears: 1,
      activeInspection: null,
      history: [],
    },

    // GRAY — no inspection, DUE SOON
    {
      id: "blr_lab_unit_3",
      name: "Lab Unit 3",
      type: "Electric",
      capacity: "350 kW",
      stampedMawp: "58 psi",
      manufacturer: "Chromalox",
      installDate: dateOnly(345),
      location: "R&D Building — Sub-basement",
      texasBoilerNumber: "TX-7712",
      nationalBoardNumber: "NB-30211",
      inspectionIntervalYears: 1,
      activeInspection: null,
      history: [],
    },

    // GREEN — completed (archived), due soon for next round
    {
      id: "blr_central_steam_1",
      name: "Central Steam 1",
      type: "Water-tube",
      capacity: "12,000 kg/h",
      stampedMawp: "319 psi",
      manufacturer: "Babcock",
      installDate: "2014-07-30",
      location: "Central Energy Centre — Hall 1",
      texasBoilerNumber: "TX-1184",
      nationalBoardNumber: "NB-5620",
      inspectionIntervalYears: 1,
      activeInspection: null,
      history: [
        {
          id: "insp_central_current",
          date: dateOnly(345),
          startedAt: iso(345, 8),
          completedAt: iso(341, 17),
          notes: "Annual inspection — boiler in excellent condition.",
          result: "pass",
          steps: completedSteps(345, {
            certificate_received: "Certificate #CS1-2025 received.",
            certificate_installed: "Certificate installed and logged.",
          }),
          repairs: [],
          status: "completed",
        },
        {
          id: "insp_central_h1",
          date: dateOnly(715),
          startedAt: iso(715, 8),
          completedAt: iso(710, 16),
          notes: "Prior annual inspection.",
          result: "pass",
          steps: completedSteps(715),
          repairs: [],
          status: "completed",
        },
        {
          id: "insp_central_h2",
          date: dateOnly(1080),
          startedAt: iso(1080, 8),
          completedAt: iso(1074, 12),
          notes: "Inspection after minor economizer repair.",
          result: "fail",
          steps: [],
          repairs: [
            {
              id: "rep_central_h2_1",
              loggedAt: iso(1078, 10),
              description: "Replaced corroded economizer tube section.",
            },
          ],
          status: "completed",
        },
      ],
    },
  ];
}
