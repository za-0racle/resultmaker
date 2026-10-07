const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
export const school = {
  id: id(1),
  name: "Greenfield International School",
  slug: "greenfield",
  motto: "Learning today. Leading tomorrow.",
  address: "24 Adeola Avenue, Lagos, Nigeria",
  email: "office@greenfield.example",
  phone: "+234 800 000 0101",
  website: "greenfield.example",
  status: "Active",
  plan: "Professional",
};
export const academicSession = {
  id: id(2),
  schoolId: school.id,
  name: "2026/2027",
  status: "Active",
};
export const terms = ["First Term", "Second Term", "Third Term"].map(
  (name, i) => ({
    id: id(3 + i),
    schoolId: school.id,
    name,
    status: i === 0 ? "Active" : "Upcoming",
  }),
);
export const classes = [
  "Primary 4",
  "Primary 5",
  "Primary 6",
  "JSS 1A",
  "JSS 2A",
  "SSS 1A",
].map((name, i) => ({
  id: id(10 + i),
  schoolId: school.id,
  name,
  section: i < 3 ? "Primary" : "Secondary",
  teacherId: id(40 + i),
  status: "Active",
}));
const names = [
  "Amara Okafor",
  "Daniel Adeyemi",
  "Zainab Ibrahim",
  "Samuel Eze",
  "Chiamaka Obi",
  "Tolu Adebayo",
  "Grace Johnson",
  "Ibrahim Musa",
  "Ella Williams",
  "David Nwosu",
  "Fatima Bello",
  "Joshua Akintola",
  "Sofia Okeke",
  "Emmanuel George",
  "Aisha Lawal",
  "Michael Ojo",
  "Olivia Uche",
  "Joseph Balogun",
  "Hannah James",
  "Chinedu Nnamdi",
];
export const students = names.map((name, i) => ({
  id: id(100 + i),
  schoolId: school.id,
  name,
  admissionNumber: `GFI/2026/${String(i + 1).padStart(3, "0")}`,
  gender: i % 2 ? "Male" : "Female",
  classId: classes[i % 6].id,
  status: i === 17 ? "Inactive" : "Active",
  dateOfBirth: `2013-0${(i % 9) + 1}-12`,
  guardian: `${name.split(" ").at(-1)} family`,
  guardianPhone: "+234 800 000 0202",
  joined: "2026-09-14",
}));
export const teachers = [
  "Sarah Williams",
  "James Adebayo",
  "Mary Okafor",
  "Abdul Ibrahim",
  "Esther George",
  "Peter Obi",
  "Rachel Musa",
  "John Eze",
  "Anne Balogun",
  "David Lawal",
].map((name, i) => ({
  id: id(40 + i),
  schoolId: school.id,
  name,
  email: `${name.toLowerCase().replaceAll(" ", ".")}@greenfield.example`,
  phone: `+234 800 000 ${String(300 + i)}`,
  employeeId: `GFI/T/${String(i + 1).padStart(3, "0")}`,
  role: i === 9 ? "School Admin" : i < 6 ? "Class Teacher" : "Subject Teacher",
  classIds: [classes[i % 6].id],
  subjectIds: [id(60 + i)],
  status: "Active",
}));
export const subjects = [
  "Mathematics",
  "English Studies",
  "Basic Science",
  "Computer Studies",
  "Physics",
  "Chemistry",
  "Biology",
  "Economics",
  "Social Studies",
  "Civic Education",
].map((name, i) => ({
  id: id(60 + i),
  schoolId: school.id,
  name,
  code: ["MTH", "ENG", "BSC", "CMP", "PHY", "CHM", "BIO", "ECO", "SOC", "CIV"][
    i
  ],
  section: i >= 4 && i <= 7 ? "Secondary" : "All sections",
  classIds: i >= 4 && i <= 7 ? [classes[5].id] : classes.map((c) => c.id),
  teacherId: teachers[i].id,
  status: "Active",
}));
export const results = classes.flatMap((c, i) =>
  subjects.slice(0, 3).map((s, j) => ({
    id: id(200 + i * 3 + j),
    schoolId: school.id,
    classId: c.id,
    subjectId: s.id,
    teacherId: teachers[(i + j) % 10].id,
    sessionId: academicSession.id,
    termId: terms[0].id,
    status: ["Published", "Approved", "Submitted", "Under Review", "Draft"][
      (i + j) % 5
    ],
    completion: [100, 100, 100, 85, 60][(i + j) % 5],
    scores: Object.fromEntries(
      students
        .filter((st) => st.classId === c.id)
        .map((st, k) => [
          st.id,
          { ca1: 7 + (k % 3), ca2: 8, assignment: 9, exam: 45 + (k % 20) },
        ]),
    ),
  })),
);
export const imports = [
  {
    id: id(300),
    schoolId: school.id,
    name: "First term admissions.csv",
    count: 20,
    status: "Completed",
    date: "2026-10-06",
  },
  {
    id: id(301),
    schoolId: school.id,
    name: "Transfer students.xlsx",
    count: 6,
    status: "Preview ready",
    date: "2026-10-05",
  },
];
export const activity = [
  {
    name: "Sarah Williams",
    action: "submitted Mathematics results",
    detail: "JSS 2A · First Term",
    time: "12 minutes ago",
    type: "result",
  },
  {
    name: "School Administrator",
    action: "imported 20 student records",
    detail: "First term admissions.csv",
    time: "48 minutes ago",
    type: "import",
  },
  {
    name: "James Adebayo",
    action: "saved English Studies as a draft",
    detail: "JSS 1A · First Term",
    time: "1 hour ago",
    type: "draft",
  },
  {
    name: "School Administrator",
    action: "approved Basic Science results",
    detail: "Primary 6 · First Term",
    time: "2 hours ago",
    type: "approved",
  },
];
