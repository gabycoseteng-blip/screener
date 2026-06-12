import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  FolderOpen, FileText, FileSpreadsheet, Image as ImageIcon,
  X, ChevronDown, ChevronRight, Check, Loader2, GripVertical,
} from "lucide-react";

const SEMESTERS = ["RC Fall", "RC Spring", "EC Fall", "EC Spring"];

interface ImportFile {
  name: string;
  text: string;
}

interface ImportCase {
  id: string;
  sessionNumber: number;
  caseTitle: string;
  files: ImportFile[];
}

interface ImportCourse {
  name: string;
  semester: string;
  cases: ImportCase[];
}

interface DragState {
  courseName: string;
  caseId: string;
  fileName: string;
}

type Step = 1 | 2 | 3 | 4;

function FileIcon({ name }: { name: string }) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["jpg", "jpeg", "png", "webp", "gif"].includes(ext))
    return <ImageIcon className="w-3.5 h-3.5 shrink-0" />;
  if (["xlsx", "xls", "csv"].includes(ext))
    return <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" />;
  return <FileText className="w-3.5 h-3.5 shrink-0" />;
}

function StepBubble({ n, current }: { n: number; current: Step }) {
  const done = current > n;
  const active = current === n;
  return (
    <span className={`flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold border ${
      done ? "bg-primary text-primary-foreground border-primary" :
      active ? "border-primary text-primary" :
      "border-border text-muted-foreground"
    }`}>
      {done ? <Check className="w-3 h-3" /> : n}
    </span>
  );
}

