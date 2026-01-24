import { z } from "zod";
import { verseSchema } from "./verse";

export const youtubeVideoIdSchema = z.string().regex(/^[a-zA-Z0-9_-]{11}$/, "Invalid YouTube video ID");

export const clipStatusSchema = z.enum(["PENDING", "APPROVED", "REJECTED"]);

export type ClipStatus = z.infer<typeof clipStatusSchema>;

export const clipSubmissionSchema = z
  .object({
    youtubeVideoId: youtubeVideoIdSchema,
    startTime: z.number().int().min(0),
    endTime: z.number().int().min(1),
    title: z.string().min(1).max(200),
    titleJa: z.string().max(200).optional(),
    description: z.string().max(1000).optional(),
    descriptionJa: z.string().max(1000).optional(),
    verses: z.array(verseSchema).min(1).max(10),
    categoryIds: z.array(z.string().uuid()).min(1).max(5),
  })
  .refine((data) => data.endTime > data.startTime, { message: "End time must be after start time" })
  .refine((data) => data.endTime - data.startTime <= 600, { message: "Clip duration must be 10 minutes or less" });

export type ClipSubmission = z.infer<typeof clipSubmissionSchema>;

export const clipUpdateSchema = z.object({
  status: clipStatusSchema.optional(),
  isFeatured: z.boolean().optional(),
});

export type ClipUpdate = z.infer<typeof clipUpdateSchema>;
