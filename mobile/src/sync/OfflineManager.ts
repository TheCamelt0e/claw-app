/**
 * Offline Manager - Network State & Online/Offline Handling
 * 
 * Provides real-time network status and handles app state changes
 * to ensure sync happens when the app comes back online.
 */
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { AppState, AppStateStatus } from 'react-native';
import { transactionEngine } from './TransactionEngine';

// Simple event emitter
 type NetworkListener = (isOnline: boolean) => void;
const networkListeners: NetworkListener[] = [];

const emitNetworkChange = (isOnline: boolean) => {
  networkListeners.forEach(cb => cb(isOnline));
};

class OfflineManager {
  private isOnline = true;
  private appState: AppStateStatus = 'active';
  private unsubscribeNetInfo: (() => void) | null = null;

  constructor() {
    this.init();
  }

  private async init(): Promise<void> {
    // Subscribe to network changes
    this.unsubscribeNetInfo = NetInfo.addEventListener(this.handleNetworkChange);

    // Subscribe to app state changes
    AppState.addEventListener('change', this.handleAppStateChange);

    // Get initial state
    const state = await NetInfo.fetch();
    this.isOnline = state.isConnected ?? true;
    
    console.log(`[OfflineManager] Initialized. Online: ${this.isOnline}`);
  }

  private handleNetworkChange = (state: NetInfoState) => {
    const wasOnline = this.isOnline;
    this.isOnline = state.isConnected ?? false;

    if (!wasOnline && this.isOnline) {
      // Just came online - trigger sync
      console.log('[OfflineManager] 📶 Back online! Triggering sync...');
      transactionEngine.processQueue();
      emitNetworkChange(true);
    } else if (wasOnline && !this.isOnline) {
      console.log('[OfflineManager] 📴 Went offline');
      emitNetworkChange(false);
    }
  };

  private handleAppStateChange = (nextAppState: AppStateStatus) => {
    const wasInactive = this.appState.match(/inactive|background/);
    const isActive = nextAppState === 'active';

    this.appState = nextAppState;

    if (wasInactive && isActive) {
      // App came to foreground - check if we need to sync
      console.log('[OfflineManager] App active, checking sync status...');
      
      // Check network status first
      NetInfo.fetch().then(state => {
        if (state.isConnected) {
          const status = transactionEngine.getStatus();
          if (status.pending > 0 || status.failed > 0) {
            console.log(`[OfflineManager] ${status.pending} pending, ${status.failed} failed items to sync`);
            transactionEngine.processQueue();
          }
        }
      });
    }
  };

  /**
   * Check if currently online
   */
  isConnected(): boolean {
    return this.isOnline;
  }

  /**
   * Subscribe to network changes
   */
  onNetworkChange(callback: NetworkListener): () => void {
    networkListeners.push(callback);
    return () => {
      const index = networkListeners.indexOf(callback);
      if (index > -1) networkListeners.splice(index, 1);
    };
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.unsubscribeNetInfo) {
      this.unsubscribeNetInfo();
    }
  }
}

// Export singleton
export const offlineManager = new OfflineManager();
