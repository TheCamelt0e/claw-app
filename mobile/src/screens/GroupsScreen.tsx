/**
 * Groups Screen - Shared Lists (Pro Feature)
 * 
 * Family grocery lists with:
 * - Real-time sync (polling)
 * - "I got this" claim system
 * - Member avatars
 * - Who's near the store notifications
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { 
  getMyGroups, 
  createGroup, 
  Group, 
  GroupItem,
  captureToGroup,
  claimGroupItem,
  strikeGroupItem,
  inviteMember,
  leaveGroup,
} from '../service/groups';

// Mock current user - replace with auth store
const CURRENT_USER_ID = 'test-user-id';

export default function GroupsScreen({ navigation }: any) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [groupItems, setGroupItems] = useState<GroupItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Create group modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  
  // Capture to group
  const [newItemContent, setNewItemContent] = useState('');

  useEffect(() => {
    loadGroups();
  }, []);

  // Poll for updates when viewing a group
  useEffect(() => {
    if (!selectedGroup) return;
    
    const interval = setInterval(() => {
      loadGroupItems(selectedGroup.id);
    }, 5000); // Poll every 5 seconds
    
    return () => clearInterval(interval);
  }, [selectedGroup]);

  const loadGroups = async () => {
    setIsLoading(true);
    try {
      const myGroups = await getMyGroups();
      setGroups(myGroups);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load groups');
    } finally {
      setIsLoading(false);
    }
  };

  const loadGroupItems = async (groupId: string) => {
    try {
      // This would be replaced with getGroup() that returns items
      // For now, mock data
    } catch (error) {
      console.error('Failed to load group items:', error);
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      const result = await createGroup(newGroupName.trim());
      setGroups([...groups, result.group]);
      setNewGroupName('');
      setShowCreateModal(false);
      Alert.alert('Success!', `Group "${result.group.name}" created!`);
    } catch (error: any) {
      if (error.message?.includes('Free users')) {
        Alert.alert(
          'Pro Feature',
          'Free users can only create 1 group. Upgrade to Pro for unlimited groups!',
          [
            { text: 'Not Now', style: 'cancel' },
            { text: 'Upgrade', onPress: () => navigation.navigate('Subscription') },
          ]
        );
      } else {
        Alert.alert('Error', error.message || 'Failed to create group');
      }
    }
  };

  const handleCaptureToGroup = async () => {
    if (!newItemContent.trim() || !selectedGroup) return;
    
    try {
      await captureToGroup(selectedGroup.id, newItemContent.trim());
      setNewItemContent('');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Reload items
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to capture');
    }
  };

  const handleClaimItem = async (item: GroupItem) => {
    try {
      await claimGroupItem(selectedGroup!.id, item.group_claw_id);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      Alert.alert('Claimed!', 'Others will see you got this item.');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to claim');
    }
  };

  const handleStrikeItem = async (item: GroupItem) => {
    try {
      await strikeGroupItem(selectedGroup!.id, item.group_claw_id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Remove from list or update status
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to strike');
    }
  };

  const handleLeaveGroup = (group: Group) => {
    Alert.alert(
      'Leave Group?',
      `Leave "${group.name}"? You'll no longer see shared items.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Leave', 
          style: 'destructive',
          onPress: async () => {
            try {
              await leaveGroup(group.id);
              setGroups(groups.filter(g => g.id !== group.id));
              if (selectedGroup?.id === group.id) {
                setSelectedGroup(null);
              }
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          }
        },
      ]
    );
  };

  // Group List View
  const renderGroupList = () => (
    <View style={styles.container}>
      <LinearGradient colors={['#1a1a2e', '#16213e']} style={styles.header}>
        <Text style={styles.headerTitle}>👨‍👩‍👧‍👦 Shared Lists</Text>
        <Text style={styles.headerSubtitle}>
          {groups.length > 0 
            ? `${groups.length} group${groups.length > 1 ? 's' : ''}` 
            : 'Share grocery lists with family'}
        </Text>
      </LinearGradient>

      <FlatList
        data={groups}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadGroups} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={64} color="#444" />
            <Text style={styles.emptyTitle}>No shared lists yet</Text>
            <Text style={styles.emptyText}>
              Create a group to share grocery lists with your family or partner.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.groupCard}
            onPress={() => setSelectedGroup(item)}
            activeOpacity={0.8}
          >
            <View style={styles.groupIcon}>
              <Ionicons 
                name={getGroupIcon(item.group_type)} 
                size={28} 
                color="#FFD700" 
              />
            </View>
            <View style={styles.groupInfo}>
              <Text style={styles.groupName}>{item.name}</Text>
              <Text style={styles.groupMeta}>
                {item.member_count} member{item.member_count > 1 ? 's' : ''}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#666" />
          </TouchableOpacity>
        )}
      />

      {/* Create Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowCreateModal(true)}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#FF6B35', '#e94560']}
          style={styles.fabGradient}
        >
          <Ionicons name="add" size={32} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>

      {/* Create Group Modal */}
      {showCreateModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Create Shared List</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Family Groceries..."
              placeholderTextColor="#666"
              value={newGroupName}
              onChangeText={setNewGroupName}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={() => {
                  setShowCreateModal(false);
                  setNewGroupName('');
                }}
              >
                <Text style={styles.modalButtonTextSecondary}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={handleCreateGroup}
                disabled={!newGroupName.trim()}
              >
                <Text style={styles.modalButtonTextPrimary}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );

  // Group Detail View
  const renderGroupDetail = () => (
    <View style={styles.container}>
      <LinearGradient colors={['#1a1a2e', '#16213e']} style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setSelectedGroup(null)}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{selectedGroup!.name}</Text>
        <Text style={styles.headerSubtitle}>
          {groupItems.filter(i => i.status === 'active' || i.status === 'claimed').length} items
        </Text>
      </LinearGradient>

      {/* Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Add item to shared list..."
          placeholderTextColor="#666"
          value={newItemContent}
          onChangeText={setNewItemContent}
          onSubmitEditing={handleCaptureToGroup}
        />
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleCaptureToGroup}
          disabled={!newItemContent.trim()}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Items List */}
      <FlatList
        data={groupItems}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={[
            styles.itemCard,
            item.status === 'claimed' && styles.itemCardClaimed
          ]}>
            <TouchableOpacity
              style={styles.checkbox}
              onPress={() => handleStrikeItem(item)}
            >
              <Ionicons name="checkmark" size={20} color="#1a1a2e" />
            </TouchableOpacity>
            
            <View style={styles.itemContent}>
              <Text style={[
                styles.itemText,
                item.status === 'claimed' && styles.itemTextClaimed
              ]}>
                {item.content}
              </Text>
              {item.claimed_by && (
                <Text style={styles.claimedText}>
                  ✓ {item.claimed_by === CURRENT_USER_ID ? 'You' : 'Someone'} got this
                </Text>
              )}
            </View>

            {!item.claimed_by && item.status === 'active' && (
              <TouchableOpacity
                style={styles.claimButton}
                onPress={() => handleClaimItem(item)}
              >
                <Text style={styles.claimButtonText}>I got this</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No items yet. Add something!</Text>
          </View>
        }
      />

      {/* Leave Group */}
      <TouchableOpacity
        style={styles.leaveButton}
        onPress={() => handleLeaveGroup(selectedGroup!)}
      >
        <Text style={styles.leaveButtonText}>Leave Group</Text>
      </TouchableOpacity>
    </View>
  );

  return selectedGroup ? renderGroupDetail() : renderGroupList();
}

