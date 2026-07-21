"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { StickyNote, Eye, Pencil, Save } from "lucide-react";
import { saveGlobalNotes, loadGlobalNotes } from "@/lib/storage";
import { MarkdownPreview } from "@/components/markdown-preview";
import { useTranslations } from "next-intl";

const MAX_LENGTH = 5000;

export function GlobalNotesDialog() {
  const t = useTranslations("trainer");
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [viewMode, setViewMode] = useState(false);
  const [saved, setSaved] = useState(true);

  useEffect(() => {
    if (open) {
      setNote(loadGlobalNotes());
      setSaved(true);
      setViewMode(false);
    }
  }, [open]);

  const handleSave = () => {
    saveGlobalNotes(note);
    setSaved(true);
  };

  const handleBlur = () => {
    saveGlobalNotes(note);
    setSaved(true);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1"
          title="Глобальные заметки"
        >
          <StickyNote className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Заметки</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <StickyNote className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            Глобальные заметки
            {note.length > 0 && (
              <Badge variant="secondary" className="text-[10px]">{note.length}</Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 mt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Button
                variant={viewMode ? "default" : "outline"}
                size="sm"
                className={`text-xs gap-1 h-7 px-2 ${viewMode ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}`}
                onClick={() => setViewMode(true)}
              >
                <Eye className="h-3 w-3" />
                Просмотр
              </Button>
              <Button
                variant={!viewMode ? "default" : "outline"}
                size="sm"
                className={`text-xs gap-1 h-7 px-2 ${!viewMode ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}`}
                onClick={() => setViewMode(false)}
              >
                <Pencil className="h-3 w-3" />
                {t("resultsTab")}
              </Button>
            </div>
            {!viewMode && !saved && (
              <Button
                variant="outline"
                size="sm"
                className="text-xs gap-1 h-7"
                onClick={handleSave}
              >
                <Save className="h-3 w-3" />
                {t("save")}
              </Button>
            )}
          </div>

          {viewMode ? (
            note.length > 0 ? (
              <div className="p-4 bg-muted/30 rounded-lg min-h-[300px] max-h-[50vh] overflow-y-auto">
                <MarkdownPreview text={note} />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">
                {t("nothingFound")}
              </p>
            )
          ) : (
            <>
              <Textarea
                value={note}
                onChange={(e) => {
                  if (e.target.value.length <= MAX_LENGTH) {
                    setNote(e.target.value);
                    setSaved(false);
                  }
                }}
                onBlur={handleBlur}
                placeholder="Глобальные заметки — общие мысли, планы, наблюдения...

Поддерживается **жирный**, *курсив*, `код`, - списки, ### заголовки"
                className="min-h-[300px] text-sm resize-none font-mono text-xs"
              />
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>{note.length}/{MAX_LENGTH}</span>
                {saved ? (
                  <span className="text-emerald-600">{t("saved")}</span>
                ) : (
                  <span className="text-amber-600 dark:text-amber-400">{t("nothingFound")}</span>
                )}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
