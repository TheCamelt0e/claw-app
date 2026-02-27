/**
 * Claw State Management - Optimistic + Offline-First
 * 
 * Every action is optimistically applied locally, then synced via TransactionEngine.
 * This makes the app feel instant even on slow connections or offline.
 */
import { create } from 'zustand';
import { clawsAPI } from '../api/client';
import { transactionEngine, onTransaction, Transaction } from '../sync/TransactionEngine';

export interface Claw {
  id: string;
  content: string;
  title?: string;
  category?: string;
  tags: string[];
  action_type?: string;
  status: 'active' | 'completed' | 'expired' | 'archived' | 'syncing';
  location_name?: string;
  created_at: string;
  expires_at: string;
  surface_count: number;
  is_vip?: boolean;
  is_priority?: boolean;
  // AI-enriched fields
  urgency?: 'low' | 'medium' | 'high';
  sentiment?: string;
  why_capture?: string;
  ai_context?: {
    who_mentioned?: string;
    where?: string;
    when_context?: string;
    specific_item?: string;
  };
  ai_source?: 'gemini' | 'fallback';
  // Sync status
  isOptimistic?: boolean;
  transactionId?: string;
  resurface_score?: number;
  resurface_reason?: string;
}

interface ClawState {
  claws: Claw[];
  surfaceClaws: Claw[];
  isLoading: boolean;
  error: string | null;
  syncStatus: { pending: number; syncing: number; failed: number };
  
  // Getters
  activeClaws: Claw[];
  pendingClaws: Claw[];
  
  // Actions
  fetchClaws: (status?: string) => Promise<void>;
  fetchActiveClaws: () => Promise<void>;
  captureClaw: (content: string, contentType?: string, extraData?: any) => Promise<Claw>;
  fetchSurfaceClaws: (lat?: number, lng?: number, activeApp?: string) => Promise<void>;
  strikeClaw: (clawId: string) => Promise<void>;
  releaseClaw: (clawId: string) => Promise<void>;
  extendClaw: (clawId: string, days: number) => Promise<void>;
  clearError: () => void;
  refreshSyncStatus: () => void;
}

