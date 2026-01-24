import Link from "next/link";

const CATEGORIES = [
  { slug: "love", en: "Love", ja: "愛" },
  { slug: "anxiety", en: "Anxiety", ja: "不安" },
  { slug: "anger", en: "Anger", ja: "怒り" },
  { slug: "hope", en: "Hope", ja: "希望" },
  { slug: "depression", en: "Depression", ja: "うつ" },
  { slug: "peace", en: "Peace", ja: "平安" },
  { slug: "fear", en: "Fear", ja: "恐れ" },
  { slug: "stress", en: "Stress", ja: "ストレス" },
  { slug: "patience", en: "Patience", ja: "忍耐" },
  { slug: "temptation", en: "Temptation", ja: "誘惑" },
  { slug: "pride", en: "Pride", ja: "高慢" },
  { slug: "doubt", en: "Doubt", ja: "疑い" },
  { slug: "joy", en: "Joy", ja: "喜び" },
  { slug: "jealousy", en: "Jealousy", ja: "嫉妬" },
  { slug: "loss", en: "Loss", ja: "喪失" },
  { slug: "healing", en: "Healing", ja: "癒し" },
];

export function CategoryGrid() {
  return (
    <div className="grid grid-cols-4 gap-2 sm:gap-3">
      {CATEGORIES.map((category) => (
        <Link
          key={category.slug}
          href={`/category/${category.slug}`}
          className="flex flex-col items-center justify-center p-3 sm:p-4 bg-gray-50 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-colors"
        >
          <span className="text-sm sm:text-base font-medium">{category.en}</span>
          <span className="text-xs text-gray-500">{category.ja}</span>
        </Link>
      ))}
    </div>
  );
}
