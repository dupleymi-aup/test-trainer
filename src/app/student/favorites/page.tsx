"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Star, ArrowLeft, Bookmark, Trash2 } from "lucide-react";
import { tasks } from "@/lib/tasks";
import { logger } from "@/lib/logger";
import { toast } from "sonner";

interface Favorite {
  id: string;
  taskId: number;
  createdAt: string;
}

const difficultyColors: Record<string, string> = {
  "Легко": "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  "Средне": "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  "Сложно": "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
};

export default function FavoritesPage() {
  const { status } = useSession();
  const router = useRouter();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login?callbackUrl=/student/favorites");
      return;
    }
    if (status !== "authenticated") return;

    const controller = new AbortController();
    fetch("/api/student/favorites", { signal: controller.signal })
      .then((r) => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then((data) => setFavorites(data.favorites))
      .catch((e) => { logger.warn("Failed to load favorites", { error: e }); })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [status, router]);

  const removeFavorite = async (taskId: number) => {
    try {
      const res = await fetch(`/api/student/favorites?taskId=${taskId}`, { method: "DELETE" });
      if (res.ok) {
        setFavorites((prev) => prev.filter((f) => f.taskId !== taskId));
        toast.success("Удалено из избранного");
      }
    } catch {
      toast.error("Не удалось удалить");
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  const favoriteTasks = favorites
    .map((f) => {
      const task = tasks.find((t) => t.id === f.taskId);
      return task ? { ...f, task } : null;
    })
    .filter(Boolean) as Array<Favorite & { task: (typeof tasks)[number] }>;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <header className="border-b bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/student"><ArrowLeft className="h-5 w-5" /></Link>
            </Button>
            <div className="flex items-center gap-2">
              <Star className="h-6 w-6 text-amber-500 fill-amber-500" />
              <h1 className="text-xl font-bold">Избранные задания</h1>
            </div>
          </div>
          <Badge variant="secondary">{favoriteTasks.length} заданий</Badge>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {favoriteTasks.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Bookmark className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
              <h3 className="text-lg font-semibold mb-2">Нет избранных заданий</h3>
              <p className="text-muted-foreground mb-6">
                Добавляйте задания в избранное, чтобы быстро находить их позже
              </p>
              <Button asChild>
                <Link href="/trainer">Перейти к заданиям</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {favoriteTasks.map((fav) => (
              <Card key={fav.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">{fav.task.name}</h3>
                        <Badge className={difficultyColors[fav.task.difficulty] || ""}>
                          {fav.task.difficulty}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                        {fav.task.description}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap">
                        {fav.task.topics.map((topic) => (
                          <Badge key={topic} variant="outline" className="text-xs">
                            {topic}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/trainer?task=${fav.task.id}`}>Открыть</Link>
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => removeFavorite(fav.taskId)}>
                        <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
