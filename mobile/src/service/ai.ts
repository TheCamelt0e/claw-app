/**
 * AI Service for CLAW
 * Smart content analysis with Gemini AI
 */
import { apiRequest } from '../api/client';
import { Claw } from '../store/clawStore';

export interface SmartAnalysisRequest {
  content: string;
  check_related?: boolean;
}

export interface SmartAnalysisResponse {
  success: boolean;
  title: string;
  category: string;
  tags: string[];
  action_type: string;
  urgency: 'low' | 'medium' | 'high';
  expiry_days: number;
  app_suggestion: string | null;
  context: {
    who_mentioned?: string;
    where?: string;
    when_context?: string;
    specific_item?: string;
  };
  sentiment: 'excited' | 'curious' | 'obligated' | 'neutral';
  why_capture: string;
  related_ids: string[];
  source: 'gemini' | 'fallback';
  message?: string;
}

export interface AIStatus {
  available: boolean;
  model: string | null;
  rate_limits: {
    rpm: { used: number; limit: number; remaining: number };
    rpd: { used: number; limit: number; remaining: number };
  };
}

export interface RelatedClawsResponse {
  related_ids: string[];
  related_claws: Claw[];
  count: number;
}

export interface ReminderTextResponse {
  claw_id: string;
  reminder_text: string;
  source: string;
}

export interface ExpirySuggestionResponse {
  expiry_days: number;
  source: string;
  reason: string;
}

/**
 * Check if an error is a rate limit error (429)
 */
export function isRateLimitError(error: any): { 
  isRateLimit: boolean; 
  retryAfter: number; 
  message: string 
} {
  if (error?.status === 429 || error?.response?.status === 429) {
    const retryAfter = error?.data?.retry_after || error?.retryAfter || 60;
    const message = error?.data?.message || error?.message || 
      'The AI is thinking too hard! Please wait 60 seconds.';
    return { isRateLimit: true, retryAfter, message };
  }
  
  if (error?.error === 'RATE_LIMIT_EXCEEDED') {
    return { 
      isRateLimit: true, 
      retryAfter: error?.retry_after || 60,
      message: error?.message || 'The AI is thinking too hard! Please wait 60 seconds.'
    };
  }
  
  return { isRateLimit: false, retryAfter: 0, message: '' };
}

/**
 * Smart analysis - the main AI feature
 * Analyzes content and returns enriched data with context, urgency, etc.
 */
export async function smartAnalyze(
  content: string,
  checkRelated: boolean = false
): Promise<SmartAnalysisResponse> {
  try {
    const response = await apiRequest<any>('POST', '/ai/analyze', {
      content,
      check_related: checkRelated,
    });
    
    return response as SmartAnalysisResponse;
  } catch (error: any) {
    const rateLimit = isRateLimitError(error);
    if (rateLimit.isRateLimit) {
      // Return fallback with rate limit info
      const fallback = fallbackAnalyze(content);
      return {
        ...fallback,
        message: rateLimit.message,
      };
    }
    
    // Other errors - return fallback
    console.log('[AI] Error, using fallback:', error);
    return fallbackAnalyze(content);
  }
}

/**
 * Find related existing claws
 */
export async function findRelatedClaws(content: string): Promise<RelatedClawsResponse> {
  try {
    const response = await apiRequest<RelatedClawsResponse>('POST', '/ai/find-related', {
      content,
    });
    return response;
  } catch (error) {
    console.log('[AI] Could not find related:', error);
    return { related_ids: [], related_claws: [], count: 0 };
  }
}

/**
 * Generate smart reminder text for a claw
 */
export async function generateReminderText(clawId: string): Promise<string> {
  try {
    const response = await apiRequest<ReminderTextResponse>('POST', '/ai/generate-reminder', {
      claw_id: clawId,
    });
    return response.reminder_text;
  } catch (error) {
    return "Don't forget about this!";
  }
}

/**
 * Get AI-suggested expiry days
 */
export async function suggestExpiry(
  content: string, 
  category?: string
): Promise<number> {
  try {
    const response = await apiRequest<ExpirySuggestionResponse>(
      'GET', 
      '/ai/suggest-expiry', 
      undefined,
      { content, category }
    );
    return response.expiry_days;
  } catch (error) {
    // Fallback based on category
    return fallbackExpirySuggestion(category);
  }
}

/**
 * Check AI service status
 */
export async function getAIStatus(): Promise<AIStatus | null> {
  try {
    return await apiRequest<AIStatus>('GET', '/ai/status');
  } catch (error) {
    console.log('[AI] Could not get status:', error);
    return null;
  }
}

/**
 * Legacy categorize - for backward compatibility
 */
