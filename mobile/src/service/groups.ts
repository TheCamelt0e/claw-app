/**
 * Groups Service - Shared Lists for Families
 * 
 * This is the Pro tier feature ($2.99/mo).
 * Real-time sync via polling (not WebSockets - too expensive).
 */
import { apiRequest } from '../api/client';

export interface Group {
  id: string;
  name: string;
  description?: string;
  group_type: 'family' | 'couple' | 'roommates' | 'other';
  created_by: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  member_count: number;
  members?: GroupMember[];
}

export interface GroupMember {
  id: string;
  display_name?: string;
  email: string;
}

export interface GroupItem {
  id: string;
  content: string;
  title?: string;
  category?: string;
  status: 'active' | 'claimed' | 'completed';
  claimed_by?: string;
  captured_by: string;
  created_at: string;
  group_claw_id: string;
}

export interface GroupWithItems extends Group {
  items: GroupItem[];
}

/**
 * Get all groups the current user is a member of
 */
export async function getMyGroups(): Promise<Group[]> {
  const response = await apiRequest<{ groups: Group[] }>('GET', '/groups/my');
  return response.groups || [];
}

/**
 * Get a specific group with its items
 */
export async function getGroup(groupId: string): Promise<GroupWithItems> {
  return apiRequest<GroupWithItems>('GET', `/groups/${groupId}`);
}

/**
 * Create a new group
 */
export async function createGroup(
  name: string,
  description?: string,
  group_type: string = 'family'
): Promise<{ group: Group; message: string }> {
  return apiRequest('POST', '/groups/create', {
    name,
    description,
    group_type,
  });
}

/**
 * Capture an item directly to a group
 */
export async function captureToGroup(
  groupId: string,
  content: string,
  contentType: string = 'text'
): Promise<{ claw: any; group_claw: any; message: string }> {
  return apiRequest('POST', `/groups/${groupId}/capture`, null, {
    content,
    content_type: contentType,
  });
}

/**
 * Claim an item ("I got this")
 */
export async function claimGroupItem(
  groupId: string,
  groupClawId: string
): Promise<{ message: string; group_claw: any }> {
  return apiRequest('POST', `/groups/${groupId}/items/${groupClawId}/claim`);
}

/**
 * Strike (complete) a group item
 */
export async function strikeGroupItem(
  groupId: string,
  groupClawId: string
): Promise<{ message: string; group_claw: any }> {
  return apiRequest('POST', `/groups/${groupId}/items/${groupClawId}/strike`);
}

/**
 * Invite a member to the group
 */
export async function inviteMember(
  groupId: string,
  email: string
): Promise<{ message: string; group: Group }> {
  return apiRequest('POST', `/groups/${groupId}/invite`, { email });
}

/**
 * Leave a group
 */
export async function leaveGroup(groupId: string): Promise<{ message: string }> {
  return apiRequest('DELETE', `/groups/${groupId}/leave`);
}

/**
 * Poll for updates (real-time-ish sync)
 * Call this every 5-10 seconds when viewing a group
 */
export async function pollGroupUpdates(groupId: string): Promise<GroupWithItems> {
  return getGroup(groupId);
}
