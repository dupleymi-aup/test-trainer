"use client";

import { useEffect, useState } from "react";
import { TeacherLayout } from "@/components/teacher/teacher-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Send, Mail, Inbox, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

interface User {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
}

interface Message {
  id: string;
  subject: string;
  content: string;
  read: boolean;
  readAt: string | null;
  createdAt: string;
  fromUser: User;
  toUser: User;
}

export default function MessagesPage() {
  const [tab, setTab] = useState("inbox");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showCompose, setShowCompose] = useState(false);

  // Compose form
  const [toUserId, setToUserId] = useState("");
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);

  // Student list for recipient selection
  const [students, setStudents] = useState<Array<{ id: string; name: string | null; email: string | null; group: string | null }>>([]);

  useEffect(() => {
    loadMessages();
    loadStudents();
  }, [tab]);

  const loadMessages = async () => {
    setLoading(true);
    try {
      const folder = tab === "sent" ? "sent" : "inbox";
      const res = await fetch(`/api/teacher/messages?folder=${folder}&limit=50`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (e) {
      logger.warn("Failed to load messages", { error: e });
    } finally {
      setLoading(false);
    }
  };

  const loadStudents = async () => {
    try {
      const res = await fetch("/api/teacher/students");
      if (res.ok) {
        const data = await res.json();
        setStudents(data.students || []);
      }
    } catch { /* ignore */ }
  };

  const sendMessage = async () => {
    if (!toUserId || !subject.trim() || !content.trim()) {
      toast.error("Заполните все поля");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/teacher/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toUserId, subject: subject.trim(), content: content.trim() }),
      });
      if (res.ok) {
        toast.success("Сообщение отправлено");
        setShowCompose(false);
        setToUserId("");
        setSubject("");
        setContent("");
        loadMessages();
      } else {
        const err = await res.json();
        toast.error(err.error || "Ошибка отправки");
      }
    } catch {
      toast.error("Не удалось отправить сообщение");
    } finally {
      setSending(false);
    }
  };

  const markAsRead = async (messageIds: string[]) => {
    try {
      await fetch("/api/teacher/messages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageIds }),
      });
      loadMessages();
    } catch { /* ignore */ }
  };

  return (
    <TeacherLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Mail className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              Сообщения
            </h1>
            <p className="text-muted-foreground mt-1">
              Общение со студентами
            </p>
          </div>
          <Button onClick={() => setShowCompose(!showCompose)}>
            {showCompose ? (
              <><ArrowLeft className="mr-2 h-4 w-4" /> Назад</>
            ) : (
              <><Send className="mr-2 h-4 w-4" /> Написать</>
            )}
          </Button>
        </div>

        {showCompose ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Новое сообщение</CardTitle>
              <CardDescription>Отправьте сообщение студенту из вашей группы</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Получатель</Label>
                <Select value={toUserId} onValueChange={setToUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите студента..." />
                  </SelectTrigger>
                  <SelectContent>
                    {students.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name || s.email} {s.group ? `(${s.group})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Тема</Label>
                <Input
                  placeholder="Тема сообщения"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Содержание</Label>
                <Textarea
                  placeholder="Текст сообщения..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={6}
                />
              </div>
              <Button onClick={sendMessage} disabled={sending} className="w-full">
                {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Отправить
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList>
                <TabsTrigger value="inbox" className="relative">
                  <Inbox className="mr-2 h-4 w-4" />
                  Входящие
                  {unreadCount > 0 && (
                    <Badge variant="destructive" className="ml-2 h-5 min-w-5 px-1">
                      {unreadCount}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="sent">
                  <Send className="mr-2 h-4 w-4" />
                  Отправленные
                </TabsTrigger>
              </TabsList>

              <TabsContent value="inbox" className="mt-4">
                {loading ? (
                  <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
                ) : messages.length === 0 ? (
                  <Card><CardContent className="py-12 text-center text-muted-foreground">Нет входящих сообщений</CardContent></Card>
                ) : (
                  <div className="space-y-3">
                    {messages.map((msg) => (
                      <Card
                        key={msg.id}
                        className={`cursor-pointer transition-colors hover:bg-muted/30 ${!msg.read ? "border-l-4 border-l-blue-500 bg-blue-50/30 dark:bg-blue-950/10" : ""}`}
                        onClick={() => !msg.read && markAsRead([msg.id])}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className={`font-medium ${!msg.read ? "text-blue-700 dark:text-blue-400" : ""}`}>
                                {msg.subject}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                От: {msg.fromUser.name || msg.fromUser.email} &bull; {new Date(msg.createdAt).toLocaleString("ru-RU")}
                              </p>
                            </div>
                            {!msg.read && <Badge variant="default" className="text-xs">Новое</Badge>}
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">{msg.content}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="sent" className="mt-4">
                {loading ? (
                  <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
                ) : messages.length === 0 ? (
                  <Card><CardContent className="py-12 text-center text-muted-foreground">Нет отправленных сообщений</CardContent></Card>
                ) : (
                  <div className="space-y-3">
                    {messages.map((msg) => (
                      <Card key={msg.id} className="hover:bg-muted/30 transition-colors">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="font-medium">{msg.subject}</p>
                              <p className="text-xs text-muted-foreground">
                                Кому: {msg.toUser.name || msg.toUser.email} &bull; {new Date(msg.createdAt).toLocaleString("ru-RU")}
                              </p>
                            </div>
                            {msg.read ? (
                              <Badge variant="secondary" className="text-xs">Прочитано</Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">Не прочитано</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">{msg.content}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </TeacherLayout>
  );
}
