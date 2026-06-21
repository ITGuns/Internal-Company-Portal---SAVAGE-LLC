import type { DailyLog, DailyLogComment } from './daily-logs';

type CommentAuthor =
  | string
  | {
      name?: string | null;
      email?: string | null;
    }
  | null
  | undefined;

type CommentLike = Pick<DailyLogComment, 'authorId'> & {
  author?: CommentAuthor;
};

type LogLike = Pick<DailyLog, 'comments'>;

export function getDailyLogCommentCount(log: LogLike): number {
  return Array.isArray(log.comments) ? log.comments.length : 0;
}

export function getDailyLogCommentAuthorLabel(
  comment: CommentLike,
  currentUserId?: string | number | null,
): string {
  if (currentUserId !== undefined && currentUserId !== null && comment.authorId === String(currentUserId)) {
    return 'You';
  }

  if (typeof comment.author === 'string') {
    return comment.author || 'Team';
  }

  return comment.author?.name || comment.author?.email || 'Team';
}

export function canDeleteDailyLogComment(
  comment: Pick<DailyLogComment, 'authorId'>,
  currentUserId?: string | number | null,
): boolean {
  return currentUserId !== undefined && currentUserId !== null && comment.authorId === String(currentUserId);
}
