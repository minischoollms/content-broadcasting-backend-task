import {
  approveContent,
  rejectContent,
  listContent,
  findContentById,
  type ContentListFilters,
} from '../models/content.model';
import { ApiError } from '../utils/ApiError';
import { cacheDel, cacheKeys } from '../utils/cache';
import type { ContentRow } from '../models/types';

export async function listAllForPrincipal(
  filters: ContentListFilters,
): Promise<{ rows: ContentRow[]; total: number }> {
  return listContent(filters);
}

export async function approve(contentId: string, principalId: string): Promise<ContentRow> {
  const existing = await findContentById(contentId);
  if (!existing) throw ApiError.notFound('Content not found');
  if (existing.status === 'approved') return existing;

  const updated = await approveContent({ contentId, approvedBy: principalId });
  if (!updated) throw ApiError.badRequest('Could not approve content in its current state');

  await cacheDel(cacheKeys.liveByTeacherPattern(updated.uploaded_by));
  return updated;
}

export async function reject(
  contentId: string,
  principalId: string,
  reason: string,
): Promise<ContentRow> {
  if (!reason || reason.trim().length === 0) {
    throw ApiError.badRequest('Rejection reason is required');
  }
  const existing = await findContentById(contentId);
  if (!existing) throw ApiError.notFound('Content not found');

  const updated = await rejectContent({ contentId, approvedBy: principalId, reason });
  if (!updated) throw ApiError.badRequest('Could not reject content');

  await cacheDel(cacheKeys.liveByTeacherPattern(updated.uploaded_by));
  return updated;
}
