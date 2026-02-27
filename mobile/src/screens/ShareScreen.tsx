/**
 * Share Screen - Share CLAW with friends
 */
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const SHARE_MESSAGE = `🦀 Check out CLAW - the app that captures your intentions and surfaces them when you need them most!

Never forget "that book Sarah recommended" again.

Download: https://claw.app`;

export default function ShareScreen({ navigation }: any) {
  const handleShare = async () => {
    try {
      await Share.share({
        message: SHARE_MESSAGE,
        title: 'Share CLAW',
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const shareOptions = [
    {
      icon: 'logo-whatsapp',
      name: 'WhatsApp',
      color: '#25D366',
      onPress: handleShare,
    },
    {
      icon: 'logo-twitter',
      name: 'Twitter',
      color: '#1DA1F2',
      onPress: handleShare,
    },
    {
      icon: 'logo-instagram',
      name: 'Instagram',
      color: '#E4405F',
      onPress: handleShare,
    },
    {
      icon: 'chatbubble',
      name: 'Messages',
      color: '#34C759',
      onPress: handleShare,
    },
    {
      icon: 'mail',
      name: 'Email',
      color: '#EA4335',
      onPress: handleShare,
    },
    {
      icon: 'copy',
      name: 'Copy Link',
      color: '#888',
      onPress: handleShare,
    },
  ];

  return (
    <LinearGradient colors={['#1a1a2e', '#16213e']} style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Share CLAW</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Hero Section */}
      <View style={styles.hero}>
        <View style={styles.iconContainer}>
          <Ionicons name="share-social" size={48} color="#FF6B35" />
        </View>
        <Text style={styles.heroTitle}>Share the Magic</Text>
        <Text style={styles.heroSubtitle}>
          Help your friends never forget their intentions again
        </Text>
      </View>

      {/* Share Grid */}
      <View style={styles.shareGrid}>
        {shareOptions.map((option) => (
          <TouchableOpacity
            key={option.name}
            style={styles.shareOption}
            onPress={option.onPress}
            activeOpacity={0.8}
          >
            <View style={[styles.shareIcon, { backgroundColor: `${option.color}20` }]}>
              <Ionicons name={option.icon as any} size={28} color={option.color} />
            </View>
            <Text style={styles.shareName}>{option.name}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Referral Code */}
      <View style={styles.referralBox}>
        <Text style={styles.referralLabel}>Your Referral Code</Text>
        <View style={styles.codeContainer}>
          <Text style={styles.codeText}>CLAW2024</Text>
          <TouchableOpacity style={styles.copyButton} activeOpacity={0.7}>
            <Ionicons name="copy-outline" size={20} color="#FF6B35" />
          </TouchableOpacity>
        </View>
        <Text style={styles.referralHint}>
          Share this code and get 1 month free Pro when friends sign up!
        </Text>
      </View>

      {/* Stats */}
      <View style={styles.statsBox}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>0</Text>
          <Text style={styles.statLabel}>Friends Joined</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>0</Text>
          <Text style={styles.statLabel}>Free Months</Text>
        </View>
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
  hero: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  shareGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  shareOption: {
    alignItems: 'center',
    marginHorizontal: 12,
    marginBottom: 20,
    width: 70,
  },
  shareIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  shareName: {
    color: '#ccc',
    fontSize: 12,
  },
  referralBox: {
    backgroundColor: '#0f3460',
    marginHorizontal: 16,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  referralLabel: {
    color: '#888',
    fontSize: 14,
    marginBottom: 12,
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 53, 0.3)',
  },
  codeText: {
    color: '#FF6B35',
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  copyButton: {
    marginLeft: 12,
    padding: 4,
  },
  referralHint: {
    color: '#888',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 12,
  },
  statsBox: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f3460',
    marginHorizontal: 16,
    padding: 20,
    borderRadius: 16,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#333',
  },
  statNumber: {
    color: '#FF6B35',
    fontSize: 28,
    fontWeight: 'bold',
  },
  statLabel: {
    color: '#888',
    fontSize: 13,
    marginTop: 4,
  },
});
