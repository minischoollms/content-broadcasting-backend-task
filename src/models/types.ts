export type Role = 'principal' | 'teacher';
export type ContentStatus = 'uploaded' | 'pending' | 'approved' | 'rejected';

export interface UserRow {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: Role;
  created_at: Date;
}

export interface ContentRow {
  id: string;
  title: string;
  description: string | null;
  subject: string;
  file_url: string;
  file_path: string;
  file_type: string;
  file_size: number;
  uploaded_by: string;
  status: ContentStatus;
  rejection_reason: string | null;
  approved_by: string | null;
  approved_at: Date | null;
  start_time: Date | null;
  end_time: Date | null;
  rotation_minutes: number;
  created_at: Date;
  updated_at: Date;
}

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  created_at: Date;
}

export function toPublicUser(u: UserRow): PublicUser {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    created_at: u.created_at,
  };
}
