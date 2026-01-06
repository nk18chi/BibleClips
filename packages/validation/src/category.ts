import { z } from "zod";

// Category enum with English and Japanese names
export const CategoryEnum = {
  LOVE: { slug: "love", en: "Love", ja: "愛" },
  ANXIETY: { slug: "anxiety", en: "Anxiety", ja: "不安" },
  ANGER: { slug: "anger", en: "Anger", ja: "怒り" },
  HOPE: { slug: "hope", en: "Hope", ja: "希望" },
  DEPRESSION: { slug: "depression", en: "Depression", ja: "うつ" },
  PEACE: { slug: "peace", en: "Peace", ja: "平安" },
  FEAR: { slug: "fear", en: "Fear", ja: "恐れ" },
  STRESS: { slug: "stress", en: "Stress", ja: "ストレス" },
  PATIENCE: { slug: "patience", en: "Patience", ja: "忍耐" },
  TEMPTATION: { slug: "temptation", en: "Temptation", ja: "誘惑" },
  PRIDE: { slug: "pride", en: "Pride", ja: "高慢" },
  DOUBT: { slug: "doubt", en: "Doubt", ja: "疑い" },
  JOY: { slug: "joy", en: "Joy", ja: "喜び" },
  JEALOUSY: { slug: "jealousy", en: "Jealousy", ja: "嫉妬" },
  LOSS: { slug: "loss", en: "Loss", ja: "喪失" },
  HEALING: { slug: "healing", en: "Healing", ja: "癒し" },
} as const;

export type CategoryKey = keyof typeof CategoryEnum;
export type CategoryValue = (typeof CategoryEnum)[CategoryKey];

// Helper arrays
export const categoryKeys = Object.keys(CategoryEnum) as CategoryKey[];
export const categorySlugs = Object.values(CategoryEnum).map((c) => c.slug);
export const categoryNamesEn = Object.values(CategoryEnum).map((c) => c.en);
export const categoryNamesJa = Object.values(CategoryEnum).map((c) => c.ja);

// Get category by slug
export function getCategoryBySlug(slug: string): CategoryValue | undefined {
  return Object.values(CategoryEnum).find((c) => c.slug === slug);
}

// Zod schema for category slug validation
export const categorySlugSchema = z.enum(categorySlugs as [string, ...string[]]);

export const categorySchema = z.object({
  slug: categorySlugSchema,
  nameEn: z.string().min(1).max(100),
  nameJa: z.string().min(1).max(100),
  sortOrder: z.number().int().min(0).default(0),
});

export type Category = z.infer<typeof categorySchema>;

export const categoryCreateSchema = categorySchema;
export const categoryUpdateSchema = categorySchema.partial();
