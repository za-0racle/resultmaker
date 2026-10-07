export function validateStudent(data) {
  const errors = [];
  if (!data.name?.trim()) errors.push("Student name is required.");
  if (!data.admissionNumber?.trim())
    errors.push("Admission number is required.");
  if (!data.classId) errors.push("Choose a class.");
  return errors;
}
export const validScore = (value, max) =>
  value !== "" &&
  Number.isInteger(Number(value)) &&
  Number(value) >= 0 &&
  Number(value) <= max;