export async function categorizeContent(
  content: string,
  useAI: boolean = true
): Promise<Partial<SmartAnalysisResponse>> {
  const result = await smartAnalyze(content, false);
  return {
    success: result.success,
    title: result.title,
    category: result.category,
    tags: result.tags,
    action_type: result.action_type,
    app_suggestion: result.app_suggestion,
    urgency: result.urgency,
    source: result.source,
    message: result.message,
  };
}

// ============== FALLBACK FUNCTIONS ==============

function fallbackAnalyze(content: string): SmartAnalysisResponse {
  const contentLower = content.toLowerCase();
  
  // Category detection
  const categories: Record<string, RegExp> = {
    book: /book|read|author|novel|kindle/,
    movie: /movie|watch|film|netflix|hbo|disney/,
    restaurant: /restaurant|eat|food|cafe|pizza|burger|sushi/,
    product: /buy|amazon|purchase|order|shop|get/,
    task: /call|text|email|remind|schedule|appointment/,
    event: /concert|show|ticket|event|party/,
    gift: /gift|present|birthday|anniversary/,
    idea: /idea|thought|concept|research/,
  };
  
  let category = 'other';
  for (const [cat, regex] of Object.entries(categories)) {
    if (regex.test(contentLower)) {
      category = cat;
      break;
    }
  }
  
  // Action type
  const actions: Record<string, RegExp> = {
    buy: /buy|purchase|order|shop/,
    read: /read|book/,
    watch: /watch|movie|show/,
    try: /try|visit|go|eat|check out/,
    call: /call|phone|text/,
    schedule: /schedule|book|appointment/,
    research: /research|look up|find out/,
  };
  
  let actionType = 'remember';
  for (const [action, regex] of Object.entries(actions)) {
    if (regex.test(contentLower)) {
      actionType = action;
      break;
    }
  }
  
  // App suggestion
  const appMap: Record<string, string> = {
    book: 'amazon',
    movie: 'netflix',
    restaurant: 'maps',
    product: 'amazon',
  };
  
  // Extract mentions
  const whoMatch = content.match(/(?:\b(?:sarah|john|mike|mom|dad|wife|husband|friend|colleague)\b)/i);
  const whereMatch = content.match(/\b(?:bonus|kronan|costco|amazon|netflix|spotify)\b/i);
  
  // Generate tags
  const tags = [category, actionType];
  if (whoMatch) tags.push(`${whoMatch[0].toLowerCase()} mentioned`);
  if (whereMatch) tags.push(whereMatch[0].toLowerCase());
  
  // Detect urgency
  let urgency: 'low' | 'medium' | 'high' = 'medium';
  if (/urgent|asap|today|now|hurry/.test(contentLower)) urgency = 'high';
  else if (/soon|this week|tomorrow/.test(contentLower)) urgency = 'medium';
  else if (/someday|eventually|whenever/.test(contentLower)) urgency = 'low';
  
  // Smart expiry
  const expiryDays = fallbackExpirySuggestion(category);
  
  return {
    success: true,
    title: content.length > 60 ? content.substring(0, 57) + '...' : content,
    category,
    tags: [...new Set(tags)], // dedupe
    action_type: actionType,
    urgency,
    expiry_days: expiryDays,
    app_suggestion: appMap[category] || null,
    context: {
      who_mentioned: whoMatch?.[0] || undefined,
      where: whereMatch?.[0] || undefined,
      when_context: undefined,
      specific_item: undefined,
    },
    sentiment: 'neutral',
    why_capture: '',
    related_ids: [],
    source: 'fallback',
    message: 'AI offline, using smart keyword analysis',
  };
}

function fallbackExpirySuggestion(category?: string): number {
  const expiryMap: Record<string, number> = {
    product: 14,
    book: 30,
    movie: 14,
    restaurant: 7,
    task: 7,
    idea: 30,
    event: 14,
    gift: 21,
  };
  return expiryMap[category || 'other'] || 7;
}

// ============== UTILITY FUNCTIONS ==============

/**
 * Get urgency color for UI
 */
export function getUrgencyColor(urgency: string): string {
  switch (urgency) {
    case 'high': return '#e94560'; // red
    case 'medium': return '#FF6B35'; // orange
    case 'low': return '#4CAF50'; // green
    default: return '#888';
  }
}

/**
 * Get urgency label
 */
export function getUrgencyLabel(urgency: string): string {
  switch (urgency) {
    case 'high': return '🔥 High Priority';
    case 'medium': return '⚡ Medium Priority';
    case 'low': return '📌 Low Priority';
    default: return '';
  }
}

/**
 * Get sentiment emoji
 */
export function getSentimentEmoji(sentiment: string): string {
  switch (sentiment) {
    case 'excited': return '🤩';
    case 'curious': return '🤔';
    case 'obligated': return '📝';
    default: return '💭';
  }
}

/**
 * Format "why capture" for display
 */
export function formatWhyCapture(why: string): string {
  if (!why) return '';
  // Capitalize first letter
  return why.charAt(0).toUpperCase() + why.slice(1);
}
