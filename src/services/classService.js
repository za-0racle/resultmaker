import { repository } from "./mockRepository.js";
const repo = repository("classes");
export const classService = {
  getClasses: repo.list,
  getClassById: repo.getById,
  createClass: repo.create,
  updateClass: repo.update,
};
