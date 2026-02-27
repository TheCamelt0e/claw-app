/**
 * 🎵 AUDIO STORE - Voice Cache for Living Splash
 * 
 * Caches last voice capture for instant playback on app launch
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AudioState {
  // Last capture metadata
  lastCaptureContent: string;
  lastCaptureCategory: string;
  lastCaptureTimestamp: number;
  
  // Waveform data (extracted from audio)
  waveformData: number[];
  
  // Actions
  setLastCapture: (content: string, category: string) => Promise<void>;
  setWaveformData: (data: number[]) => void;
  loadCachedCapture: () => Promise<void>;
  clearCache: () => Promise<void>;
}

const LAST_CAPTURE_KEY = '@last_capture';
const WAVEFORM_KEY = '@waveform_data';

export const useAudioStore = create<AudioState>((set, get) => ({
  lastCaptureContent: '',
  lastCaptureCategory: 'task',
  lastCaptureTimestamp: 0,
  waveformData: [],
  
  setLastCapture: async (content: string, category: string) => {
    const data = {
      content,
      category,
      timestamp: Date.now(),
    };
    
    try {
      await AsyncStorage.setItem(LAST_CAPTURE_KEY, JSON.stringify(data));
      set({
        lastCaptureContent: content,
        lastCaptureCategory: category,
        lastCaptureTimestamp: data.timestamp,
      });
    } catch (e) {
      console.error('Failed to save last capture:', e);
    }
  },
  
  setWaveformData: async (data: number[]) => {
    try {
      await AsyncStorage.setItem(WAVEFORM_KEY, JSON.stringify(data));
      set({ waveformData: data });
    } catch (e) {
      console.error('Failed to save waveform:', e);
    }
  },
  
  loadCachedCapture: async () => {
    try {
      const [captureJson, waveformJson] = await Promise.all([
        AsyncStorage.getItem(LAST_CAPTURE_KEY),
        AsyncStorage.getItem(WAVEFORM_KEY),
      ]);
      
      if (captureJson) {
        const capture = JSON.parse(captureJson);
        set({
          lastCaptureContent: capture.content || '',
          lastCaptureCategory: capture.category || 'task',
          lastCaptureTimestamp: capture.timestamp || 0,
        });
      }
      
      if (waveformJson) {
        set({ waveformData: JSON.parse(waveformJson) });
      }
    } catch (e) {
      console.error('Failed to load cached capture:', e);
    }
  },
  
  clearCache: async () => {
    try {
      await AsyncStorage.multiRemove([LAST_CAPTURE_KEY, WAVEFORM_KEY]);
      set({
        lastCaptureContent: '',
        lastCaptureCategory: 'task',
        lastCaptureTimestamp: 0,
        waveformData: [],
      });
    } catch (e) {
      console.error('Failed to clear cache:', e);
    }
  },
}));
