/**
 * Notifications Screen - Manage notification preferences
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Notifications from 'expo-notifications';
import { colors } from '../theme';

export default function NotificationsScreen({ navigation }: any) {
  const [settings, setSettings] = useState({
    surfaceAlerts: true,
    expiryWarnings: true,
    dailyDigest: false,
    marketingEmails: false,
  });

  const toggleSetting = (key: keyof typeof settings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <LinearGradient colors={['#1a1a2e', '#16213e']} style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        {/* Description */}
        <Text style={styles.description}>
          Choose what notifications you want to receive from CLAW
        </Text>

        {/* Notification Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Smart Alerts</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="flash" size={22} color="#FF6B35" />
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>Surface Alerts</Text>
                <Text style={styles.settingDesc}>When intentions surface in context</Text>
              </View>
            </View>
            <Switch
              value={settings.surfaceAlerts}
              onValueChange={() => toggleSetting('surfaceAlerts')}
              trackColor={{ false: '#333', true: '#FF6B35' }}
              thumbColor="#fff"
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="time-outline" size={22} color="#e94560" />
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>Expiry Warnings</Text>
                <Text style={styles.settingDesc}>Before your intentions expire</Text>
              </View>
            </View>
            <Switch
              value={settings.expiryWarnings}
              onValueChange={() => toggleSetting('expiryWarnings')}
              trackColor={{ false: '#333', true: '#FF6B35' }}
              thumbColor="#fff"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Other</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="newspaper-outline" size={22} color="#7ee8fa" />
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>Daily Digest</Text>
                <Text style={styles.settingDesc}>Summary of your active intentions</Text>
              </View>
            </View>
            <Switch
              value={settings.dailyDigest}
              onValueChange={() => toggleSetting('dailyDigest')}
              trackColor={{ false: '#333', true: '#FF6B35' }}
              thumbColor="#fff"
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="mail-outline" size={22} color={colors.someday.DEFAULT} />
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>Marketing</Text>
                <Text style={styles.settingDesc}>Product updates and tips</Text>
              </View>
            </View>
            <Switch
              value={settings.marketingEmails}
              onValueChange={() => toggleSetting('marketingEmails')}
              trackColor={{ false: '#333', true: '#FF6B35' }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* Test Notification */}
        <TouchableOpacity 
          style={styles.testButton} 
          activeOpacity={0.8}
          onPress={async () => {
            try {
              await Notifications.scheduleNotificationAsync({
                content: {
                  title: '🔔 CLAW Test Notification',
                  body: 'Notifications are working! You\'ll get alerts near stores.',
                  sound: 'default',
                },
                trigger: null, // Immediate
              });
              Alert.alert('✓ Sent!', 'Check your notification tray!');
            } catch (error) {
              Alert.alert('Error', 'Could not send test notification. Check permissions.');
            }
          }}
        >
          <Ionicons name="notifications-outline" size={20} color="#FF6B35" />
          <Text style={styles.testButtonText}>Send Test Notification</Text>
        </TouchableOpacity>
      </ScrollView>
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
  description: {
    color: '#888',
    fontSize: 14,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#FF6B35',
    fontSize: 14,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0f3460',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingText: {
    marginLeft: 12,
    flex: 1,
  },
  settingLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  settingDesc: {
    color: '#888',
    fontSize: 13,
    marginTop: 2,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 53, 0.3)',
  },
  testButtonText: {
    color: '#FF6B35',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
