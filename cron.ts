import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import {
  Download, BookOpen, Merge, Check, Loader2, Sparkles,
} from "lucide-react";
import type { Session } from "@shared/schema";

interface DupeSession {
  id: number;
  syllabusTitle: string | null;
  courseName: string | null;
  semester: string | null;
  uploadCount: number;
  insightCount: number;
  hasJournal: boolean;
}

export default function LibraryPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [, setLocation] = useLocation();
  const [dupeOpen, setDupeOpen] = useState(false);
  const [mergingAll, setMergingAll] = useState(false);

  const { data: sessions = [], isLoading } = useQuery<Session[]>({
    queryKey: ["/api/sessions"],
    queryFn: () => apiRequest("GET", "/api/sessions").then(r => r.json()),
  });

  const { data: dupeData } = useQuery<{ clusters: DupeSession[][] }>({
    queryKey: ["/api/sessions/duplicates"],
    queryFn: () => apiRequest("GET", "/api/sessions/duplicates").then(r => r.json()),
  });

  const mergeMutation = useMutation({
    mutationFn: ({ keepId, deleteIds }: { keepId: number; deleteIds: number[] }) =>
      apiRequest("POST", "/api/sessions/merge", { keepId, deleteIds }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/sessions"] });
      qc.invalidateQueries({ queryKey: ["/api/sessions/duplicates"] });
    },
  });

  // Group sessions by course
  const byCourse = sessions.reduce<Record<string, Session[]>>((acc, s) => {
    const key = s.courseName ?? "Uncategorized";
    (acc[key] ??= []).push(s);
    return acc;
  }, {});

  // Sort sessions within each course by sessionNumber
  for (const key of Object.keys(byCourse)) {
    byCourse[key].sort((a, b) => (a.sessionNumber ?? 999) - (b.sessionNumber ?? 999));
  }

  const dupeClusters = dupeData?.clusters ?? [];
  const dupeCount = dupeClusters.reduce((n, c) => n + c.length - 1, 0);

  function exportCSV() {
    const rows = [
      ["Course", "Semester", "#", "Case Title", "Company", "Protagonist", "Journaled"],
      ...sessions.map(s => [
        s.courseName ?? "",
        s.semester ?? "",
        s.sessionNumber ?? "",
        s.syllabusTitle ?? "",
        (s as any).company ?? "",
        (s as any).protagonist ?? "",
        s.journalEntry ? "Yes" : "No",
      ]),
    ];
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "hbs-cases.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  function pickKeep(cluster: DupeSession[]): number {
    return cluster.slice().sort((a, b) =>
      (b.insightCount + (b.hasJournal ? 10 : 0) + b.uploadCount) -
      (a.insightCount + (a.hasJournal ? 10 : 0) + a.uploadCount)
    )[0].id;
  }

  async function mergeAll() {
    setMergingAll(true);
    for (const cluster of dupeClusters) {
      const keepId = pickKeep(cluster);
      const deleteIds = cluster.map(s => s.id).filter(id => id !== keepId);
      await mergeMutation.mutateAsync({ keepId, deleteIds });
    }
    setMergingAll(false);
    setDupeOpen(false);
    toast({ title: `${dupeCount} duplicate${dupeCount !== 1 ? "s" : ""} merged` });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-center p-6">
        <BookOpen className="w-10 h-10 text-muted-foreground/40" />
        <p className="font-medium">No sessions yet</p>
        <p className="text-sm text-muted-foreground">Import your course folders to get started.</p>
        <Button variant="outline" size="sm" onClick={() => setLocation("/")}>Go to Import</Button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">Courses</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {sessions.length} cases across {Object.keys(byCourse).length} courses
          </p>
        </div>
        <div className="flex gap-2">
          {dupeCount > 0 && (
            <Button variant="outline" size="sm" onClick={() => setDupeOpen(true)}>
              <Merge className="w-4 h-4 mr-2" />
              Clean up {dupeCount} duplicate{dupeCount !== 1 ? "s" : ""}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Courses */}
      {Object.entries(byCourse).map(([courseName, courseSessions]) => {
        const journaled = courseSessions.filter(s => s.journalEntry).length;
        const semester = courseSessions[0]?.semester;
        return (
          <section key={courseName}>
            <div className="flex items-baseline gap-3 mb-3">
              <h2 className="font-semibold text-base">
                {courseName}
                {semester && <span className="text-muted-foreground font-normal ml-1.5">— {semester}</span>}
              </h2>
              <span className="text-xs text-muted-foreground">
                {journaled} / {courseSessions.length} journaled
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {courseSessions.map(session => (
                <Card
                  key={session.id}
                  className="cursor-pointer hover:shadow-md hover:border-primary/30 transition-all"
                  onClick={() => setLocation(`/sessions/${session.id}`)}
                >
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      {session.sessionNumber ? (
                        <Badge variant="outline" className="text-[10px] shrink-0">
                          #{session.sessionNumber}
                        </Badge>
                      ) : null}
                      {session.journalEntry ? (
                        <Check className="w-3.5 h-3.5 text-primary shrink-0 ml-auto" />
                      ) : (
                        <span className="w-3.5 h-3.5 shrink-0 ml-auto" />
                      )}
                    </div>
                    <p className="text-sm font-medium leading-tight line-clamp-2">
                      {session.syllabusTitle || "Untitled"}
                    </p>
                    {((session as any).company || (session as any).protagonist) && (
                      <p className="text-xs text-muted-foreground truncate">
                        {[(session as any).company, (session as any).protagonist]
                          .filter(Boolean).join(" · ")}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        );
      })}

      {/* Dedup sheet */}
      <Sheet open={dupeOpen} onOpenChange={setDupeOpen}>
        <SheetContent className="w-[480px] overflow-auto">
          <SheetHeader>
            <SheetTitle>Duplicate Sessions</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              {dupeClusters.length} cluster{dupeClusters.length !== 1 ? "s" : ""} found. The richest version (most uploads + journal) will be kept.
            </p>
            <Button className="w-full" onClick={mergeAll} disabled={mergingAll}>
              {mergingAll
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Merging…</>
                : <><Sparkles className="w-4 h-4 mr-2" />Merge all duplicates</>
              }
            </Button>
            <div className="space-y-3">
              {dupeClusters.map((cluster, i) => (
                <div key={i} className="border rounded-lg p-3 space-y-2">
                  <p className="text-sm font-medium">{cluster[0].syllabusTitle}</p>
                  <p className="text-xs text-muted-foreground">{cluster[0].courseName}</p>
                  <div className="space-y-1">
                    {cluster.map(s => {
                      const isKeep = s.id === pickKeep(cluster);
                      return (
                        <div key={s.id} className={`flex items-center gap-2 text-xs px-2 py-1 rounded ${isKeep ? "bg-primary/5 text-primary" : "text-muted-foreground"}`}>
                          {isKeep ? <Check className="w-3 h-3 shrink-0" /> : <span className="w-3 h-3 shrink-0" />}
                          <span>ID {s.id}</span>
                          <span>{s.uploadCount} file{s.uploadCount !== 1 ? "s" : ""}</span>
                          <span>{s.insightCount} insight{s.insightCount !== 1 ? "s" : ""}</span>
                          {s.hasJournal && <Badge variant="secondary" className="text-[10px]">journaled</Badge>}
                          {isKeep && <Badge className="text-[10px] ml-auto">keep</Badge>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
