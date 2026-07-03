// src/lib/utils.ts

export const formatCurrency = (amount: number, currency: string) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount)

export const formatDate = (dateStr?: string) => {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return isNaN(d.getTime()) ? '—' : new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(d)
}

// Extract a readable error message from an API error.
// Handles Pydantic 422 responses where `detail` is an array of validation objects,
// as well as plain string detail messages and generic JS Error messages.
export const getApiError = (err: any, fallback = 'Something went wrong'): string => {
  const detail = err?.response?.data?.detail
  if (Array.isArray(detail)) {
    return detail.map((d: any) => d.msg ?? String(d)).join('; ')
  }
  if (typeof detail === 'string') return detail
  return err?.message ?? fallback
}