function getGroupIcon(type: string): any {
  const icons: { [key: string]: any } = {
    'family': 'people-outline',
    'couple': 'heart-outline',
    'roommates': 'home-outline',
    'other': 'people-circle-outline',
  };
  return icons[type] || 'people-outline';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#888',
    marginTop: 4,
  },
  backButton: {
    marginBottom: 12,
  },
  listContent: {
    padding: 16,
  },
  groupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2d2d44',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  groupIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
  },
  groupMeta: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: '#2d2d44',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonSecondary: {
    backgroundColor: '#1a1a2e',
  },
  modalButtonPrimary: {
    backgroundColor: '#FF6B35',
  },
  modalButtonTextSecondary: {
    color: '#888',
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonTextPrimary: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  input: {
    flex: 1,
    backgroundColor: '#2d2d44',
    borderRadius: 12,
    padding: 14,
    color: '#fff',
    fontSize: 16,
  },
  addButton: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: '#FF6B35',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2d2d44',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  itemCardClaimed: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#3d3d5c',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  itemContent: {
    flex: 1,
  },
  itemText: {
    fontSize: 15,
    color: '#fff',
  },
  itemTextClaimed: {
    textDecorationLine: 'line-through',
    color: '#888',
  },
  claimedText: {
    fontSize: 12,
    color: '#4CAF50',
    marginTop: 2,
  },
  claimButton: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
  },
  claimButtonText: {
    color: '#1a1a2e',
    fontSize: 13,
    fontWeight: 'bold',
  },
  leaveButton: {
    margin: 16,
    padding: 16,
    alignItems: 'center',
  },
  leaveButtonText: {
    color: '#e94560',
    fontSize: 15,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 15,
    color: '#888',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 40,
  },
});
