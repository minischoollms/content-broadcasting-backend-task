import { topSubjects, topContent } from '../models/analytics.model';

export async function getOverview(limit = 10) {
  const [subjects, content] = await Promise.all([topSubjects(limit), topContent(limit)]);
  return {
    most_active_subjects: subjects,
    most_viewed_content: content,
  };
}
