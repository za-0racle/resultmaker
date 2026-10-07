import { repository } from "./mockRepository.js";
const repo = repository("imports");
export const importService = {
  getImports: repo.list,
  async simulateImport(name, count) {
    return repo.create({
      name,
      count,
      status: "Completed",
      date: new Date().toISOString().slice(0, 10),
      simulated: true,
    });
  },
};
