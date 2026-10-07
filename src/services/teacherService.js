import { repository } from "./mockRepository.js";
const repo = repository("teachers");
export const teacherService = {
  getTeachers: repo.list,
  getTeacherById: repo.getById,
  createTeacher: repo.create,
  updateTeacher: repo.update,
};
