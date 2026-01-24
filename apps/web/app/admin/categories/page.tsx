import { redirect } from "next/navigation";
import { Header } from "@/components/ui/header";
import { createServerClient } from "@/lib/supabase/server";

type Category = {
  id: string;
  slug: string;
  name_en: string;
  name_ja: string;
  sort_order: number;
  clip_count: number;
};

async function getCategories(): Promise<Category[]> {
  const supabase = createServerClient();

  // Get categories with clip counts
  const { data: categories } = await supabase
    .from("categories")
    .select("id, slug, name_en, name_ja, sort_order")
    .order("sort_order");

  if (!categories) return [];

  // Get clip counts per category
  const { data: clipCounts } = await supabase.from("clip_categories").select("category_id");

  const countMap = new Map<string, number>();
  clipCounts?.forEach((cc) => {
    countMap.set(cc.category_id, (countMap.get(cc.category_id) || 0) + 1);
  });

  return categories.map((cat) => ({
    ...cat,
    clip_count: countMap.get(cat.id) || 0,
  }));
}

async function isAdmin(userId: string): Promise<boolean> {
  const supabase = createServerClient();
  const { data } = await supabase.from("users").select("role").eq("id", userId).single();

  return data?.role === "ADMIN";
}

export default async function AdminCategoriesPage() {
  const supabase = createServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login?redirectTo=/admin/categories");
  }

  const admin = await isAdmin(session.user.id);
  if (!admin) {
    redirect("/");
  }

  const categories = await getCategories();

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
          <span className="text-sm text-gray-500">{categories.length} categories</span>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">English</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Japanese</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Slug</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Clips</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {categories.map((category) => (
                <tr key={category.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-500">{category.sort_order}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{category.name_en}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{category.name_ja}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{category.slug}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{category.clip_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-sm text-gray-500">
          Categories are managed via database migrations. Contact a developer to add or modify categories.
        </p>
      </main>
    </div>
  );
}
