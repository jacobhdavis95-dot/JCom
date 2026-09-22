export const STATUS = ["Open", "Scheduled", "Corrected", "Verified"];
export const PRIORITIES = ["Standard", "Priority", "Hold point"];

export function createId(prefix = "item") {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function nextPunchNumber(items = []) {
  const max = items.reduce((value, item) => {
    const number = Number(String(item.number || "").replace(/\D/g, ""));
    return Math.max(value, Number.isFinite(number) ? number : 0);
  }, 0);
  return `P-${String(max + 1).padStart(3, "0")}`;
}

export function progress(items = []) {
  if (!items.length) return 0;
  const completed = items.filter((item) => item.status === "Verified").length;
  return Math.round((completed / items.length) * 100);
}

export function openCount(items = []) {
  return items.filter((item) => !["Corrected", "Verified"].includes(item.status)).length;
}

export function formatDate(value) {
  if (!value) return "—";
  const date = new Date(`${value}T12:00:00`);
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

export function filterPunches(items, query = "", status = "All") {
  const needle = query.trim().toLowerCase();
  return items.filter((item) => {
    const matchesStatus = status === "All" || item.status === status;
    const haystack = [item.number, item.title, item.location, item.trade, item.notes].join(" ").toLowerCase();
    return matchesStatus && (!needle || haystack.includes(needle));
  });
}

export function makePunch(values, items = []) {
  const today = new Date().toISOString().slice(0, 10);
  return {
    id: createId("punch"),
    number: nextPunchNumber(items),
    title: values.title?.trim() || "Untitled punch item",
    location: values.location?.trim() || "Location not specified",
    trade: values.trade || "Framing",
    priority: values.priority || "Standard",
    status: values.status || "Open",
    due: values.due || "",
    reference: values.reference?.trim() || "",
    notes: values.notes?.trim() || "",
    source: values.source || "PM created",
    createdAt: today,
    createdBy: values.createdBy || "Project Manager",
    photo: values.photo || ""
  };
}
