const paths = {
  eye: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7 M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
  eyeOff:
    "M3 3l18 18 M10.6 5.1L12 5c6.5 0 10 7 10 7a20 20 0 0 1-3.1 4 M6.2 6.2A20 20 0 0 0 2 12s3.5 7 10 7a12 12 0 0 0 5.8-1.5 M9.9 9.9a3 3 0 0 0 4.2 4.2",
  phone:
    "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.2 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.96.35 1.9.69 2.79a2 2 0 0 1-.45 2.11L8.09 9.89a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.89.34 1.83.57 2.79.69A2 2 0 0 1 22 16.92z",
  grid: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
  users:
    "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M16 3a4 4 0 0 1 0 8 M22 21v-2a4 4 0 0 0-3-3.87 M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
  book: "M4 3h7a3 3 0 0 1 3 3v15a4 4 0 0 0-4-2H4z M14 6a3 3 0 0 1 3-3h4v16h-3a4 4 0 0 0-4 2",
  school: "M3 10l9-7 9 7v11H3z M9 21v-7h6v7 M7 11h.01 M17 11h.01",
  file: "M14 2H6v20h12V6z M14 2v5h5 M8 12h6 M8 16h6",
  chart: "M4 20V10 M10 20V4 M16 20v-8 M22 20H2",
  settings:
    "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M9 3l1-1h4l1 3 3 1 3-1 2 4-2 2v3l2 2-2 4-3-1-3 1-1 3h-4l-1-3-3-1-3 1-2-4 2-2v-3L1 8l2-4 3 1z",
  calendar: "M4 5h16v16H4z M4 10h16 M8 2v6 M16 2v6",
  arrow: "M5 12h14 M13 6l6 6-6 6",
  chevron: "M9 5l7 7-7 7",
  plus: "M12 5v14 M5 12h14",
  search: "M21 21l-5-5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0",
  bell: "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9 M10 21h4",
  upload: "M12 16V3 M7 8l5-5 5 5 M3 15v6h18v-6",
  download: "M12 3v13 M7 11l5 5 5-5 M3 17v4h18v-4",
  check: "M5 12l4 4L19 6",
  clock: "M12 8v5l3 2 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0",
  help: "M9 9a3 3 0 1 1 5 2c-2 1-2 2-2 3 M12 18h.01 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0",
  logout: "M9 3H3v18h6 M10 12h11 M17 8l4 4-4 4",
  menu: "M3 6h18 M3 12h18 M3 18h18",
  shield: "M12 3l8 3v6c0 5-8 9-8 9s-8-4-8-9V6z M8 12l3 3 5-6",
  mail: "M3 5h18v14H3z M3 5l9 8 9-8",
  spark: "M12 3l2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z",
  sun: "M12 3v2.5 M12 18.5V21 M4.93 4.93l1.77 1.77 M17.3 17.3l1.77 1.77 M3 12h2.5 M18.5 12H21 M4.93 19.07l1.77-1.77 M17.3 6.7l1.77-1.77 M12 7.5a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9Z",
  moon: "M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79Z",
};
export function Icon(name, className = "") {
  return `<svg class="icon ${className}" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name] || paths.file}"/></svg>`;
}
