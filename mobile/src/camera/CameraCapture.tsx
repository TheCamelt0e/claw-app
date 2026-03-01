/**
 * Camera Capture - Visual CLAW
 * 
 * AI Vision for capturing books, products, restaurants visually
 */
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, spacing, borderRadius, typography } from '../theme';
import { apiRequest } from '../api/client';

interface CameraCaptureProps {
  visible: boolean;
  onClose: () => void;
  onCapture: (imageUri: string, analysis: any) => void;
}

export default function CameraCapture({ visible, onClose, onCapture }: CameraCaptureProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const analyzeImage = async (base64Image: string) => {
    try {
      const result = await apiRequest<any>('POST', '/ai/analyze-image', {
        image_base64: base64Image,
        mime_type: 'image/jpeg',
      });
      return result;
    } catch (error: any) {
      console.error('Image analysis error:', error);
      throw error;
    }
  };

  const takePicture = async () => {
    if (!cameraRef.current) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7,
        base64: true,
      });

      if (photo && photo.base64) {
        setIsAnalyzing(true);
        
        try {
          // Call AI vision API
          const analysis = await analyzeImage(photo.base64);
          
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          
          onCapture(photo.uri, analysis);
        } catch (error: any) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          
          if (error.message?.includes('429')) {
            Alert.alert(
              'AI Rate Limited',
              'The AI is thinking too hard! Try again in a minute.',
              [{ text: 'OK' }]
            );
          } else {
            // Fallback: still capture but with basic info
            onCapture(photo.uri, {
              type: 'other',
              title: 'Captured photo',
              description: 'Photo captured (AI analysis failed)',
              category: 'other',
              tags: ['photo', 'captured'],
              action_type: 'remember',
              confidence: 0.5,
              source: 'fallback',
            });
          }
        } finally {
          setIsAnalyzing(false);
        }
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Error', 'Could not capture photo');
      setIsAnalyzing(false);
    }
  };

  const toggleCameraFacing = () => {
    setFacing((current: CameraType) => (current === 'back' ? 'front' : 'back'));
  };

  if (!permission) {
    return (
      <Modal visible={visible} animationType="slide">
        <View style={styles.permissionContainer}>
          <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
        </View>
      </Modal>
    );
  }

  if (!permission.granted) {
    return (
      <Modal visible={visible} animationType="slide">
        <View style={styles.permissionContainer}>
          <Ionicons name="camera" size={64} color={colors.text.muted} />
          <Text style={styles.permissionTitle}>Camera Access Needed</Text>
          <Text style={styles.permissionText}>
            CLAW uses your camera to capture books, products, and more.
          </Text>
          <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
            <Text style={styles.permissionBtnText}>Grant Permission</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide">
      <View style={styles.container}>
        <CameraView 
          style={styles.camera} 
          facing={facing}
          ref={cameraRef}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Visual Capture</Text>
            <TouchableOpacity style={styles.flipBtn} onPress={toggleCameraFacing}>
              <Ionicons name="camera-reverse" size={28} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Guide Overlay */}
          <View style={styles.guideContainer}>
            <View style={styles.guideFrame}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
            </View>
            <Text style={styles.guideText}>
              Point at a book, product, or menu
            </Text>
          </View>

          {/* Capture Button */}
          <View style={styles.controls}>
            {isAnalyzing ? (
              <View style={styles.analyzing}>
                <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
                <Text style={styles.analyzingText}>AI Analyzing...</Text>
              </View>
            ) : (
              <TouchableOpacity style={styles.captureBtn} onPress={takePicture}>
                <View style={styles.captureInner} />
              </TouchableOpacity>
            )}
          </View>

          {/* Categories */}
          <View style={styles.categories}>
            <Text style={styles.categoryLabel}>Good for:</Text>
            <View style={styles.categoryRow}>
              <View style={styles.categoryChip}>
                <Ionicons name="book" size={16} color={colors.primary.DEFAULT} />
                <Text style={styles.categoryText}>Books</Text>
              </View>
              <View style={styles.categoryChip}>
                <Ionicons name="cart" size={16} color={colors.primary.DEFAULT} />
                <Text style={styles.categoryText}>Products</Text>
              </View>
              <View style={styles.categoryChip}>
                <Ionicons name="restaurant" size={16} color={colors.primary.DEFAULT} />
                <Text style={styles.categoryText}>Menus</Text>
              </View>
            </View>
          </View>
        </CameraView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  closeBtn: {
    padding: 8,
  },
  flipBtn: {
    padding: 8,
  },
  guideContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  guideFrame: {
    width: 280,
    height: 280,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: colors.primary.DEFAULT,
    borderWidth: 3,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  guideText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginTop: 20,
  },
  controls: {
    alignItems: 'center',
    paddingBottom: 40,
  },
  captureBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fff',
  },
  analyzing: {
    alignItems: 'center',
  },
  analyzingText: {
    color: '#fff',
    marginTop: 12,
    fontSize: 16,
  },
  categories: {
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  categoryLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  categoryText: {
    color: '#fff',
    fontSize: 12,
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: colors.background.DEFAULT,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  permissionTitle: {
    color: colors.text.primary,
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 8,
  },
  permissionText: {
    color: colors.text.muted,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
  },
  permissionBtn: {
    backgroundColor: colors.primary.DEFAULT,
    paddingHorizontal: 30,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 12,
  },
  permissionBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelBtn: {
    padding: 12,
  },
  cancelText: {
    color: colors.text.muted,
    fontSize: 16,
  },
});
