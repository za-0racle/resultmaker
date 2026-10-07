import { state, persist } from "../app/state.js";
import { context } from "../app/context.js";
import { uid } from "../utils/helpers.js";
export function repository(collection) {
  const records = () =>
    state[collection].filter((row) => row.schoolId === context.school?.id);
  return {
    async list() {
      return structuredClone(records());
    },
    async getById(id) {
      return structuredClone(records().find((row) => row.id === id) ?? null);
    },
    async create(data) {
      const row = { ...data, id: uid(), schoolId: context.school.id };
      state[collection].push(row);
      persist();
      return structuredClone(row);
    },
    async update(id, data) {
      const row = records().find((row) => row.id === id);
      if (!row) throw new Error("Record not found in this workspace.");
      const { id: ignoredId, schoolId: ignoredSchool, ...patch } = data;
      Object.assign(row, patch);
      persist();
      return structuredClone(row);
    },
  };
}
