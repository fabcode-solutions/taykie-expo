import { GroupMember } from "@/services/repositories/groups";

export interface CreateGroupRequest {
  groupName?: string;
  groupDescription?: string;
  groupType?: string;
  tags?: string[];
  uploadGroupPhoto?: string;
  allowMembersToPost?: boolean;
  notifyMembersWhenAdded?: boolean;
}

export type GroupType = "Private" | "Public";

export interface GroupResponse {
  id: string;
  superAdminId?: string;
  groupName: string;
  groupDescription?: string | null;
  uploadGroupPhoto: string | null;
  groupType?: GroupType;
  notifyMembersWhenAdded?: boolean;
  allowMembersToPost?: boolean;
  tags?: string[] | null;
  isSuspended?: boolean;
  isBlocked?: boolean;
  moderationReason?: string | null;
  moderatedAt?: string | null;
  moderatedBy?: string | null;
  createdAt?: string;
  updatedAt?: string;
  superAdmin?: SuperAdmin;
  membersCount?: number;
  previewMembers?: GroupMember[];
  members?: GroupMember[];
  isMember?: boolean;
  userRole?: string | null;
  score?: number;
  friendsInGroup?: number;
  friendPreviewIds?: any[];
  likedPostsCount?: number;
  bookmarkedPostsCount?: number;
  reasons?: any[];
}

export interface SuperAdmin {
  id: string;
  firstName: string;
  lastname: string;
  lastName: string;
  avatarUrl: string | null;
}
