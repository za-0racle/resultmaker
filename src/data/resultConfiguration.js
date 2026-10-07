import { scoreComponents } from "../utils/constants.js";

export const defaultResultConfiguration = {
  reportTitle: "STUDENT PROGRESS REPORT",
  assessments: scoreComponents.map((component) => ({ ...component })),
  affectiveItems: [
    "Punctuality",
    "Attendance",
    "Neatness",
    "Leadership",
    "Politeness",
    "Cooperation",
  ],
  psychomotorItems: [
    "Handwriting",
    "Sports",
    "Practical skills",
    "Craft",
    "Coordination",
  ],
  ratingScale: [
    { value: 5, label: "Excellent" },
    { value: 4, label: "Very good" },
    { value: 3, label: "Good" },
    { value: 2, label: "Developing" },
    { value: 1, label: "Needs support" },
  ],
  sections: {
    gradeKey: true,
    affective: true,
    psychomotor: true,
    attendance: true,
    comments: true,
    signatures: true,
  },
};

export function getResultConfiguration(school) {
  const saved = school.resultConfiguration || {};
  return structuredClone({
    ...defaultResultConfiguration,
    ...saved,
    sections: { ...defaultResultConfiguration.sections, ...saved.sections },
  });
}

export function validateAssessmentComponents(components) {
  if (!components.length) return "Add at least one assessment component.";
  if (
    components.some(
      (c) =>
        !c.label.trim() ||
        !Number.isInteger(c.max) ||
        c.max <= 0 ||
        c.max > 100,
    )
  )
    return "Each component needs a name and a whole-number maximum from 1 to 100.";
  if (
    new Set(components.map((c) => c.label.trim().toLowerCase())).size !==
    components.length
  )
    return "Assessment names must be unique.";
  if (components.reduce((sum, c) => sum + c.max, 0) !== 100)
    return "Assessment maximum scores must add up to 100.";
  return null;
}
