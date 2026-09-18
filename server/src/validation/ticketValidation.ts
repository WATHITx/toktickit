export type TicketInput = {
  categoryId?: number;
  relatedSystemId?: number;
  summary?: string;
  description?: string;
  requestedPriority?: string;
};

export function validateTicketInput(input: TicketInput): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!input.summary || input.summary.trim().length === 0) {
    errors.summary = "Summary is required";
  } else if (input.summary.trim().length > 150) {
    errors.summary = "Summary must be 150 characters or fewer";
  }

  if (!input.description || input.description.trim().length === 0) {
    errors.description = "Description is required";
  } else if (input.description.trim().length > 2000) {
    errors.description = "Description must be 2000 characters or fewer";
  }

  if (!input.requestedPriority || !["LOW", "MEDIUM", "HIGH"].includes(input.requestedPriority)) {
    errors.requestedPriority = "Requested priority must be LOW, MEDIUM, or HIGH";
  }

  if (!input.categoryId) errors.categoryId = "Category is required";
  if (!input.relatedSystemId) errors.relatedSystemId = "Related system is required";

  return errors;
}