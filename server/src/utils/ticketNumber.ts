export function formatTicketNumber(sequenceValue: number): string {
  const year = new Date().getFullYear();
  return `TKT-${year}-${String(sequenceValue).padStart(6, "0")}`;
}