import * as mock from "../data/mockData.js";
const clone = (value) => structuredClone(value);
const seed = () => ({
  schools: [clone(mock.school)],
  students: clone(mock.students),
  teachers: clone(mock.teachers),
  classes: clone(mock.classes),
  subjects: clone(mock.subjects),
  results: clone(mock.results),
  imports: clone(mock.imports),
  sessions: [clone(mock.academicSession)],
  terms: clone(mock.terms),
  comments: {},
});
let saved;
try {
  saved = JSON.parse(localStorage.getItem("resultmaker-prototype-v1"));
} catch {
  saved = null;
}
export const state = saved?.version === 1 && saved.data ? saved.data : seed();
export function persist() {
  try {
    localStorage.setItem(
      "resultmaker-prototype-v1",
      JSON.stringify({ version: 1, data: state }),
    );
  } catch {
    /* Prototype still works when storage is unavailable. */
  }
}
export function resetState() {
  Object.assign(state, seed());
  persist();
}
