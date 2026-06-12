import { useState, useRef, useCallback, useEffect } from "react";
import { useRoute, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Upload, Sparkles, Check, X, Edit2, ChevronLeft,
  FileText, Image, Presentation, Loader2, BookOpen,
  Bold, Italic, List, Heading, Save,
} from "lucide-react";

interface Session {
  id: number;
  sessionNumber: number | null;
  sessionDate: string | null;
  syllabusTitle: string | null;
  courseName: string | null;
  semester: string | null;
  journalEntry: string | null;
  protagonist?: string | null;
  company?: string | null;
}

interface UploadRecord {
  id: number;
  fileType: string;
  originalName: string | null;
  mimeType: string | null;
}

interface Insight {
  id: number;
  type: string;
  content: string;
  status: string | null;
  editedContent: string | null;
}

interface FollowUp {
  type: string;
  content: string;
}

interface FileMatch {
  file: { originalName: string; mimeType: string; size: number };
  match: { sessionId: number | null; sessionNumber: number | null; syllabusTitle: string | null; fileType: string; confidence: string; reasoning: string };
  fullExtractedText: string;
}

const INSIGHT_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  key_insight:        { label: "Key Insight",         color: "text-blue-700 dark:text-blue-300",   bg: "bg-blue-50 dark:bg-blue-950/40 border-blue-100 dark:border-blue-900" },
  framework:          { label: "Framework",            color: "text-purple-700 dark:text-purple-300", bg: "bg-purple-50 dark:bg-purple-950/40 border-purple-100 dark:border-purple-900" },
  reflection_question:{ label: "Reflection",           color: "text-green-700 dark:text-green-300",  bg: "bg-green-50 dark:bg-green-950/40 border-green-100 dark:border-green-900" },
  external_source:    { label: "External Source",      color: "text-orange-700 dark:text-orange-300", bg: "bg-orange-50 dark:bg-orange-950/40 border-orange-100 dark:border-orange-900" },
};

const INSIGHT_GROUPS = [
  { type: "key_insight",         title: "Key Insights" },
  { type: "framework",           title: "Frameworks" },
  { type: "reflection_question", title: "Reflection Questions" },
  { type: "external_source",     title: "External Sources" },
];

type SaveStatus = "idle" | "saving" | "saved" | "unsaved";

