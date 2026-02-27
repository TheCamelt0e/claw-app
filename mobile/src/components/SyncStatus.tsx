/**
 * SyncStatus - Shows pending/syncing/failed transactions
 * 
 * This component gives users confidence that their data is safe,
 * even when offline or on slow connections.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { transactionEngine, Transaction, onTransaction } from '../sync/TransactionEngine';

export default function SyncStatus() {
  const [status, setStatus] = useState({ pending: 0, syncing: 0, failed: 0 });
  const [isExpanded, setIsExpanded] = useState(false);
  const [failedTxs, setFailedTxs] = useState<Transaction[]>([]);
  const fadeAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    // Initial status
    setStatus(transactionEngine.getStatus());

    // Subscribe to transaction events
    const handleTransaction = () => {
      const newStatus = transactionEngine.getStatus();
      setStatus(newStatus);
      
      if (newStatus.failed > 0) {
        setFailedTxs(transactionEngine.getFailed());
      }
    };

    onTransaction('transaction:confirmed', handleTransaction);
    onTransaction('transaction:failed', handleTransaction);
    onTransaction('transaction:syncing', handleTransaction);
    onTransaction('transaction:created', handleTransaction);

    // Refresh every 2 seconds
    const interval = setInterval(() => {
      setStatus(transactionEngine.getStatus());
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Animate in/out based on activity
    const hasActivity = status.pending > 0 || status.syncing > 0 || status.failed > 0;
    
    Animated.timing(fadeAnim, {
      toValue: hasActivity ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [status]);

  const handleRetry = (txId: string) => {
    transactionEngine.retry(txId);
  };

  const handleRetryAll = () => {
    failedTxs.forEach(tx => transactionEngine.retry(tx.id));
  };

  // Don't render if nothing to show
  if (status.pending === 0 && status.syncing === 0 && status.failed === 0) {
    return null;
  }

  const getStatusText = () => {
    if (status.failed > 0) {
      return `${status.failed} item${status.failed > 1 ? 's' : ''} failed to sync`;
    }
    if (status.syncing > 0) {
      return `Syncing ${status.syncing} item${status.syncing > 1 ? 's' : ''}...`;
    }
    return `${status.pending} item${status.pending > 1 ? 's' : ''} pending`;
  };

  const getStatusColor = () => {
    if (status.failed > 0) return '#e94560'; // Red
    if (status.syncing > 0) return '#FFD700'; // Gold
    return '#4CAF50'; // Green
  };

  const getStatusIcon = () => {
    if (status.failed > 0) return 'cloud-offline';
    if (status.syncing > 0) return 'sync';
    return 'cloud-upload';
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <TouchableOpacity 
        style={[styles.bar, { borderLeftColor: getStatusColor() }]}
        onPress={() => status.failed > 0 && setIsExpanded(!isExpanded)}
        activeOpacity={0.8}
      >
        <Ionicons 
          name={getStatusIcon() as any} 
          size={18} 
          color={getStatusColor()} 
          style={status.syncing > 0 && styles.spinning}
        />
        <Text style={styles.text}>{getStatusText()}</Text>
        
        {status.failed > 0 && (
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={handleRetryAll}
          >
            <Text style={styles.retryText}>Retry All</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>

      {isExpanded && status.failed > 0 && (
        <View style={styles.details}>
          {failedTxs.map(tx => (
            <View key={tx.id} style={styles.detailItem}>
              <Text style={styles.detailText}>
                {tx.type}: {tx.payload.content?.substring(0, 30)}...
              </Text>
              <TouchableOpacity onPress={() => handleRetry(tx.id)}>
                <Ionicons name="refresh" size={16} color="#FF6B35" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 80, // Above tab bar
    left: 16,
    right: 16,
    zIndex: 100,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2d2d44',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  text: {
    color: '#fff',
    fontSize: 14,
    marginLeft: 10,
    flex: 1,
  },
  spinning: {
    transform: [{ rotate: '0deg' }],
  },
  retryButton: {
    backgroundColor: 'rgba(255, 107, 53, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  retryText: {
    color: '#FF6B35',
    fontSize: 12,
    fontWeight: '600',
  },
  details: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    marginTop: 8,
    padding: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#2d2d44',
  },
  detailText: {
    color: '#888',
    fontSize: 13,
    flex: 1,
  },
});
