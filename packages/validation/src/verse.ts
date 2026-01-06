import { z } from "zod";

// Bible book enum with English and Japanese names
export const BibleBook = {
  // Old Testament
  GENESIS: { en: "Genesis", ja: "創世記" },
  EXODUS: { en: "Exodus", ja: "出エジプト記" },
  LEVITICUS: { en: "Leviticus", ja: "レビ記" },
  NUMBERS: { en: "Numbers", ja: "民数記" },
  DEUTERONOMY: { en: "Deuteronomy", ja: "申命記" },
  JOSHUA: { en: "Joshua", ja: "ヨシュア記" },
  JUDGES: { en: "Judges", ja: "士師記" },
  RUTH: { en: "Ruth", ja: "ルツ記" },
  FIRST_SAMUEL: { en: "1 Samuel", ja: "サムエル記上" },
  SECOND_SAMUEL: { en: "2 Samuel", ja: "サムエル記下" },
  FIRST_KINGS: { en: "1 Kings", ja: "列王記上" },
  SECOND_KINGS: { en: "2 Kings", ja: "列王記下" },
  FIRST_CHRONICLES: { en: "1 Chronicles", ja: "歴代誌上" },
  SECOND_CHRONICLES: { en: "2 Chronicles", ja: "歴代誌下" },
  EZRA: { en: "Ezra", ja: "エズラ記" },
  NEHEMIAH: { en: "Nehemiah", ja: "ネヘミヤ記" },
  ESTHER: { en: "Esther", ja: "エステル記" },
  JOB: { en: "Job", ja: "ヨブ記" },
  PSALMS: { en: "Psalms", ja: "詩篇" },
  PROVERBS: { en: "Proverbs", ja: "箴言" },
  ECCLESIASTES: { en: "Ecclesiastes", ja: "伝道者の書" },
  SONG_OF_SOLOMON: { en: "Song of Solomon", ja: "雅歌" },
  ISAIAH: { en: "Isaiah", ja: "イザヤ書" },
  JEREMIAH: { en: "Jeremiah", ja: "エレミヤ書" },
  LAMENTATIONS: { en: "Lamentations", ja: "哀歌" },
  EZEKIEL: { en: "Ezekiel", ja: "エゼキエル書" },
  DANIEL: { en: "Daniel", ja: "ダニエル書" },
  HOSEA: { en: "Hosea", ja: "ホセア書" },
  JOEL: { en: "Joel", ja: "ヨエル書" },
  AMOS: { en: "Amos", ja: "アモス書" },
  OBADIAH: { en: "Obadiah", ja: "オバデヤ書" },
  JONAH: { en: "Jonah", ja: "ヨナ書" },
  MICAH: { en: "Micah", ja: "ミカ書" },
  NAHUM: { en: "Nahum", ja: "ナホム書" },
  HABAKKUK: { en: "Habakkuk", ja: "ハバクク書" },
  ZEPHANIAH: { en: "Zephaniah", ja: "ゼパニヤ書" },
  HAGGAI: { en: "Haggai", ja: "ハガイ書" },
  ZECHARIAH: { en: "Zechariah", ja: "ゼカリヤ書" },
  MALACHI: { en: "Malachi", ja: "マラキ書" },
  // New Testament
  MATTHEW: { en: "Matthew", ja: "マタイの福音書" },
  MARK: { en: "Mark", ja: "マルコの福音書" },
  LUKE: { en: "Luke", ja: "ルカの福音書" },
  JOHN: { en: "John", ja: "ヨハネの福音書" },
  ACTS: { en: "Acts", ja: "使徒の働き" },
  ROMANS: { en: "Romans", ja: "ローマ人への手紙" },
  FIRST_CORINTHIANS: { en: "1 Corinthians", ja: "コリント人への手紙第一" },
  SECOND_CORINTHIANS: { en: "2 Corinthians", ja: "コリント人への手紙第二" },
  GALATIANS: { en: "Galatians", ja: "ガラテヤ人への手紙" },
  EPHESIANS: { en: "Ephesians", ja: "エペソ人への手紙" },
  PHILIPPIANS: { en: "Philippians", ja: "ピリピ人への手紙" },
  COLOSSIANS: { en: "Colossians", ja: "コロサイ人への手紙" },
  FIRST_THESSALONIANS: { en: "1 Thessalonians", ja: "テサロニケ人への手紙第一" },
  SECOND_THESSALONIANS: { en: "2 Thessalonians", ja: "テサロニケ人への手紙第二" },
  FIRST_TIMOTHY: { en: "1 Timothy", ja: "テモテへの手紙第一" },
  SECOND_TIMOTHY: { en: "2 Timothy", ja: "テモテへの手紙第二" },
  TITUS: { en: "Titus", ja: "テトスへの手紙" },
  PHILEMON: { en: "Philemon", ja: "ピレモンへの手紙" },
  HEBREWS: { en: "Hebrews", ja: "ヘブル人への手紙" },
  JAMES: { en: "James", ja: "ヤコブの手紙" },
  FIRST_PETER: { en: "1 Peter", ja: "ペテロの手紙第一" },
  SECOND_PETER: { en: "2 Peter", ja: "ペテロの手紙第二" },
  FIRST_JOHN: { en: "1 John", ja: "ヨハネの手紙第一" },
  SECOND_JOHN: { en: "2 John", ja: "ヨハネの手紙第二" },
  THIRD_JOHN: { en: "3 John", ja: "ヨハネの手紙第三" },
  JUDE: { en: "Jude", ja: "ユダの手紙" },
  REVELATION: { en: "Revelation", ja: "ヨハネの黙示録" },
} as const;

export type BibleBookKey = keyof typeof BibleBook;
export type BibleBookValue = (typeof BibleBook)[BibleBookKey];

// Helper arrays
export const bibleBookKeys = Object.keys(BibleBook) as BibleBookKey[];
export const bibleBookNamesEn = Object.values(BibleBook).map((b) => b.en);
export const bibleBookNamesJa = Object.values(BibleBook).map((b) => b.ja);

// Get book by English name
export function getBookByEnglishName(name: string): BibleBookValue | undefined {
  return Object.values(BibleBook).find((b) => b.en.toLowerCase() === name.toLowerCase());
}

// Get book by Japanese name
export function getBookByJapaneseName(name: string): BibleBookValue | undefined {
  return Object.values(BibleBook).find((b) => b.ja === name);
}

export const verseSchema = z.object({
  book: z.string().min(1),
  bookJa: z.string().min(1),
  chapter: z.number().int().min(1).max(150),
  verseStart: z.number().int().min(1).max(176),
  verseEnd: z.number().int().min(1).max(176).optional(),
}).refine(
  (data) => !data.verseEnd || data.verseEnd >= data.verseStart,
  { message: "verseEnd must be >= verseStart" }
);

export type Verse = z.infer<typeof verseSchema>;

// Helper to format verse reference
export function formatVerseRef(verse: Verse): string {
  const { book, chapter, verseStart, verseEnd } = verse;
  if (verseEnd && verseEnd !== verseStart) {
    return `${book} ${chapter}:${verseStart}-${verseEnd}`;
  }
  return `${book} ${chapter}:${verseStart}`;
}

// Helper to create Bible Gateway URL
export function getBibleGatewayUrl(verse: Verse, version = "NIV"): string {
  const ref = formatVerseRef(verse);
  return `https://www.biblegateway.com/passage/?search=${encodeURIComponent(ref)}&version=${version}`;
}
