/**
 * Expiry Settings Screen - Configure default expiration
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const EXPIRY_OPTIONS = [
  { days: 1, label: '1 Day', desc: 'For urgent tasks' },
  { days: 3, label: '3 Days', desc: 'Short-term memory' },
  { days: 7, label: '7 Days', desc: 'Recommended' },
  { days: 14, label: '14 Days', desc: 'Two weeks' },
  { days: 30, label: '30 Days', desc: 'Long-term storage' },
  { days: 90, label: '90 Days', desc: 'Seasonal reminders' },
];

export default function ExpirySettingsScreen({ navigation }: any) {
  const [selectedDays, setSelectedDays] = useState(7);

  return (
    <LinearGradient colors={['#1a1a2e', '#16213e']} style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Default Expiry</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        {/* Description */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={24} color="#7ee8fa" />
          <Text style={styles.infoText}>
            How long should new intentions stay active by default? You can always change this for individual items.
          </Text>
        </View>

        {/* Options */}
        <View style={styles.optionsContainer}>
          {EXPIRY_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.days}
              style={[
                styles.optionCard,
                selectedDays === option.days && styles.optionCardActive,
              ]}
              onPress={() => setSelectedDays(option.days)}
              activeOpacity={0.8}
            >
              <View style={styles.optionLeft}>
                <View style={[
                  styles.radioButton,
                  selectedDays === option.days && styles.radioButtonActive,
                ]}>
                  {selectedDays === option.days && (
                    <View style={styles.radioButtonInner} />
                  )}
                </View>
                <View>
                  <Text style={[
                    styles.optionLabel,
                    selectedDays === option.days && styles.optionLabelActive,
                  ]}>
                    {option.label}
                  </Text>
                  <Text style={styles.optionDesc}>{option.desc}</Text>
                </View>
              </View>
              {selectedDays === option.days && (
                <Ionicons name="checkmark-circle" size={24} color="#FF6B35" />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Custom Option */}
        <TouchableOpacity style={styles.customButton} activeOpacity={0.8}>
          <Ionicons name="create-outline" size={20} color="#888" />
          <Text style={styles.customButtonText}>Set Custom Duration</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Save Button */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.saveButton} activeOpacity={0.8}>
          <LinearGradient
            colors={['#FF6B35', '#e94560']}
            style={styles.saveGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.saveButtonText}>Save Preference</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(126, 232, 250, 0.1)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#7ee8fa',
  },
  infoText: {
    color: '#ccc',
    fontSize: 14,
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
  optionsContainer: {
    marginBottom: 16,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0f3460',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  optionCardActive: {
    backgroundColor: 'rgba(255, 107, 53, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 53, 0.5)',
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#666',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  radioButtonActive: {
    borderColor: '#FF6B35',
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FF6B35',
  },
  optionLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  optionLabelActive: {
    color: '#FF6B35',
  },
  optionDesc: {
    color: '#888',
    fontSize: 13,
    marginTop: 2,
  },
  customButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#444',
    borderStyle: 'dashed',
  },
  customButtonText: {
    color: '#888',
    fontSize: 16,
    marginLeft: 8,
  },
  footer: {
    padding: 16,
    paddingBottom: 32,
  },
  saveButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  saveGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
