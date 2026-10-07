import { repository } from "./mockRepository.js";
const repo = repository("results");
export const resultService = {
  getResults: repo.list,
  getResultById: repo.getById,
  createResult: repo.create,
  updateResult: repo.update,
};
