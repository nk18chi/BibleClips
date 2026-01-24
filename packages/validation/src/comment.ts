import { z } from "zod";

export const commentContentSchema = z
  .string()
  .min(1, "Comment cannot be empty")
  .max(2000, "Comment must be 2000 characters or less");

export const createCommentSchema = z.object({
  clipId: z.string().uuid("Invalid clip ID"),
  content: commentContentSchema,
});

export type CreateComment = z.infer<typeof createCommentSchema>;

export const updateCommentSchema = z.object({
  content: commentContentSchema,
});

export type UpdateComment = z.infer<typeof updateCommentSchema>;

export const commentReportReasonSchema = z.enum(["spam", "harassment", "inappropriate", "other"]);

export type CommentReportReason = z.infer<typeof commentReportReasonSchema>;

export const createCommentReportSchema = z.object({
  commentId: z.string().uuid("Invalid comment ID"),
  reason: commentReportReasonSchema,
  description: z.string().max(500).optional(),
});

export type CreateCommentReport = z.infer<typeof createCommentReportSchema>;
