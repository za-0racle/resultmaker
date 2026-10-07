import { state, persist } from "../app/state.js";
import { context } from "../app/context.js";
export const schoolService = {
  async getSchools() {
    return structuredClone(state.schools);
  },
  async getSchoolById(id) {
    return structuredClone(state.schools.find((s) => s.id === id) ?? null);
  },
  async updateSchool(id, data) {
    const row = state.schools.find((s) => s.id === id);
    if (!row) throw new Error("School not found");
    const { id: ignored, ...patch } = data;
    Object.assign(row, patch);
    if (context.school?.id === id) Object.assign(context.school, patch);
    persist();
    return structuredClone(row);
  },
};
