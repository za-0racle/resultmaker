export const formatNumber = (value) =>
  new Intl.NumberFormat("en-NG").format(value);
export const formatDate = (value) =>
  new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
export function gradeScore(total, rules) {
  return (
    rules.find((rule) => total >= rule.min && total <= rule.max) ?? {
      grade: "—",
      remark: "Unmapped score",
    }
  );
}
