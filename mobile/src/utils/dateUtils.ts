/**
 * Date utility functions
 */

function isValidDate(date: Date): boolean {
  return date instanceof Date && !isNaN(date.getTime());
}

export function formatDistanceToNow(dateString: string | null | undefined): string {
  if (!dateString) return 'soon';
  
  const date = new Date(dateString);
  if (!isValidDate(date)) return 'soon';
  
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffSecs = Math.round(diffMs / 1000);
  const diffMins = Math.round(diffSecs / 60);
  const diffHours = Math.round(diffMins / 60);
  const diffDays = Math.round(diffHours / 24);

  if (diffSecs < 0) return 'expired';
  if (diffDays > 1) return `in ${diffDays} days`;
  if (diffHours > 1) return `in ${diffHours} hours`;
  if (diffMins > 1) return `in ${diffMins} minutes`;
  return 'soon';
}

export function formatRelativeTime(dateString: string | null | undefined): string {
  if (!dateString) return 'just now';
  
  const date = new Date(dateString);
  if (!isValidDate(date)) return 'just now';
  
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.round(diffMs / 1000);
  const diffMins = Math.round(diffSecs / 60);
  const diffHours = Math.round(diffMins / 60);
  const diffDays = Math.round(diffHours / 24);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}