export const useClawStore = create<ClawState>((set, get) => {
  // Subscribe to transaction events for UI updates
  onTransaction('transaction:confirmed', (tx: Transaction, result: any) => {
    set((state) => {
      // Replace optimistic claw with confirmed one
      const updatedClaws = state.claws.map(c => {
        if (c.transactionId === tx.id || c.id === tx.optimisticId) {
          return {
            ...c,
            id: tx.confirmedId || c.id,
            status: 'active' as const,
            isOptimistic: false,
            transactionId: undefined,
            ...result.claw, // Merge server response
          };
        }
        return c;
      });

      // Remove struck/released items
      const cleanedClaws = updatedClaws.filter(c => {
        if (c.transactionId === tx.id && (tx.type === 'STRIKE' || tx.type === 'RELEASE')) {
          return false;
        }
        return true;
      });

      return { claws: cleanedClaws };
    });

    // Refresh sync status
    get().refreshSyncStatus();
  });

  onTransaction('transaction:failed', (tx: Transaction) => {
    set((state) => {
      // Mark failed items
      const updatedClaws = state.claws.map(c => {
        if (c.transactionId === tx.id) {
          return { ...c, status: 'expired' as const, isOptimistic: false };
        }
        return c;
      });
      return { claws: updatedClaws };
    });
    get().refreshSyncStatus();
  });

  return {
    claws: [],
    surfaceClaws: [],
    isLoading: false,
    error: null,
    syncStatus: { pending: 0, syncing: 0, failed: 0 },
    
    get activeClaws() {
      return get().claws.filter(c => c.status === 'active' && !c.isOptimistic);
    },

    get pendingClaws() {
      return get().claws.filter(c => c.isOptimistic);
    },

    refreshSyncStatus: () => {
      set({ syncStatus: transactionEngine.getStatus() });
    },

    fetchClaws: async (status?: string) => {
      set({ isLoading: true, error: null });
      try {
        const response = await clawsAPI.getMyClaws(status);
        const items = response.items || [];
        
        // Merge server state with optimistic pending items
        const pendingItems = get().claws.filter(c => c.isOptimistic);
        
        set({ 
          claws: [...pendingItems, ...items], 
          isLoading: false 
        });
      } catch (error: any) {
        console.error('Fetch claws error:', error);
        set({ error: error.message || 'Failed to fetch claws', isLoading: false });
      }
    },
    
    fetchActiveClaws: async () => {
      set({ isLoading: true, error: null });
      try {
        const response = await clawsAPI.getMyClaws('active');
        const items = response.items || [];
        
        // Merge server state with optimistic pending items
        const pendingItems = get().claws.filter(c => c.isOptimistic);
        
        set({ 
          claws: [...pendingItems, ...items], 
          isLoading: false 
        });
      } catch (error: any) {
        console.error('Fetch active claws error:', error);
        set({ error: error.message || 'Failed to fetch claws', isLoading: false });
      }
    },

    captureClaw: async (content: string, contentType: string = 'text', extraData?: any) => {
      set({ error: null });
      
      // Create optimistic claw
      const optimisticId = `opt_${Date.now()}`;
      const optimisticClaw: Claw = {
        id: optimisticId,
        content,
        status: 'syncing',
        isOptimistic: true,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        surface_count: 0,
        tags: extraData?.suggested_tags || [],
        category: extraData?.suggested_category,
        is_vip: extraData?.priority || false,
        urgency: extraData?.ai_urgency,
      };
      
      // Optimistically add to state
      set((state) => ({
        claws: [optimisticClaw, ...state.claws],
      }));

      try {
        // Queue transaction
        const tx = await transactionEngine.enqueue('CAPTURE', {
          content,
          contentType,
          extraData,
        }, { optimisticId });

        // Update claw with transaction ID
        set((state) => ({
          claws: state.claws.map(c => 
            c.id === optimisticId ? { ...c, transactionId: tx.id } : c
          ),
        }));

        get().refreshSyncStatus();
        return optimisticClaw;
        
      } catch (error: any) {
        // Remove optimistic claw on queue failure
        set((state) => ({
          claws: state.claws.filter(c => c.id !== optimisticId),
          error: error.message || 'Failed to capture',
        }));
        throw error;
      }
    },

    fetchSurfaceClaws: async (lat?: number, lng?: number, activeApp?: string) => {
      set({ error: null });
      try {
        const response = await clawsAPI.getSurfaceClaws(lat, lng, activeApp);
        set({ surfaceClaws: response || [] });
      } catch (error: any) {
        console.error('Fetch surface claws error:', error);
        set({ error: error.message || 'Failed to fetch surface claws' });
      }
    },

    strikeClaw: async (clawId: string) => {
      set({ error: null });
      
      // Optimistically remove from UI
      const clawToStrike = get().claws.find(c => c.id === clawId);
      if (!clawToStrike) return;

      set((state) => ({
        claws: state.claws.map(c => 
          c.id === clawId ? { ...c, status: 'completed', isOptimistic: true } : c
        ),
      }));

      try {
        await transactionEngine.enqueue('STRIKE', { clawId });
        get().refreshSyncStatus();
      } catch (error: any) {
        // Rollback on failure
        set((state) => ({
          claws: state.claws.map(c => 
            c.id === clawId ? { ...clawToStrike } : c
          ),
          error: error.message || 'Failed to strike',
        }));
      }
    },

    releaseClaw: async (clawId: string) => {
      set({ error: null });
      
      const clawToRelease = get().claws.find(c => c.id === clawId);
      if (!clawToRelease) return;

      // Optimistically remove
      set((state) => ({
        claws: state.claws.filter(c => c.id !== clawId),
      }));

      try {
        await transactionEngine.enqueue('RELEASE', { clawId });
        get().refreshSyncStatus();
      } catch (error: any) {
        // Rollback
        set((state) => ({
          claws: [...state.claws, clawToRelease],
          error: error.message || 'Failed to release',
        }));
      }
    },

    extendClaw: async (clawId: string, days: number) => {
      set({ error: null });
      
      const originalClaw = get().claws.find(c => c.id === clawId);
      if (!originalClaw) return;

      // Optimistically update expiry
      const newExpiry = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
      set((state) => ({
        claws: state.claws.map(c => 
          c.id === clawId ? { ...c, expires_at: newExpiry, isOptimistic: true } : c
        ),
      }));

      try {
        await transactionEngine.enqueue('EXTEND', { clawId, days });
        get().refreshSyncStatus();
      } catch (error: any) {
        // Rollback
        set((state) => ({
          claws: state.claws.map(c => 
            c.id === clawId ? { ...originalClaw } : c
          ),
          error: error.message || 'Failed to extend',
        }));
      }
    },
    
    clearError: () => set({ error: null }),
  };
});