export default function SessionPage() {
  const [, params] = useRoute("/sessions/:id");
  const id = Number(params?.id);
  const { toast } = useToast();
  const qc = useQueryClient();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [journal, setJournal] = useState<string | null>(null);
  const [savedJournal, setSavedJournal] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [pendingFile, setPendingFile] = useState<FileMatch | null>(null);
  const [processingFile, setProcessingFile] = useState(false);
  const [editingInsight, setEditingInsight] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [generatingInsights, setGeneratingInsights] = useState(false);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [loadingFollowUps, setLoadingFollowUps] = useState(false);

  const { data: session } = useQuery<Session>({
    queryKey: [`/api/sessions/${id}`],
    queryFn: () => apiRequest("GET", `/api/sessions/${id}`).then(r => r.json()),
    enabled: !!id,
  } as any);

  useEffect(() => {
    if (session && journal === null) {
      setJournal(session.journalEntry ?? "");
      setSavedJournal(session.journalEntry ?? "");
    }
  }, [session, journal]);

  useEffect(() => {
    if (journal !== null && savedJournal !== null) {
      setSaveStatus(journal === savedJournal ? "idle" : "unsaved");
    }
  }, [journal, savedJournal]);

  const { data: uploads = [] } = useQuery<UploadRecord[]>({
    queryKey: [`/api/sessions/${id}/uploads`],
    queryFn: () => apiRequest("GET", `/api/sessions/${id}/uploads`).then(r => r.json()),
    enabled: !!id,
  });

  const { data: insights = [] } = useQuery<Insight[]>({
    queryKey: [`/api/sessions/${id}/insights`],
    queryFn: () => apiRequest("GET", `/api/sessions/${id}/insights`).then(r => r.json()),
    enabled: !!id,
  });

  const saveJournal = useMutation({
    mutationFn: (text: string) =>
      apiRequest("PATCH", `/api/sessions/${id}`, { journalEntry: text }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/sessions/${id}`] });
    },
  });

  const updateInsight = useMutation({
    mutationFn: ({ insightId, data }: { insightId: number; data: Partial<Insight> }) =>
      apiRequest("PATCH", `/api/insights/${insightId}`, data).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: [`/api/sessions/${id}/insights`] }),
  });

  const confirmUpload = useMutation({
    mutationFn: (body: any) => apiRequest("POST", "/api/ingest/confirm", body).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/sessions/${id}/uploads`] });
      setPendingFile(null);
      toast({ title: "File saved to session" });
    },
  });

  async function handleSave() {
    if (journal === null) return;
    setSaveStatus("saving");
    try {
      await saveJournal.mutateAsync(journal);
      setSavedJournal(journal);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
      // Generate follow-ups
      setLoadingFollowUps(true);
      try {
        const res = await fetch(`/api/sessions/${id}/follow-ups`, { method: "POST" });
        const data = await res.json();
        setFollowUps(data.suggestions ?? []);
      } catch {}
      setLoadingFollowUps(false);
    } catch {
      setSaveStatus("unsaved");
      toast({ title: "Save failed", variant: "destructive" });
    }
  }

  async function generateInsights() {
    setGeneratingInsights(true);
    try {
      const res = await fetch(`/api/sessions/${id}/generate-insights`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      qc.invalidateQueries({ queryKey: [`/api/sessions/${id}/insights`] });
      toast({ title: `${data.insights.length} insights generated` });
    } catch (err: any) {
      toast({ title: "Failed to generate insights", description: err.message, variant: "destructive" });
    } finally {
      setGeneratingInsights(false);
    }
  }

  function acceptInsight(insight: Insight) {
    const text = insight.editedContent ?? insight.content;
    setJournal(prev => (prev ?? "") + (prev ? "\n\n" : "") + text);
    updateInsight.mutate({ insightId: insight.id, data: { status: "accepted" } });
  }

  async function handleFileUpload(file: File) {
    setProcessingFile(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("folderNumber", String(session?.sessionNumber ?? ""));
      const res = await fetch("/api/ingest/file", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPendingFile(data);
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setProcessingFile(false);
    }
  }

  // Markdown toolbar helpers
  function insertAround(before: string, after = "") {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = (journal ?? "").slice(start, end);
    const newText =
      (journal ?? "").slice(0, start) + before + selected + after +
      (journal ?? "").slice(end);
    setJournal(newText);
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(start + before.length, end + before.length);
    }, 0);
  }

  function insertLinePrefix(prefix: string) {
    const ta = textareaRef.current;
    if (!ta) return;
    const pos = ta.selectionStart;
    const text = journal ?? "";
    const lineStart = text.lastIndexOf("\n", pos - 1) + 1;
    const newText = text.slice(0, lineStart) + prefix + text.slice(lineStart);
    setJournal(newText);
    setTimeout(() => { ta.focus(); ta.setSelectionRange(pos + prefix.length, pos + prefix.length); }, 0);
  }

  const activeInsights = insights.filter(i => i.status !== "rejected");

  const fileIcon = (type: string) => {
    if (type === "slides") return <Presentation className="w-4 h-4" />;
    if (type === "blackboard") return <Image className="w-4 h-4" />;
    return <FileText className="w-4 h-4" />;
  };

  if (!session) return (
    <div className="p-6 flex items-center gap-2 text-muted-foreground">
      <Loader2 className="w-4 h-4 animate-spin" /> Loading…
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6 overflow-auto pb-16">

      {/* Header */}
      <div>
        <Link href="/journal">
          <Button variant="ghost" size="sm" className="-ml-2 mb-2">
            <ChevronLeft className="w-4 h-4 mr-1" /> Back
          </Button>
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          {session.sessionNumber != null && (
            <Badge variant="outline">#{session.sessionNumber}</Badge>
          )}
          {session.semester && <Badge variant="secondary">{session.semester}</Badge>}
          {session.courseName && (
            <Badge className="bg-primary/10 text-primary border-0 hover:bg-primary/15">
              {session.courseName}
            </Badge>
          )}
          {session.sessionDate && (
            <span className="text-xs text-muted-foreground">{session.sessionDate}</span>
          )}
        </div>
        <h1 className="text-xl font-bold mt-2 leading-tight">
          {session.syllabusTitle || "Untitled Session"}
        </h1>
        {(session.company || session.protagonist) && (
          <p className="text-sm text-muted-foreground mt-0.5">
            {[session.company, session.protagonist].filter(Boolean).join(" · ")}
          </p>
        )}
      </div>

      {/* AI Insights */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm">AI Insights</h2>
          {uploads.length > 0 && activeInsights.length === 0 && (
            <Button size="sm" variant="outline" onClick={generateInsights} disabled={generatingInsights}>
              {generatingInsights
                ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                : <Sparkles className="w-3.5 h-3.5 mr-1.5" />}
              Generate
            </Button>
          )}
          {activeInsights.length > 0 && (
            <Button size="sm" variant="ghost" onClick={generateInsights} disabled={generatingInsights}
              className="text-muted-foreground text-xs">
              {generatingInsights ? <Loader2 className="w-3 h-3 animate-spin" /> : "Regenerate"}
            </Button>
          )}
        </div>

        {uploads.length === 0 && activeInsights.length === 0 && (
          <p className="text-xs text-muted-foreground">Upload case materials below to generate insights.</p>
        )}

        {activeInsights.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {INSIGHT_GROUPS.map(group => {
              const cfg = INSIGHT_CONFIG[group.type];
              const items = activeInsights.filter(i => i.type === group.type);
              if (items.length === 0) return null;
              return (
                <div key={group.type} className="space-y-2">
                  <p className={`text-xs font-semibold uppercase tracking-wide ${cfg.color}`}>
                    {group.title}
                  </p>
                  {items.map(insight => (
                    <div key={insight.id} className={`rounded-lg border p-3 space-y-2 ${cfg.bg}`}>
                      {editingInsight === insight.id ? (
                        <div className="space-y-2">
                          <Textarea
                            value={editText}
                            onChange={e => setEditText(e.target.value)}
                            className="text-xs min-h-[80px] resize-none bg-background"
                          />
                          <div className="flex gap-1">
                            <Button size="sm" className="h-7 text-xs flex-1" onClick={() => {
                              updateInsight.mutate({ insightId: insight.id, data: { editedContent: editText, status: "edited" } });
                              setEditingInsight(null);
                            }}>Save</Button>
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setEditingInsight(null)}>Cancel</Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="text-xs leading-relaxed">{insight.editedContent ?? insight.content}</p>
                          {insight.status === "accepted" && (
                            <Badge variant="secondary" className="text-[10px]">Added to journal</Badge>
                          )}
                          <div className="flex gap-1 justify-end">
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => {
                              setEditingInsight(insight.id);
                              setEditText(insight.editedContent ?? insight.content);
                            }}><Edit2 className="w-3 h-3" /></Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-primary" onClick={() => acceptInsight(insight)}>
                              <Check className="w-3 h-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() =>
                              updateInsight.mutate({ insightId: insight.id, data: { status: "rejected" } })
                            }><X className="w-3 h-3" /></Button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Journal Editor */}
      <section className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-semibold text-sm">Post-Class Journal</h2>
          <div className="flex items-center gap-1">
            {/* Markdown toolbar */}
            <div className="flex border rounded-md overflow-hidden">
              <button
                className="px-2 py-1 text-xs hover:bg-muted transition-colors font-bold"
                title="Bold" onClick={() => insertAround("**", "**")}
              >B</button>
              <button
                className="px-2 py-1 text-xs hover:bg-muted transition-colors italic border-l"
                title="Italic" onClick={() => insertAround("_", "_")}
              >I</button>
              <button
                className="px-2 py-1 text-xs hover:bg-muted transition-colors border-l"
                title="Bullet list" onClick={() => insertLinePrefix("- ")}
              >•</button>
              <button
                className="px-2 py-1 text-xs hover:bg-muted transition-colors border-l font-bold"
                title="Heading" onClick={() => insertLinePrefix("## ")}
              >H</button>
            </div>
            {/* Save button */}
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saveStatus === "saving" || journal === savedJournal}
              variant={saveStatus === "unsaved" ? "default" : "outline"}
              className="min-w-[80px]"
            >
              {saveStatus === "saving" && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
              {saveStatus === "saved" && <Check className="w-3.5 h-3.5 mr-1.5" />}
              {saveStatus === "saved" ? "Saved" : saveStatus === "saving" ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
        {saveStatus === "unsaved" && (
          <p className="text-xs text-amber-600 dark:text-amber-400">Unsaved changes</p>
        )}
        <Textarea
          ref={textareaRef}
          value={journal ?? ""}
          onChange={e => setJournal(e.target.value)}
          placeholder="What happened in class? What surprised you? What frameworks clicked? What would you do differently?

Start with a ## heading for each section.
Use - for bullet points.
**Bold** key terms."
          className="min-h-[280px] resize-y font-mono text-sm leading-relaxed"
        />
      </section>

      {/* Follow-up suggestions */}
      {(loadingFollowUps || followUps.length > 0) && (
        <section className="space-y-3">
          <h2 className="font-semibold text-sm">Suggested Follow-ups</h2>
          {loadingFollowUps ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Claude is reading your entry…
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {followUps.map((f, i) => (
                <Card key={i} className="bg-muted/40">
                  <CardContent className="p-3">
                    <Badge variant="outline" className="text-[10px] mb-2 capitalize">{f.type}</Badge>
                    <p className="text-xs leading-relaxed">{f.content}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Materials / File Uploads */}
      <section className="space-y-3 border-t pt-4">
        <h2 className="font-semibold text-sm text-muted-foreground">Materials</h2>

        {uploads.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {uploads.map(u => (
              <div key={u.id} className="flex items-center gap-1.5 text-xs bg-muted rounded-md px-2 py-1">
                {fileIcon(u.fileType)}
                <span className="truncate max-w-[150px]">{u.originalName}</span>
                <Badge variant="outline" className="text-[10px] py-0">{u.fileType}</Badge>
              </div>
            ))}
          </div>
        )}

        {pendingFile ? (
          <div className="border rounded-lg p-3 space-y-2 text-sm">
            <div className="flex items-start justify-between gap-2">
              <span className="font-medium">{pendingFile.file.originalName}</span>
              <Badge className={`text-xs shrink-0 ${
                pendingFile.match.confidence === "high" ? "bg-green-100 text-green-800" :
                pendingFile.match.confidence === "medium" ? "bg-yellow-100 text-yellow-800" :
                "bg-red-100 text-red-800"
              }`}>{pendingFile.match.confidence}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">{pendingFile.match.reasoning}</p>
            <div className="flex gap-2">
              <Button size="sm" className="flex-1" onClick={() =>
                confirmUpload.mutate({
                  sessionId: id,
                  fileType: pendingFile.match.fileType,
                  originalName: pendingFile.file.originalName,
                  mimeType: pendingFile.file.mimeType,
                  extractedText: pendingFile.fullExtractedText,
                })
              }><Check className="w-3 h-3 mr-1" /> Save to session</Button>
              <Button size="sm" variant="outline" onClick={() => setPendingFile(null)}>
                <X className="w-3 h-3" />
              </Button>
            </div>
          </div>
        ) : (
          <div
            className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            {processingFile ? (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> Claude is analysing…
              </div>
            ) : (
              <>
                <Upload className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Upload case PDF, slides, or photo</p>
              </>
            )}
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.txt,.jpg,.jpeg,.png,.webp"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }}
            />
          </div>
        )}
      </section>
    </div>
  );
}
