/**
 * VIP Utility - Single source of truth for VIP detection
 */
import { Claw } from '../store/clawStore';

/**
 * Check if a claw is VIP/Priority
 * Trusts backend's is_vip flag, with fallback to local checks
 */
export function isVipClaw(claw: Claw | null | undefined): boolean {
  if (!claw) return false;
  
  // Trust backend's computed is_vip flag if available
  if (claw.is_vip === true) return true;
  
  // Check is_priority column (database field)
  if (claw.is_priority === true) return true;
  
  // Check tags (fallback)
  const tags = claw.tags || [];
  const hasVipTag = tags.includes('vip') || tags.includes('priority');
  
  // Check title emoji (fallback)
  const hasVipEmoji = claw.title?.includes('🔥') || false;
  
  return hasVipTag || hasVipEmoji;
}

/**
 * Get VIP badge text based on priority level
 */
export function getVipBadgeText(claw: Claw | null | undefined): string {
  if (!claw) return '';
  
  const tags = claw.tags || [];
  if (tags.includes('vip')) return 'VIP';
  if (tags.includes('priority')) return 'PRIORITY';
  if (claw.title?.includes('🔥')) return 'VIP';
  
  return '';
}

/**
 * Strip VIP emoji from title for display
 */
export function cleanVipTitle(title: string | undefined): string {
  if (!title) return '';
  return title.replace(/^🔥\s*/, '').trim();
}
