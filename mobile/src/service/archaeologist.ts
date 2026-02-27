/**
 * The Archaeologist - Monthly Someday Resurfacing
 * 
 * Checks once per month if we should show the Archaeologist modal.
 * Surfaces 3 random Someday items that have been marinating.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useClawStore, Claw } from '../store/clawStore';

const ARCHAEOLOGIST_KEY = '@claw_archaeologist_v1';
const MIN_DAYS_BETWEEN_VISITS = 30;
const SOMEDAY_ITEMS_TO_SHOW = 3;

interface ArchaeologistData {
  lastShownAt: number;
  dismissedItems: string[]; // IDs of items user said "next month" to
  dismissedUntil: number; // Timestamp
}

/**
 * Check if Archaeologist should appear
 */
export async function shouldShowArchaeologist(): Promise<boolean> {
  const now = Date.now();
  
  // Get last shown data
  const data = await getArchaeologistData();
  
  // Check if user dismissed all items recently
  if (data.dismissedUntil && now < data.dismissedUntil) {
    return false;
  }
  
  // Check if 30 days have passed since last visit
  const daysSinceLastVisit = (now - data.lastShownAt) / (1000 * 60 * 60 * 24);
  if (daysSinceLastVisit < MIN_DAYS_BETWEEN_VISITS) {
    return false;
  }
  
  // Check if user has any Someday items
  const somedayItems = getSomedayItems();
  if (somedayItems.length === 0) {
    return false;
  }
  
  return true;
}

/**
 * Get Someday items for display
 * Returns 3 random items that haven't been recently dismissed
 */
export function getSomedayItemsForArchaeologist(): Claw[] {
  const allSomeday = getSomedayItems();
  
  // Shuffle and take 3
  const shuffled = [...allSomeday].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, SOMEDAY_ITEMS_TO_SHOW);
}

/**
 * Get all Someday items from store
 */
function getSomedayItems(): Claw[] {
  const { claws } = useClawStore.getState();
  return claws.filter(c => 
    c.category === 'someday' || 
    c.tags?.includes('someday')
  );
}

/**
 * Record that Archaeologist was shown
 */
export async function recordArchaeologistShown(): Promise<void> {
  const data = await getArchaeologistData();
  data.lastShownAt = Date.now();
  await saveArchaeologistData(data);
}

/**
 * Mark item as dismissed ("next month")
 */
export async function dismissItemForMonth(itemId: string): Promise<void> {
  const data = await getArchaeologistData();
  if (!data.dismissedItems.includes(itemId)) {
    data.dismissedItems.push(itemId);
  }
  await saveArchaeologistData(data);
}

/**
 * Mark item as activated (move to active)
 */
export async function activateItem(itemId: string): Promise<void> {
  // Remove from dismissed list if present
  const data = await getArchaeologistData();
  data.dismissedItems = data.dismissedItems.filter(id => id !== itemId);
  await saveArchaeologistData(data);
  
  // TODO: Call API to update item category from 'someday' to 'active'
  console.log(`[Archaeologist] Activating item ${itemId}`);
}

/**
 * Mark item as buried forever
 */
export async function buryItem(itemId: string): Promise<void> {
  // Remove from dismissed list
  const data = await getArchaeologistData();
  data.dismissedItems = data.dismissedItems.filter(id => id !== itemId);
  await saveArchaeologistData(data);
  
  // TODO: Call API to delete/archive item
  console.log(`[Archaeologist] Burying item ${itemId}`);
}

/**
 * Dismiss all items ("Maybe later")
 * Hides Archaeologist for 7 days
 */
export async function dismissAllItems(): Promise<void> {
  const data = await getArchaeologistData();
  data.dismissedUntil = Date.now() + (7 * 24 * 60 * 60 * 1000); // 7 days
  await saveArchaeologistData(data);
}

/**
 * Reset Archaeologist data (for testing)
 */
export async function resetArchaeologist(): Promise<void> {
  await AsyncStorage.removeItem(ARCHAEOLOGIST_KEY);
}

/**
 * Get stored data
 */
async function getArchaeologistData(): Promise<ArchaeologistData> {
  try {
    const stored = await AsyncStorage.getItem(ARCHAEOLOGIST_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('[Archaeologist] Error loading data:', error);
  }
  
  return {
    lastShownAt: 0,
    dismissedItems: [],
    dismissedUntil: 0,
  };
}

/**
 * Save data
 */
async function saveArchaeologistData(data: ArchaeologistData): Promise<void> {
  try {
    await AsyncStorage.setItem(ARCHAEOLOGIST_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('[Archaeologist] Error saving data:', error);
  }
}

/**
 * Force show Archaeologist (for testing)
 */
export async function forceShowArchaeologist(): Promise<void> {
  await resetArchaeologist();
}
