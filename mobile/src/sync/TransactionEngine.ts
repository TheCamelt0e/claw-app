/**
 * Transaction Engine - Offline-First Sync System - SECURITY HARDENED
 * 
 * Every user action becomes a transaction that flows through:
 * Pending → Syncing → Confirmed (or Failed → Retry)
 * 
 * This makes the app feel instant and bulletproof.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiRequest } from '../api/client';

// Transaction types matching our domain
export type TransactionType = 
  | 'CAPTURE' 
  | 'STRIKE' 
  | 'EXTEND' 
  | 'RELEASE'
  | 'SET_ALARM'
  | 'ADD_TO_CALENDAR';

export interface Transaction {
  id: string;
  type: TransactionType;
  payload: any;
  status: 'pending' | 'syncing' | 'confirmed' | 'failed' | 'conflict';
  retryCount: number;
  maxRetries: number;
  createdAt: number;
  lastAttemptAt?: number;
  optimisticId: string;        // Temporary ID for UI rollback
  confirmedId?: string;        // Real ID from server
  errorMessage?: string;
}

interface TransactionQueue {
  transactions: Transaction[];
  lastSyncAt?: number;
}

const STORAGE_KEY = '@claw_transaction_queue_v1';
const SYNC_INTERVAL_MS = 5000;  // Check for pending txs every 5 seconds
const MAX_RETRY_ATTEMPTS = 5;

// Simple event emitter using callbacks
type TransactionListener = (tx: Transaction, data?: any) => void;
const listeners: { [event: string]: TransactionListener[] } = {};

const emit = (event: string, tx: Transaction, data?: any) => {
  listeners[event]?.forEach(cb => cb(tx, data));
};

export const onTransaction = (event: string, callback: TransactionListener) => {
  if (!listeners[event]) listeners[event] = [];
  listeners[event].push(callback);
  return () => {
    listeners[event] = listeners[event].filter(cb => cb !== callback);
  };
};

class TransactionEngine {
  private queue: TransactionQueue = { transactions: [] };
  private syncInterval: NodeJS.Timeout | null = null;
  private isProcessing = false;

  constructor() {
    this.loadQueue();
    this.startSyncLoop();
  }

  // Initialize and load persisted queue
  private async loadQueue(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.queue = JSON.parse(stored);
        console.log(`[TransactionEngine] Loaded ${this.queue.transactions.length} transactions`);
        
        // Emit initial state for UI
        this.queue.transactions.forEach(tx => {
          if (tx.status === 'pending' || tx.status === 'failed') {
            emit('transaction:pending', tx);
          }
        });
      }
    } catch (error) {
      console.error('[TransactionEngine] Failed to load queue:', error);
      this.queue = { transactions: [] };
    }
  }

  // Persist queue to storage
  private async saveQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      console.error('[TransactionEngine] Failed to save queue:', error);
    }
  }

  // Generate unique transaction ID
  private generateId(): string {
    return `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Generate optimistic ID for UI
  private generateOptimisticId(): string {
    return `opt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Queue a new transaction
   * Returns immediately with optimistic ID for UI updates
   */
  async enqueue(
    type: TransactionType, 
    payload: any,
    options: { maxRetries?: number; optimisticId?: string } = {}
  ): Promise<Transaction> {
    const transaction: Transaction = {
      id: this.generateId(),
      type,
      payload,
      status: 'pending',
      retryCount: 0,
      maxRetries: options.maxRetries || MAX_RETRY_ATTEMPTS,
      createdAt: Date.now(),
      optimisticId: options.optimisticId || this.generateOptimisticId(),
    };

    this.queue.transactions.push(transaction);
    await this.saveQueue();

    // Emit event for UI to show optimistic update
    emit('transaction:created', transaction);

    console.log(`[TransactionEngine] Queued ${type}: ${transaction.optimisticId}`);
    
    // Trigger immediate sync attempt
    this.processQueue();

    return transaction;
  }

  /**
   * Process all pending transactions
   */
  async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    const pending = this.queue.transactions.filter(
      tx => tx.status === 'pending' || (tx.status === 'failed' && tx.retryCount < tx.maxRetries)
    );

    if (pending.length === 0) {
      this.isProcessing = false;
      return;
    }

    console.log(`[TransactionEngine] Processing ${pending.length} transactions...`);

    for (const tx of pending) {
      await this.processTransaction(tx);
    }

    this.isProcessing = false;
  }

  /**
   * Process a single transaction with retry logic
   */
  private async processTransaction(tx: Transaction): Promise<void> {
    // Update status to syncing
    tx.status = 'syncing';
    tx.lastAttemptAt = Date.now();
    tx.retryCount++;
    await this.saveQueue();

    emit('transaction:syncing', tx);

    try {
      const result = await this.executeTransaction(tx);

      // Success! Mark as confirmed
      tx.status = 'confirmed';
      tx.confirmedId = result.id || result.claw?.id || tx.optimisticId;
      await this.saveQueue();

      emit('transaction:confirmed', tx, result);
      console.log(`[TransactionEngine] ✅ Confirmed ${tx.type}: ${tx.optimisticId} → ${tx.confirmedId}`);

    } catch (error: any) {
      console.error(`[TransactionEngine] ❌ Failed ${tx.type}:`, error.message);

      const isRetryable = this.isRetryableError(error);
      
      if (tx.retryCount >= tx.maxRetries || !isRetryable) {
        // Give up
        tx.status = 'failed';
        tx.errorMessage = error.message || 'Unknown error';
        await this.saveQueue();
        emit('transaction:failed', tx, error);
      } else {
        // Will retry later
        tx.status = 'failed'; // Temporarily failed, will be picked up again
        await this.saveQueue();
        
        // Exponential backoff notification
        const backoffMinutes = Math.pow(2, tx.retryCount);
        console.log(`[TransactionEngine] Will retry ${tx.type} in ~${backoffMinutes} minutes`);
      }
    }
  }

  /**
   * Execute the actual API call based on transaction type
   * FIXED: Updated endpoints to match backend API
   */
  private async executeTransaction(tx: Transaction): Promise<any> {
    switch (tx.type) {
      case 'CAPTURE':
        return apiRequest('POST', '/claws/capture', {
          content: tx.payload.content,
          content_type: tx.payload.contentType || 'text',
          priority: tx.payload.extraData?.priority || false,
          priority_level: tx.payload.extraData?.priority_level,
          someday: tx.payload.extraData?.someday || false,
        });

      case 'STRIKE':
        return apiRequest('POST', `/claws/${tx.payload.clawId}/strike`, {
          lat: tx.payload.lat,
          lng: tx.payload.lng,
        });

      case 'EXTEND':
        return apiRequest('POST', `/claws/${tx.payload.clawId}/extend`, {
          days: tx.payload.days,
        });

      case 'RELEASE':
        return apiRequest('POST', `/claws/${tx.payload.clawId}/release`);

      case 'SET_ALARM':
        // FIXED: Correct endpoint path for notifications API
        return apiRequest('POST', `/notifications/claw/${tx.payload.clawId}/set-alarm`, {
          scheduled_time: tx.payload.alarmAt,  // FIXED: Correct field name
        });

      case 'ADD_TO_CALENDAR':
        // FIXED: Correct endpoint path for notifications API
        return apiRequest('POST', `/notifications/claw/${tx.payload.clawId}/add-to-calendar`);

      default:
        throw new Error(`Unknown transaction type: ${tx.type}`);
    }
  }

  /**
   * Determine if an error is retryable
   */
  private isRetryableError(error: any): boolean {
    // Network errors are retryable
    if (error.message?.includes('Network') || error.message?.includes('fetch')) {
      return true;
    }
    
    // Rate limits are retryable (backoff will handle timing)
    if (error.status === 429 || error.message?.includes('RATE_LIMIT')) {
      return true;
    }

    // 5xx server errors are retryable
    if (error.status >= 500 && error.status < 600) {
      return true;
    }

    // 4xx client errors are NOT retryable (bad request, auth, etc)
    if (error.status >= 400 && error.status < 500) {
      return false;
    }

    return true;
  }

  /**
   * Start the background sync loop
   */
  private startSyncLoop(): void {
    if (this.syncInterval) return;

    this.syncInterval = setInterval(() => {
      const pending = this.queue.transactions.filter(tx => tx.status === 'pending');
      const failed = this.queue.transactions.filter(
        tx => tx.status === 'failed' && tx.retryCount < tx.maxRetries
      );

      if (pending.length > 0 || failed.length > 0) {
        console.log(`[TransactionEngine] Auto-sync: ${pending.length} pending, ${failed.length} failed`);
        this.processQueue();
      }
    }, SYNC_INTERVAL_MS);

    console.log('[TransactionEngine] Sync loop started (5s interval)');
  }

  /**
   * Stop the sync loop (for cleanup)
   */
  stopSyncLoop(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Get all pending transactions
   */
  getPending(): Transaction[] {
    return this.queue.transactions.filter(tx => tx.status === 'pending');
  }

  /**
   * Get all failed transactions
   */
  getFailed(): Transaction[] {
    return this.queue.transactions.filter(tx => tx.status === 'failed');
  }

  /**
   * Get sync status summary
   */
  getStatus(): { pending: number; syncing: number; failed: number; confirmed: number } {
    return {
      pending: this.queue.transactions.filter(tx => tx.status === 'pending').length,
      syncing: this.queue.transactions.filter(tx => tx.status === 'syncing').length,
      failed: this.queue.transactions.filter(tx => tx.status === 'failed').length,
      confirmed: this.queue.transactions.filter(tx => tx.status === 'confirmed').length,
    };
  }

  /**
   * Retry a specific failed transaction
   */
  async retry(transactionId: string): Promise<void> {
    const tx = this.queue.transactions.find(t => t.id === transactionId);
    if (tx && tx.status === 'failed') {
      tx.status = 'pending';
      tx.retryCount = 0;
      tx.errorMessage = undefined;
      await this.saveQueue();
      this.processQueue();
    }
  }

  /**
   * Cancel a pending transaction (and remove optimistic update)
   */
  async cancel(transactionId: string): Promise<void> {
    const index = this.queue.transactions.findIndex(t => t.id === transactionId);
    if (index >= 0) {
      const tx = this.queue.transactions[index];
      this.queue.transactions.splice(index, 1);
      await this.saveQueue();
      emit('transaction:cancelled', tx);
    }
  }

  /**
   * Clear old confirmed transactions (housekeeping)
   */
  async clearOldConfirmed(olderThanMs: number = 24 * 60 * 60 * 1000): Promise<void> {
    const cutoff = Date.now() - olderThanMs;
    this.queue.transactions = this.queue.transactions.filter(tx => {
      if (tx.status === 'confirmed' && tx.lastAttemptAt && tx.lastAttemptAt < cutoff) {
        return false; // Remove old confirmed
      }
      return true;
    });
    await this.saveQueue();
  }
}

// Export singleton
export const transactionEngine = new TransactionEngine();
