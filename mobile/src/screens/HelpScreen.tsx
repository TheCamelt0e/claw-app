/**
 * Help Screen - FAQ and support
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const FAQS = [
  {
    question: 'What is CLAW?',
    answer: 'CLAW is a context-aware reminder app. Instead of setting time-based alarms, you capture intentions and we surface them when the context is right - like when you\'re near a store or using a specific app.',
  },
  {
    question: 'How does the Strike system work?',
    answer: 'When an intention surfaces at the right moment, you can "Strike" it (mark as done) or "Release" it (snooze/dismiss). This keeps your vault clean and actionable.',
  },
  {
    question: 'What happens when intentions expire?',
    answer: 'Expired intentions move to the "Expired" tab in your Vault. You can extend them, strike them, or let them auto-archive after 30 days.',
  },
  {
    question: 'How do I get more surface alerts?',
    answer: 'Enable location permissions and connect apps in Settings. The more context we have, the smarter our surfacing becomes.',
  },
  {
    question: 'Is my data private?',
    answer: 'Absolutely. Your intentions are encrypted and never sold. We only use your data to provide the CLAW service.',
  },
];

const SUPPORT_OPTIONS = [
  {
    icon: 'mail',
    title: 'Email Support',
    subtitle: 'hello@claw.app',
    action: () => Linking.openURL('mailto:hello@claw.app'),
  },
  {
    icon: 'chatbubbles',
    title: 'Live Chat',
    subtitle: 'Available 9am-5pm',
    action: () => {},
  },
  {
    icon: 'book',
    title: 'Documentation',
    subtitle: 'guides.claw.app',
    action: () => Linking.openURL('https://claw.app/guides'),
  },
];

function FAQItem({ item }: { item: typeof FAQS[0] }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <TouchableOpacity
      style={styles.faqItem}
      onPress={() => setExpanded(!expanded)}
      activeOpacity={0.8}
    >
      <View style={styles.faqHeader}>
        <Text style={styles.faqQuestion}>{item.question}</Text>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color="#888"
        />
      </View>
      {expanded && (
        <Text style={styles.faqAnswer}>{item.answer}</Text>
      )}
    </TouchableOpacity>
  );
}

export default function HelpScreen({ navigation }: any) {
  return (
    <LinearGradient colors={['#1a1a2e', '#16213e']} style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help & Support</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        {/* Support Options */}
        <View style={styles.supportSection}>
          <Text style={styles.sectionTitle}>Contact Us</Text>
          {SUPPORT_OPTIONS.map((option, index) => (
            <TouchableOpacity
              key={index}
              style={styles.supportItem}
              onPress={option.action}
              activeOpacity={0.7}
            >
              <View style={styles.supportIcon}>
                <Ionicons name={option.icon as any} size={22} color="#FF6B35" />
              </View>
              <View style={styles.supportText}>
                <Text style={styles.supportTitle}>{option.title}</Text>
                <Text style={styles.supportSubtitle}>{option.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#666" />
            </TouchableOpacity>
          ))}
        </View>

        {/* FAQ Section */}
        <View style={styles.faqSection}>
          <Text style={styles.sectionTitle}>Frequently Asked</Text>
          {FAQS.map((faq, index) => (
            <FAQItem key={index} item={faq} />
          ))}
        </View>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={styles.appInfoText}>CLAW v1.0.0</Text>
          <Text style={styles.appInfoSubtext}>
            Made with 🦀 in Iceland{'\n'}
            © 2024 CLAW Inc.
          </Text>
        </View>
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
  supportSection: {
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
  supportItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f3460',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  supportIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  supportText: {
    flex: 1,
    marginLeft: 16,
  },
  supportTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  supportSubtitle: {
    color: '#888',
    fontSize: 13,
    marginTop: 2,
  },
  faqSection: {
    marginBottom: 24,
  },
  faqItem: {
    backgroundColor: '#0f3460',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  faqQuestion: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 12,
  },
  faqAnswer: {
    color: '#888',
    fontSize: 14,
    marginTop: 12,
    lineHeight: 20,
  },
  appInfo: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  appInfoText: {
    color: '#666',
    fontSize: 14,
  },
  appInfoSubtext: {
    color: '#444',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
  },
});
