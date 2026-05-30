import { format, parseISO } from "date-fns";

export const formatDate = (date: string | Date | undefined, formatStr: string = "PPP") => {
  if (!date) return "";
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, formatStr);
};

export const getCurrentMonthYear = () => {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
};