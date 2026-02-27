/**
 * Surface Screen - Real AI-powered "Aha!" moments
 * Shows contextually relevant claws with actual geolocation
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Animated,
  Dimensions,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { colors } from '../theme';
import { useFocusEffect } from '@react-navigation/native';

import { useClawStore } from '../store/clawStore';
import { apiRequest } from '../api/client';
import { formatDistanceToNow } from '../utils/dateUtils';

const { width } = Dimensions.get('window');

// Real Icelandic store context
const STORE_CONTEXTS: any = {
  bonus: { icon: 'cart', color: colors.primary.DEFAULT, label: 'At Bónus' },
  kronan: { icon: 'cart', color: colors.success.DEFAULT, label: 'At Krónan' },
  hagkaup: { icon: 'storefront', color: colors.someday.DEFAULT, label: 'At Hagkaup' },
  costco: { icon: 'warehouse', color: colors.danger.DEFAULT, label: 'At Costco' },
  netto: { icon: 'basket', color: colors.warning.DEFAULT, label: 'At Nettó' },
  penninn: { icon: 'book', color: colors.info.DEFAULT, label: 'At Penninn' },
  kaffitar: { icon: 'cafe', color: colors.text.muted, label: 'At Kaffitár' },
  default: { icon: 'flash', color: colors.primary.DEFAULT, label: 'Right now' },
};

export default function SurfaceScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<any>(null);
  const [nearbyStores, setNearbyStores] = useState<any[]>([]);
  const [userPatterns, setUserPatterns] = useState<any>(null);
  const [isLoadingPatterns, setIsLoadingPatterns] = useState(false);
  
  const { surfaceClaws, fetchSurfaceClaws, strikeClaw, releaseClaw, error, clearError } = useClawStore();
  const [strikedIds, setStrikedIds] = useState<string[]>([]);

  // Load data when screen is focused
  useFocusEffect(
    useCallback(() => {
      loadAllData();
    }, [])
  );

  const loadAllData = async () => {
    await Promise.all([
      loadSurfaceClaws(),
      getCurrentLocation(),
      fetchUserPatterns(),
    ]);
  };

  const loadSurfaceClaws = async () => {
    setRefreshing(true);
    await fetchSurfaceClaws();
    setRefreshing(false);
  };

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      
      setCurrentLocation({
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      });

      // Check for nearby stores
      await checkNearbyStores(location.coords.latitude, location.coords.longitude);
    } catch (error) {
      console.error('Location error:', error);
    }
  };

  const checkNearbyStores = async (lat: number, lng: number) => {
    try {
      const response = await apiRequest('GET', '/notifications/nearby-stores', undefined, {
        lat,
        lng,
        radius: 500,
      });
      setNearbyStores(response?.stores || []);
    } catch (error) {
      console.error('Nearby stores error:', error);
    }
  };

  const fetchUserPatterns = async () => {
    setIsLoadingPatterns(true);
    try {
      const response = await apiRequest('GET', '/notifications/my-patterns');
      setUserPatterns(response?.patterns || response || []);
    } catch (error) {
      console.error('Patterns error:', error);
    } finally {
      setIsLoadingPatterns(false);
    }
  };

  const handleStrike = async (clawId: string, category: string, actionType: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setStrikedIds([...strikedIds, clawId]);
    
    // Log pattern for AI learning
    try {
      await apiRequest('POST', '/notifications/patterns/log-strike', {
        category,
        action_type: actionType,
      });
    } catch (error) {
      console.error('Pattern logging error:', error);
    }
    
    // Animate then remove
    setTimeout(() => {
      strikeClaw(clawId);
    }, 300);
  };

  const handleRelease = async (clawId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    releaseClaw(clawId);
  };

  const getContextIcon = (appTrigger?: string) => {
    return STORE_CONTEXTS[appTrigger || 'default'] || STORE_CONTEXTS.default;
  };

  const getActionLabel = (actionType?: string) => {
    const labels: any = {
      buy: 'Buy now',
      read: 'Read',
      watch: 'Watch',
      try: 'Try it',
      call: 'Call',
      remember: 'Remember',
    };
    return labels[actionType || ''] || 'Do it';
  };

  // AI-powered suggestion based on patterns
  const getSmartSuggestion = () => {
    if (!userPatterns?.location_patterns?.length) return null;
    
    const topPattern = userPatterns.location_patterns[0];
    if (topPattern.visit_count >= 3) {
      return {
        chain: topPattern.location_chain,
        message: `You often visit ${topPattern.location_chain} around this time`,
      };
    }
    return null;
  };

  const renderClaw = ({ item }: { item: any }) => {
    const isStriked = strikedIds.includes(item.id);
    const context = getContextIcon(item.app_trigger);
    
    return (
      <Animated.View style={[styles.card, isStriked && styles.cardStriked]}>
        {/* Context Badge */}
        <View style={[styles.contextBadge, { backgroundColor: `${context.color}20` }]}>
          <Ionicons name={context.icon} size={16} color={context.color} />
          <Text style={[styles.contextText, { color: context.color }]}>
            {item.location_name || context.label}
          </Text>
        </View>

        {/* Title */}
        <Text style={styles.clawTitle}>{item.title || item.content}</Text>

        {/* Category Badge */}
        {item.category && (
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{item.category}</Text>
          </View>
        )}

        {/* Expiry */}
        <Text style={styles.expiryText}>
          Expires {formatDistanceToNow(item.expires_at)}
        </Text>

        {/* Action Buttons */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.releaseButton}
            onPress={() => handleRelease(item.id)}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={20} color="#888" />
            <Text style={styles.releaseText}>Release</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.strikeButton}
            onPress={() => handleStrike(item.id, item.category, item.action_type)}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#4CAF50', '#45a049']}
              style={styles.strikeGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="checkmark" size={20} color="#fff" />
              <Text style={styles.strikeText}>{getActionLabel(item.action_type)}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };

  const smartSuggestion = getSmartSuggestion();

  // Nearby stores banner
  const renderNearbyBanner = () => {
    if (!nearbyStores.length) return null;
    
    const closest = nearbyStores[0];
    return (
      <View style={styles.nearbyBanner}>
        <Ionicons name="location" size={20} color="#FF6B35" />
        <Text style={styles.nearbyText}>
          Near {closest.name} ({closest.distance_meters}m)
        </Text>
      </View>
    );
  };

  return (
    <LinearGradient colors={['#1a1a2e', '#16213e']} style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Strike Now</Text>
        <Text style={styles.headerSubtitle}>
          {surfaceClaws.length} intention{surfaceClaws.length !== 1 ? 's' : ''} ready
        </Text>
      </View>

      {/* Nearby Banner */}
      {renderNearbyBanner()}

      {/* AI Suggestion */}
      {smartSuggestion && (
        <View style={styles.aiSuggestion}>
          <Ionicons name="sparkles" size={16} color="#7ee8fa" />
          <Text style={styles.aiText}>{smartSuggestion.message}</Text>
        </View>
      )}

      {/* List */}
      {surfaceClaws.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIcon}>
            <Ionicons name="flash-outline" size={80} color="#333" />
          </View>
          <Text style={styles.emptyTitle}>Nothing to surface</Text>
          <Text style={styles.emptySubtitle}>
            Capture some intentions and we'll notify you when the context is right
          </Text>
          <TouchableOpacity style={styles.refreshButton} onPress={loadAllData} activeOpacity={0.8}>
            <Ionicons name="refresh" size={20} color="#FF6B35" />
            <Text style={styles.refreshText}>Check Now</Text>
          </TouchableOpacity>
          
          {nearbyStores.length > 0 && (
            <View style={styles.nearbyStoresBox}>
              <Text style={styles.nearbyStoresTitle}>Nearby stores:</Text>
              {nearbyStores.slice(0, 3).map((store, idx) => (
                <Text key={idx} style={styles.nearbyStoreItem}>
                  • {store.name} ({store.distance_meters}m)
                </Text>
              ))}
            </View>
          )}
        </View>
      ) : (
        <FlatList
          data={surfaceClaws}
          renderItem={renderClaw}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={loadAllData}
              tintColor="#FF6B35"
              colors={['#FF6B35']}
            />
          }
        />
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#888',
    marginTop: 4,
  },
  nearbyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 53, 0.15)',
    marginHorizontal: 16,
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  nearbyText: {
    color: '#FF6B35',
    fontSize: 14,
    marginLeft: 8,
    fontWeight: '600',
  },
  aiSuggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(126, 232, 250, 0.1)',
    marginHorizontal: 16,
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#7ee8fa',
  },
  aiText: {
    color: '#7ee8fa',
    fontSize: 14,
    marginLeft: 8,
  },
  list: {
    padding: 16,
  },
  card: {
    backgroundColor: '#0f3460',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B35',
  },
  cardStriked: {
    opacity: 0.5,
    transform: [{ scale: 0.95 }],
  },
  contextBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 12,
  },
  contextText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  clawTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
    lineHeight: 28,
  },
  categoryBadge: {
    backgroundColor: 'rgba(255, 107, 53, 0.2)',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
  },
  categoryText: {
    color: '#FF6B35',
    fontSize: 12,
    textTransform: 'capitalize',
    fontWeight: '600',
  },
  expiryText: {
    color: '#666',
    fontSize: 13,
    marginBottom: 16,
  },
  actionsRow: {
    flexDirection: 'row',
  },
  releaseButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(136, 136, 136, 0.1)',
    paddingVertical: 14,
    borderRadius: 12,
    marginRight: 12,
  },
  releaseText: {
    color: '#888',
    fontWeight: '600',
    marginLeft: 6,
  },
  strikeButton: {
    flex: 2,
    borderRadius: 12,
    overflow: 'hidden',
  },
  strikeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  strikeText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 53, 0.3)',
  },
  refreshText: {
    color: '#FF6B35',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
  },
  nearbyStoresBox: {
    marginTop: 32,
    backgroundColor: '#0f3460',
    padding: 16,
    borderRadius: 16,
    width: '100%',
  },
  nearbyStoresTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  nearbyStoreItem: {
    color: '#888',
    fontSize: 14,
    marginBottom: 6,
  },
});
