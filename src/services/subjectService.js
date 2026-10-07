import { repository } from "./mockRepository.js";
const repo = repository("subjects");
export const subjectService = {
  getSubjects: repo.list,
  getSubjectById: repo.getById,
  createSubject: repo.create,
  updateSubject: repo.update,
};
