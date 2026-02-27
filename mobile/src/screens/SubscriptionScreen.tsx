/**
 * Subscription Screen - Pro Upgrade Paywall
 * 
 * Converts free users to Pro subscribers.
 * $2.99/month for unlimited AI, shared lists, advanced insights.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

const FEATURES = [
  {
    icon: 'infinite',
    title: 'Unlimited AI',
    description: 'No daily limits on smart captures',
  },
  {
    icon: 'people',
    title: 'Shared Lists',
    description: 'Create unlimited groups for family',
  },
  {
    icon: 'location',
    title: 'Smart Geofencing',
    description: 'Notify the right person near stores',
  },
  {
    icon: 'analytics',
    title: 'Advanced Insights',
    description: 'Deep pattern analysis & predictions',
  },
  {
    icon: 'cloud-upload',
    title: 'Priority Sync',
    description: 'Faster offline sync',
  },
  {
    icon: 'heart',
    title: 'Support Development',
    description: 'Help us build more features',
  },
];

const TESTIMONIALS = [
  {
    text: "Shared lists saved my marriage. No more 'I thought YOU got the milk!'",
    author: "Sarah, Iceland",
  },
  {
    text: "The AI just knows when I need to shop. It's creepy but amazing.",
    author: "Mike, Reykjavik",
  },
];

export default function SubscriptionScreen({ navigation }: any) {
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubscribe = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setIsLoading(true);
    
    // TODO: Integrate with RevenueCat or Stripe
    // For now, just show success
    
    setTimeout(() => {
      setIsLoading(false);
      Alert.alert(
        'Coming Soon!',
        'In-app purchases will be available in the next update. Thanks for your interest!',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    }, 1500);
  };

  const handleRestore = () => {
    Alert.alert('Restore Purchases', 'Checking for existing subscriptions...');
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <LinearGradient colors={['#FFD700', '#FF6B35']} style={styles.header}>
        <TouchableOpacity 
          style={styles.closeButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="close" size={28} color="#fff" />
        </TouchableOpacity>
        
        <View style={styles.proBadge}>
          <Ionicons name="star" size={40} color="#FFD700" />
        </View>
        <Text style={styles.headerTitle}>Upgrade to Pro</Text>
        <Text style={styles.headerSubtitle}>
          Unlock the full power of CLAW
        </Text>
      </LinearGradient>

      <View style={styles.content}>
        {/* Pricing */}
        <View style={styles.pricingContainer}>
          <TouchableOpacity
            style={[
              styles.planCard,
              selectedPlan === 'monthly' && styles.planCardSelected,
            ]}
            onPress={() => setSelectedPlan('monthly')}
            activeOpacity={0.8}
          >
            <Text style={styles.planLabel}>Monthly</Text>
            <Text style={styles.planPrice}>$2.99</Text>
            <Text style={styles.planPeriod}>/month</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.planCard,
              selectedPlan === 'yearly' && styles.planCardSelected,
            ]}
            onPress={() => setSelectedPlan('yearly')}
            activeOpacity={0.8}
          >
            <View style={styles.saveBadge}>
              <Text style={styles.saveText}>SAVE 33%</Text>
            </View>
            <Text style={styles.planLabel}>Yearly</Text>
            <Text style={styles.planPrice}>$23.99</Text>
            <Text style={styles.planPeriod}>/year</Text>
            <Text style={styles.planEquivalent}>$1.99/month</Text>
          </TouchableOpacity>
        </View>

        {/* Features */}
        <View style={styles.featuresCard}>
          <Text style={styles.featuresTitle}>Pro Features</Text>
          {FEATURES.map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <View style={styles.featureIcon}>
                <Ionicons name={feature.icon as any} size={22} color="#FFD700" />
              </View>
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDescription}>{feature.description}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Testimonials */}
        <View style={styles.testimonialsCard}>
          <Text style={styles.testimonialsTitle}>What Users Say</Text>
          {TESTIMONIALS.map((t, index) => (
            <View key={index} style={styles.testimonial}>
              <Text style={styles.testimonialText}>"{t.text}"</Text>
              <Text style={styles.testimonialAuthor}>— {t.author}</Text>
            </View>
          ))}
        </View>

        {/* CTA */}
        <TouchableOpacity
          style={styles.subscribeButton}
          onPress={handleSubscribe}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#FFD700', '#FF6B35']}
            style={styles.subscribeGradient}
          >
            {isLoading ? (
              <Text style={styles.subscribeText}>Processing...</Text>
            ) : (
              <>
                <Text style={styles.subscribeText}>
                  Subscribe {selectedPlan === 'yearly' ? 'Yearly' : 'Monthly'}
                </Text>
                <Text style={styles.subscribeSubtext}>
                  {selectedPlan === 'yearly' ? '$23.99/year' : '$2.99/month'}
                </Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity style={styles.restoreButton} onPress={handleRestore}>
          <Text style={styles.restoreText}>Restore Purchases</Text>
        </TouchableOpacity>

        <Text style={styles.termsText}>
          Cancel anytime. Subscription auto-renews unless cancelled 24 hours before renewal.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 40,
    alignItems: 'center',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  proBadge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
  },
  content: {
    padding: 20,
  },
  pricingContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  planCard: {
    flex: 1,
    backgroundColor: '#2d2d44',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  planCardSelected: {
    borderColor: '#FFD700',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
  },
  saveBadge: {
    position: 'absolute',
    top: -10,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  saveText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  planLabel: {
    fontSize: 14,
    color: '#888',
    marginBottom: 8,
  },
  planPrice: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  planPeriod: {
    fontSize: 14,
    color: '#888',
    marginTop: 2,
  },
  planEquivalent: {
    fontSize: 12,
    color: '#4CAF50',
    marginTop: 6,
  },
  featuresCard: {
    backgroundColor: '#2d2d44',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  featureDescription: {
    fontSize: 13,
    color: '#888',
  },
  testimonialsCard: {
    backgroundColor: '#2d2d44',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  testimonialsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  testimonial: {
    marginBottom: 16,
    paddingLeft: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#FFD700',
  },
  testimonialText: {
    fontSize: 15,
    color: '#fff',
    fontStyle: 'italic',
    lineHeight: 22,
    marginBottom: 8,
  },
  testimonialAuthor: {
    fontSize: 13,
    color: '#888',
  },
  subscribeButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  subscribeGradient: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  subscribeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a2e',
  },
  subscribeSubtext: {
    fontSize: 13,
    color: '#1a1a2e',
    opacity: 0.8,
    marginTop: 2,
  },
  restoreButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  restoreText: {
    fontSize: 14,
    color: '#888',
    textDecorationLine: 'underline',
  },
  termsText: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 18,
  },
});
