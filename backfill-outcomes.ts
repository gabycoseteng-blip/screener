import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, Check, X, Pencil, BookOpen } from "lucide-react";
import { Link } from "wouter";

interface ParsedSession {
  sessionNumber: number;
  sessionDate: string | null;
  caseTitle: string;
  courseName: string;
  semester: string | null;
}

interface Session {
  id: number;
  sessionNumber: number | null;
  sessionDate: string | null;
  syllabusTitle: string | null;
  courseName: string | null;
  semester: string | null;
  journalEntry: string | null;
  caseId: number | null;
}

export default function JournalPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [syllabusText, setSyllabusText] = useState("");
  const [parsed, setParsed] = useState<ParsedSession[] | null>(null);
  const [editedSessions, setEditedSessions] = useState<ParsedSession[]>([]);
  const [parsing, setParsing] = useState(false);
  const [activeTab, setActiveTab] = useState<"upload" | "sessions">("upload");

  const { data: sessions = [] } = useQuery<Session[]>({
    queryKey: ["/api/sessions"],
    queryFn: () => apiRequest("GET", "/api/sessions").then((r) => r.json()),
  });

  const bulkCreate = useMutation({
    mutationFn: (data: ParsedSession[]) =>
      apiRequest("POST", "/api/sessions/bulk", {
        sessions: data.map((s) => ({
          sessionNumber: s.sessionNumber,
          sessionDate: s.sessionDate,
          syllabusTitle: s.caseTitle,
          courseName: s.courseName,
          semester: s.semester,
        })),
      }).then((r) => r.json()),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["/api/sessions"] });
      toast({ title: `${res.count} sessions created` });
      setParsed(null);
      setEditedSessions([]);
      setActiveTab("sessions");
    },
  });

  async function parseSyllabus(file?: File) {
    setParsing(true);
    try {
      const form = new FormData();
      if (file) {
        form.append("file", file);
      } else {
        form.append("text", syllabusText);
      }
      const res = await fetch("/api/syllabus/parse", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setParsed(data.sessions);
      setEditedSessions(data.sessions);
    } catch (err: any) {
      toast({ title: "Parse failed", description: err.message, variant: "destructive" });
    } finally {
      setParsing(false);
    }
  }

  function updateSession(idx: number, field: keyof ParsedSession, value: string | number) {
    setEditedSessions((prev) => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  }

  function removeSession(idx: number) {
    setEditedSessions((prev) => prev.filter((_, i) => i !== idx));
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Class Journal</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Import your syllabus to create session entries, then journal after each class.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant={activeTab === "upload" ? "default" : "outline"} size="sm" onClick={() => setActiveTab("upload")}>
            Import Syllabus
          </Button>
          <Button variant={activeTab === "sessions" ? "default" : "outline"} size="sm" onClick={() => setActiveTab("sessions")}>
            Sessions ({sessions.length})
          </Button>
        </div>
      </div>

      {activeTab === "upload" && (
        <div className="space-y-4">
          {!parsed ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Upload Syllabus</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div
                  className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
                  onClick={() => fileRef.current?.click()}
                >
                  <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Click to upload syllabus PDF</p>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".pdf,.txt,.md"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) parseSyllabus(f);
                    }}
                  />
                </div>

                <div className="relative flex items-center gap-3">
                  <div className="flex-1 border-t" />
                  <span className="text-xs text-muted-foreground">or paste text</span>
                  <div className="flex-1 border-t" />
                </div>

                <Textarea
                  placeholder="Paste syllabus content here..."
                  className="min-h-[160px] font-mono text-xs"
                  value={syllabusText}
                  onChange={(e) => setSyllabusText(e.target.value)}
                />

                <Button
                  className="w-full"
                  disabled={!syllabusText.trim() || parsing}
                  onClick={() => parseSyllabus()}
                >
                  {parsing ? "Parsing with Claude..." : "Parse Syllabus"}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Claude found <strong>{editedSessions.length}</strong> sessions. Review and confirm below.
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => { setParsed(null); setEditedSessions([]); }}>
                    Start Over
                  </Button>
                  <Button size="sm" onClick={() => bulkCreate.mutate(editedSessions)} disabled={bulkCreate.isPending}>
                    <Check className="w-4 h-4 mr-1" />
                    Confirm All ({editedSessions.length})
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                {editedSessions.map((session, idx) => (
                  <Card key={idx} className="p-3">
                    <div className="flex items-start gap-3">
                      <Badge variant="outline" className="mt-0.5 shrink-0 w-16 justify-center">
                        #{session.sessionNumber}
                      </Badge>
                      <div className="flex-1 grid grid-cols-2 gap-2 min-w-0">
                        <Input
                          value={session.caseTitle}
                          onChange={(e) => updateSession(idx, "caseTitle", e.target.value)}
                          className="text-sm h-8"
                          placeholder="Case title"
                        />
                        <Input
                          value={session.courseName}
                          onChange={(e) => updateSession(idx, "courseName", e.target.value)}
                          className="text-sm h-8"
                          placeholder="Course name"
                        />
                        <Input
                          value={session.sessionDate || ""}
                          onChange={(e) => updateSession(idx, "sessionDate", e.target.value)}
                          className="text-sm h-8"
                          placeholder="Date (YYYY-MM-DD)"
                        />
                        <Input
                          value={session.semester || ""}
                          onChange={(e) => updateSession(idx, "semester", e.target.value)}
                          className="text-sm h-8"
                          placeholder="Semester"
                        />
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => removeSession(idx)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "sessions" && (
        <div className="space-y-2">
          {sessions.length === 0 ? (
            <Card className="p-8 text-center">
              <BookOpen className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No sessions yet. Import a syllabus to get started.</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => setActiveTab("upload")}>
                Import Syllabus
              </Button>
            </Card>
          ) : (
            sessions.map((session) => (
              <Link key={session.id} href={`/sessions/${session.id}`}>
                <Card className="p-4 hover:bg-muted/50 cursor-pointer transition-colors">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="shrink-0 w-14 justify-center">
                      #{session.sessionNumber ?? "?"}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{session.syllabusTitle || "Untitled"}</p>
                      <p className="text-xs text-muted-foreground">
                        {session.courseName}{session.sessionDate ? ` · ${session.sessionDate}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {session.journalEntry ? (
                        <Badge variant="secondary" className="text-xs">Journaled</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs text-muted-foreground">No entry</Badge>
                      )}
                      <Pencil className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                </Card>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}