export default function ImportPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const folderInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>(1);
  const [rawFiles, setRawFiles] = useState<File[]>([]);
  const [courseSummary, setCourseSummary] = useState<Record<string, number>>({});
  const [statusMsg, setStatusMsg] = useState("");
  const [progressPct, setProgressPct] = useState(0);
  const [courses, setCourses] = useState<ImportCourse[]>([]);
  const [expandedCourses, setExpandedCourses] = useState<Set<string>>(new Set());
  const [commitProgress, setCommitProgress] = useState(0);
  const [commitStatus, setCommitStatus] = useState("");

  // drag-and-drop state
  const [dragging, setDragging] = useState<DragState | null>(null);
  const [dragOverCaseId, setDragOverCaseId] = useState<string | null>(null);

  // ── Step 1 ────────────────────────────────────────────────────────────

  function handleFiles(files: FileList) {
    const arr = Array.from(files);
    const summary: Record<string, number> = {};
    for (const f of arr) {
      const parts = (f as any).webkitRelativePath?.split("/") ?? [];
      const course = parts.length > 1 ? parts[0] : "Uncategorized";
      summary[course] = (summary[course] ?? 0) + 1;
    }
    setRawFiles(arr);
    setCourseSummary(summary);
  }

  // ── Step 2: processing ────────────────────────────────────────────────

  async function runImport() {
    if (rawFiles.length === 0) return;
    setStep(2);
    setProgressPct(0);

    const courseFiles: Record<string, File[]> = {};
    for (const f of rawFiles) {
      const parts = (f as any).webkitRelativePath?.split("/") ?? [];
      const course = parts.length > 1 ? parts[0] : "Uncategorized";
      (courseFiles[course] ??= []).push(f);
    }

    const courseNames = Object.keys(courseFiles);
    const totalBatches = courseNames.reduce(
      (n, c) => n + Math.ceil(courseFiles[c].length / 10), 0
    );
    let doneBatches = 0;
    const allCourses: ImportCourse[] = [];

    for (const course of courseNames) {
      setStatusMsg(`Extracting ${course} files…`);
      const files = courseFiles[course];
      const extracted: ImportFile[] = [];

      for (let i = 0; i < files.length; i += 10) {
        const batch = files.slice(i, i + 10);
        const form = new FormData();
        batch.forEach(f => form.append("files", f));
        form.append("course", course);

        try {
          const res = await fetch("/api/import/analyze", { method: "POST", body: form });
          if (res.ok) {
            const data = await res.json();
            extracted.push(...(data.files ?? []));
          } else {
            batch.forEach(f => extracted.push({ name: f.name, text: "" }));
          }
        } catch {
          batch.forEach(f => extracted.push({ name: f.name, text: "" }));
        }

        doneBatches++;
        setProgressPct(Math.round((doneBatches / totalBatches) * 60));
      }

      setStatusMsg(`Grouping ${course} cases with Claude…`);
      try {
        const res = await fetch("/api/import/group", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            course,
            files: extracted.map(f => ({ name: f.name, text: f.text.slice(0, 500) })),
          }),
        });
        if (res.ok) {
          const data = await res.json();
          const assignedNames = new Set<string>();
          const cases: ImportCase[] = (data.sessions ?? []).map((s: any, i: number) => {
            const matchedFiles = (s.fileNames ?? []).map((name: string) => {
              assignedNames.add(name);
              return extracted.find(f => f.name === name) ?? { name, text: "" };
            });
            return {
              id: `${course}-${i}`,
              sessionNumber: s.sessionNumber ?? i + 1,
              caseTitle: s.caseTitle ?? "Untitled",
              files: matchedFiles,
            };
          });
          const unassigned = extracted.filter(f => !assignedNames.has(f.name));
          if (unassigned.length > 0) {
            cases.push({
              id: `${course}-unassigned`,
              sessionNumber: 0,
              caseTitle: "Unsorted files",
              files: unassigned,
            });
          }
          allCourses.push({ name: course, semester: "", cases });
        } else {
          allCourses.push(fallbackCourse(course, extracted));
        }
      } catch {
        allCourses.push(fallbackCourse(course, extracted));
      }

      setProgressPct(Math.min(95, Math.round((allCourses.length / courseNames.length) * 95)));
    }

    setProgressPct(100);
    setStatusMsg("Done!");
    setCourses(allCourses);
    setExpandedCourses(new Set(allCourses.map(c => c.name)));
    setStep(3);
  }

  function fallbackCourse(course: string, extracted: ImportFile[]): ImportCourse {
    return {
      name: course,
      semester: "",
      cases: extracted.map((f, i) => ({
        id: `${course}-${i}`,
        sessionNumber: i + 1,
        caseTitle: f.name.replace(/\.[^/.]+$/, ""),
        files: [f],
      })),
    };
  }

  // ── Step 3 edit helpers ───────────────────────────────────────────────

  function updateCaseTitle(courseName: string, caseId: string, title: string) {
    setCourses(prev => prev.map(c =>
      c.name !== courseName ? c : {
        ...c,
        cases: c.cases.map(cas => cas.id === caseId ? { ...cas, caseTitle: title } : cas),
      }
    ));
  }

  function removeFile(courseName: string, caseId: string, fileName: string) {
    setCourses(prev => prev.map(c =>
      c.name !== courseName ? c : {
        ...c,
        cases: c.cases
          .map(cas => cas.id !== caseId ? cas : {
            ...cas, files: cas.files.filter(f => f.name !== fileName),
          })
          .filter(cas => cas.files.length > 0),
      }
    ));
  }

  function updateSemester(courseName: string, semester: string) {
    setCourses(prev => prev.map(c => c.name === courseName ? { ...c, semester } : c));
  }

  function toggleCourse(name: string) {
    setExpandedCourses(prev => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  }

  // ── Drag-and-drop ────────────────────────────────────────────────────

  function handleDragStart(courseName: string, caseId: string, fileName: string) {
    setDragging({ courseName, caseId, fileName });
  }

  function handleDrop(targetCourseName: string, targetCaseId: string) {
    if (!dragging || (dragging.caseId === targetCaseId)) {
      setDragging(null);
      setDragOverCaseId(null);
      return;
    }
    const { courseName: srcCourse, caseId: srcCase, fileName } = dragging;

    setCourses(prev => {
      // Find the file in source
      let movedFile: ImportFile | undefined;
      const updated = prev.map(c => {
        if (c.name !== srcCourse) return c;
        return {
          ...c,
          cases: c.cases
            .map(cas => {
              if (cas.id !== srcCase) return cas;
              movedFile = cas.files.find(f => f.name === fileName);
              return { ...cas, files: cas.files.filter(f => f.name !== fileName) };
            })
            .filter(cas => cas.files.length > 0),
        };
      });
      if (!movedFile) return prev;
      // Add file to target
      return updated.map(c => {
        if (c.name !== targetCourseName) return c;
        return {
          ...c,
          cases: c.cases.map(cas =>
            cas.id !== targetCaseId ? cas : { ...cas, files: [...cas.files, movedFile!] }
          ),
        };
      });
    });

    setDragging(null);
    setDragOverCaseId(null);
  }

  // ── Step 4: commit + batched insights ────────────────────────────────

  async function commit() {
    setStep(4);
    setCommitProgress(5);
    setCommitStatus("Creating sessions…");

    let sessionIds: number[] = [];

    try {
      const res = await fetch("/api/import/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courses }),
      });
      if (!res.ok) throw new Error("Commit failed");
      const data = await res.json();
      sessionIds = data.sessionIds ?? [];
      setCommitProgress(20);
    } catch {
      toast({ title: "Import failed", description: "Could not create sessions.", variant: "destructive" });
      setStep(3);
      return;
    }

    setCommitProgress(100);
    setCommitStatus("Done!");
    toast({ title: `${sessionIds.length} sessions created`, description: "Opening Journal…" });
    setTimeout(() => setLocation("/journal"), 1000);
  }

  // ── Render ────────────────────────────────────────────────────────────

  const totalFiles = rawFiles.length;
  const totalCourseCount = Object.keys(courseSummary).length;
  const stepLabels = ["Drop files", "Process", "Review", "Commit"];

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">

      {/* Stepper */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {stepLabels.map((label, i) => (
          <span key={label} className="flex items-center gap-2">
            <StepBubble n={i + 1} current={step} />
            <span className={step === i + 1 ? "text-foreground font-medium" : ""}>{label}</span>
            {i < stepLabels.length - 1 && <span className="text-border">—</span>}
          </span>
        ))}
      </div>

      {/* ── Step 1 ── */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <h1 className="text-xl font-bold">Import Your Cases</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Select your course folders — PDFs, slides, exhibits, and photos all at once.
            </p>
          </div>

          <Card
            className="border-2 border-dashed cursor-pointer hover:border-primary transition-colors"
            onClick={() => folderInputRef.current?.click()}
          >
            <CardContent className="p-14 text-center space-y-3">
              <FolderOpen className="w-10 h-10 mx-auto text-muted-foreground" />
              <div>
                <p className="font-medium text-base">Choose your course folder</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Select the root folder containing FRC/, TEM/, LEAD/, etc.
                </p>
              </div>
              <p className="text-xs text-muted-foreground">PDFs · Excel · JPGs · 100+ files supported</p>
            </CardContent>
          </Card>

          <input
            ref={folderInputRef}
            type="file"
            className="hidden"
            multiple
            {...{ webkitdirectory: "" } as any}
            onChange={e => e.target.files && handleFiles(e.target.files)}
          />

          {totalFiles > 0 && (
            <Card>
              <CardContent className="p-4 space-y-3">
                <p className="text-sm font-medium">
                  {totalFiles} file{totalFiles !== 1 ? "s" : ""} across{" "}
                  {totalCourseCount} course{totalCourseCount !== 1 ? "s" : ""}
                </p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(courseSummary).map(([course, count]) => (
                    <Badge key={course} variant="secondary">
                      {course} · {count}
                    </Badge>
                  ))}
                </div>
                <Button className="w-full mt-2" onClick={runImport}>
                  Start Import
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ── Step 2 ── */}
      {step === 2 && (
        <div className="space-y-6 py-12">
          <div className="text-center space-y-2">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
            <p className="font-medium">{statusMsg || "Starting…"}</p>
            <p className="text-xs text-muted-foreground">
              Extracting text and grouping into cases with Claude
            </p>
          </div>
          <Progress value={progressPct} className="h-2" />
          <p className="text-xs text-center text-muted-foreground">{progressPct}%</p>
        </div>
      )}

      {/* ── Step 3 ── */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold">Review & Edit</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {courses.reduce((n, c) => n + c.cases.length, 0)} cases across{" "}
                {courses.length} course{courses.length !== 1 ? "s" : ""}
                <span className="ml-2 text-muted-foreground/60">· drag files between cases to reorganize</span>
              </p>
            </div>
            <Button onClick={commit}>
              <Check className="w-4 h-4 mr-2" />
              Confirm & Generate Journal
            </Button>
          </div>

          <div className="space-y-2">
            {courses.map(course => (
              <Card key={course.name} className="overflow-hidden">
                {/* Course header */}
                <div
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none hover:bg-muted/40 transition-colors"
                  onClick={() => toggleCourse(course.name)}
                >
                  {expandedCourses.has(course.name)
                    ? <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground" />
                    : <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground" />
                  }
                  <span className="font-semibold flex-1">{course.name}</span>
                  <Badge variant="outline" className="text-xs">
                    {course.cases.length} case{course.cases.length !== 1 ? "s" : ""}
                  </Badge>
                  <Select
                    value={course.semester}
                    onValueChange={v => updateSemester(course.name, v)}
                  >
                    <SelectTrigger
                      className="w-32 h-7 text-xs"
                      onClick={e => e.stopPropagation()}
                    >
                      <SelectValue placeholder="Semester" />
                    </SelectTrigger>
                    <SelectContent>
                      {SEMESTERS.map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Cases */}
                {expandedCourses.has(course.name) && (
                  <div className="border-t divide-y">
                    {course.cases.map(cas => (
                      <div
                        key={cas.id}
                        className={`px-4 py-3 space-y-2 transition-colors ${
                          dragOverCaseId === cas.id ? "bg-primary/5 ring-1 ring-inset ring-primary/20" : ""
                        }`}
                        onDragOver={e => { e.preventDefault(); setDragOverCaseId(cas.id); }}
                        onDragLeave={() => setDragOverCaseId(null)}
                        onDrop={() => handleDrop(course.name, cas.id)}
                      >
                        <div className="flex items-center gap-2">
                          {cas.sessionNumber > 0 && (
                            <span className="text-[10px] font-bold text-muted-foreground w-6 shrink-0 tabular-nums">
                              #{cas.sessionNumber}
                            </span>
                          )}
                          <Input
                            value={cas.caseTitle}
                            onChange={e => updateCaseTitle(course.name, cas.id, e.target.value)}
                            className="h-7 text-sm font-medium border-0 px-0 focus-visible:ring-0 bg-transparent"
                          />
                          {cas.caseTitle === "Unsorted files" && (
                            <span className="text-xs text-muted-foreground italic shrink-0">
                              drag into a case ↓
                            </span>
                          )}
                        </div>

                        {cas.files.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pl-8">
                            {cas.files.map(file => (
                              <div
                                key={file.name}
                                draggable
                                onDragStart={() => handleDragStart(course.name, cas.id, file.name)}
                                onDragEnd={() => { setDragging(null); setDragOverCaseId(null); }}
                                className={`flex items-center gap-1.5 text-xs rounded-md px-2 py-1 cursor-grab active:cursor-grabbing transition-colors ${
                                  dragging?.fileName === file.name && dragging?.caseId === cas.id
                                    ? "opacity-40"
                                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                                }`}
                              >
                                <GripVertical className="w-3 h-3 shrink-0 opacity-40" />
                                <FileIcon name={file.name} />
                                <span className="max-w-[180px] truncate">{file.name}</span>
                                <button
                                  className="ml-0.5 hover:text-destructive transition-colors"
                                  onClick={() => removeFile(course.name, cas.id, file.name)}
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {dragOverCaseId === cas.id && dragging && (
                          <p className="text-xs text-primary pl-8">
                            Drop here to move {dragging.fileName}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            ))}
          </div>

          <div className="flex justify-end pt-2">
            <Button size="lg" onClick={commit}>
              <Check className="w-4 h-4 mr-2" />
              Confirm & Generate Journal
            </Button>
          </div>
        </div>
      )}

      {/* ── Step 4 ── */}
      {step === 4 && (
        <div className="space-y-6 py-12">
          <div className="text-center space-y-2">
            {commitProgress < 100
              ? <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
              : <Check className="w-8 h-8 mx-auto text-primary" />
            }
            <p className="font-medium">{commitStatus}</p>
            {commitProgress < 100 && (
              <p className="text-xs text-muted-foreground">
                Claude is writing takeaway suggestions for each case
              </p>
            )}
          </div>
          <Progress value={commitProgress} className="h-2" />
          <p className="text-xs text-center text-muted-foreground">{commitProgress}%</p>
        </div>
      )}
    </div>
  );
}
