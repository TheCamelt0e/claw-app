/**
 * Smart Surface Service - CLAW 3.0
 * Learns user patterns and surfaces items at optimal times
 */
import { apiRequest } from '../api/client';
import * as Location from 'expo-location';

export interface SmartSurfaceItem {
  id: string;
  content: string;
  title?: string;
  category?: string;
  tags: string[];
  status: string;
  resurface_score: number;
  resurface_reason: string;
  created_at: string;
  expires_at: string;
}

export interface UserPatterns {
  peak_days: [string, number][];  // [("Thursday", 12), ...]
  peak_hours: [number, number][];  // [(18, 8), ...]
  preferred_stores: [string, number][];
  avg_time_to_strike_hours: number;
  total_recorded: number;
}

export interface ClawScore {
  claw_id: string;
  score: number;
  reason: string;
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Get claws sorted by completion likelihood RIGHT NOW
 */
export async function getSmartSurface(
  useLocation: boolean = true,
  limit: number = 10
): Promise<SmartSurfaceItem[]> {
  try {
    let params: any = { limit };
    
    // Get current location if permitted and requested
    if (useLocation) {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        params.lat = location.coords.latitude;
        params.lng = location.coords.longitude;
      }
    }
    
    const response = await apiRequest<any>('GET', '/ai/smart-surface', undefined, params);
    return response.items || [];
  } catch (error) {
    console.error('[SmartSurface] Error:', error);
    return [];
  }
}

/**
 * Get user's learned patterns
 */
export async function getUserPatterns(
  category?: string
): Promise<UserPatterns | null> {
  try {
    const params = category ? { category } : undefined;
    const response = await apiRequest<any>('GET', '/ai/patterns', undefined, params);
    return response.patterns;
  } catch (error) {
    console.error('[SmartSurface] Patterns error:', error);
    return null;
  }
}

/**
 * Calculate score for a specific claw right now
 */
export async function getClawScore(
  clawId: string,
  useLocation: boolean = true
): Promise<ClawScore | null> {
  try {
    let params: any = {};
    
    if (useLocation) {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        params.lat = location.coords.latitude;
        params.lng = location.coords.longitude;
      }
    }
    
    const response = await apiRequest<ClawScore>(
      'POST', 
      `/ai/score-claw/${clawId}`,
      params.lat || params.lng ? { lat: params.lat, lng: params.lng } : {}
    );
    return response;
  } catch (error) {
    console.error('[SmartSurface] Score error:', error);
    return null;
  }
}

/**
 * Get color for resurface score
 */
export function getScoreColor(score: number): string {
  if (score >= 0.8) return '#4CAF50';  // Green - perfect time
  if (score >= 0.6) return '#FF6B35';  // Orange - good time
  if (score >= 0.4) return '#FFD700';  // Yellow - okay
  return '#888';  // Gray - not ideal
}

/**
 * Get score label
 */
export function getScoreLabel(score: number): string {
  if (score >= 0.8) return 'Perfect time!';
  if (score >= 0.6) return 'Good time';
  if (score >= 0.4) return 'Okay time';
  return 'Maybe later';
}

/**
 * Get icon for confidence level
 */
export function getConfidenceIcon(confidence: string): string {
  switch (confidence) {
    case 'high': return 'checkmark-circle';
    case 'medium': return 'time';
    case 'low': return 'help-circle';
    default: return 'help-circle';
  }
}

/**
 * Format pattern for display
 */
export function formatPatterns(patterns: UserPatterns | null): string {
  if (!patterns || patterns.total_recorded === 0) {
    return "Keep striking items! CLAW is learning your patterns.";
  }
  
  const parts: string[] = [];
  
  if (patterns.peak_days.length > 0) {
    parts.push(`You often complete things on ${patterns.peak_days[0][0]}s`);
  }
  
  if (patterns.peak_hours.length > 0) {
    const hour = patterns.peak_hours[0][0];
    const time = hour < 12 ? `${hour}am` : `${hour - 12}pm`;
    parts.push(`around ${time}`);
  }
  
  return parts.join(' ') + '.';
}
