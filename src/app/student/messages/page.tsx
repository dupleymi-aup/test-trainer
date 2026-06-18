"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, Mail, MailOpen, Check } from "lucide-react";
import { logger } from "@/lib/logger";
import { toast } from "sonner";

interface Message {
  id: string;
  subject: string;
  content: string;
  read: boolean;
  readAt: string | null;
  createdAt: string;
  fromUser: { id: string; name: string | null; role: string };
}

export default function StudentMessagesPage() {
  const { status } = useSession();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status !== "authenticated") return;

    const controller = new AbortController();
    setLoading(true);
    fetch(`/api/student/messages?page=${page}&limit=20`, { signal: controller.signal })
      .then(async (r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((data) => {
        if (!controller.signal.aborted) {
          setMessages(data.messages || []);
          setTotal(data.total || 0);
          setUnreadCount(data.unreadCount || 0);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          logger.error("Failed to load messages", err instanceof Error ? err : undefined);
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [page, status, router]);

  const markAsRead = async (messageIds: string[]) => {
    try {
      const res = await fetch("/api/student/messages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageIds }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setMessages((prev) => prev.map((m) => messageIds.includes(m.id) ? { ...m, read: true, readAt: new Date().toISOString() } : m));
      setUnreadCount((prev) => Math.max(0, prev - messageIds.filter((id) => messages.find((m) => m.id === id)?.read === false).length));
    } catch (err) {
      logger.error("Failed to mark messages read", err instanceof Error ? err : undefined);
      toast.error("Не удалось отметить как прочитанное");
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
    const msg = messages.find((m) => m.id === id);
    if (msg && !msg.read) markAsRead([id]);
  };

  const markAllRead = () => {
    const unreadIds = messages.filter((m) => !m.read).map((m) => m.id);
    if (unreadIds.length > 0) markAsRead(unreadIds);
  };

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-4">
      <div className="flex items-center gap-4">
        <Link href="/student"><Button variant="ghost" size="icon" aria-label="Назад"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <h1 className="text-xl font-bold">Сообщения</h1>
        {unreadCount > 0 && (
          <Badge variant="destructive" className="animate-pulse">{unreadCount} нов.</Badge>
        )}
        <div className="flex-1" />
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllRead}>
            <Check className="h-3 w-3 mr-1" /> Отметить всё
          </Button>
        )}
      </div>

      {messages.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">Нет сообщений</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {messages.map((msg) => (
            <Card key={msg.id} className={`cursor-pointer transition-colors hover:bg-muted/30 ${!msg.read ? "border-primary/50" : ""}`} onClick={() => toggleExpand(msg.id)}>
              <CardHeader className="py-3 px-4 flex flex-row items-center gap-3">
                {msg.read ? <MailOpen className="h-4 w-4 text-muted-foreground" /> : <Mail className="h-4 w-4 text-primary" />}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`font-medium truncate ${!msg.read ? "text-primary" : ""}`}>{msg.subject}</span>
                    {!msg.read && <Badge variant="secondary" className="text-[10px] px-1 py-0">Новое</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">От: {msg.fromUser.name || msg.fromUser.id} • {new Date(msg.createdAt).toLocaleDateString("ru-RU")}</p>
                </div>
              </CardHeader>
              {expandedId === msg.id && (
                <CardContent className="px-4 pb-4 pt-0">
                  <div className="bg-muted/50 rounded p-3 text-sm whitespace-pre-wrap">{msg.content}</div>
                  <p className="text-xs text-muted-foreground mt-2">{new Date(msg.createdAt).toLocaleString("ru-RU")}</p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      {total > 20 && (
        <div className="flex justify-center gap-2 mt-4">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Назад</Button>
          <span className="text-sm text-muted-foreground self-center">Стр. {page} из {Math.ceil(total / 20)}</span>
          <Button variant="outline" size="sm" disabled={page * 20 >= total} onClick={() => setPage((p) => p + 1)}>Вперёд</Button>
        </div>
      )}
    </div>
  );
}
