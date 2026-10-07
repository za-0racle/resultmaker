export const Card = (content, className = "") =>
  `<section class="card ${className}">${content}</section>`;
export const CardHeader = (title, action = "") =>
  `<div class="card-header"><h2>${title}</h2>${action}</div>`;
