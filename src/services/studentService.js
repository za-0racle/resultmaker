import { repository } from "./mockRepository.js";
const repo = repository("students");
export const studentService = {
  getStudents: repo.list,
  getStudentById: repo.getById,
  createStudent: repo.create,
  updateStudent: repo.update,
};
