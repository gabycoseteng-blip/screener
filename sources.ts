import { useState, useCallback } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, FileText, Plus, Trash2, BookOpen } from "lucide-react";
import { useLocation } from "wouter";

const SEMESTERS = ["RC Fall", "RC Spring", "EC Fall", "EC Spring"];

const INDUSTRIES = [
  "Technology",
  "Finance",
  "Healthcare",
  "Energy",
  "Retail",
  "Manufacturing",
  "Media",
  "Real Estate",
  "Education",
  "Government",
  "Nonprofit",
  "Consulting",
  "Other",
];

export default function UploadPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [dragOver, setDragOver] = useState(false);
  const [manualCases, setManualCases] = useState<
    Array<{ title: string; courseName: string; semester: string }>
  >([]);
  const [bulkText, setBulkText] = useState("");
  const [bulkCourse, setBulkCourse] = useState("");
  const [bulkSemester, setBulkSemester] = useState("");
  const [mode, setMode] = useState<"upload" | "manual" | "bulk">("bulk");

  const { data: stats } = useQuery<{ total: number }>({
    queryKey: ["/api/stats"],
    queryFn: () => apiRequest("GET", "/api/stats").then((r) => r.json()),
  });

  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      const formData = new FormData();
      files.forEach((f) => formData.append("files", f));
      const resp = await fetch("/api/upload", { method: "POST", body: formData });
      if (!resp.ok) throw new Error("Upload failed");
      return resp.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Files processed",
        description: `Extracted ${data.count} cases. Head to Catalogue to start reviewing.`,
      });
    },
    onError: () => {
      toast({ title: "Upload failed", description: "Could not process files.", variant: "destructive" });
    },
  });

  const bulkMutation = useMutation({
    mutationFn: async (cases: any[]) => {
      const resp = await apiRequest("POST", "/api/cases/bulk", { cases });
      return resp.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      setBulkText("");
      setBulkCourse("");
      toast({
        title: "Cases added",
        description: `${data.count} cases ready for cataloguing.`,
      });
    },
  });

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) uploadMutation.mutate(files);
    },
    [uploadMutation]
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) uploadMutation.mutate(files);
  };

  const handleBulkAdd = () => {
    if (!bulkText.trim()) return;
    const lines = bulkText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    const cases = lines.map((title, i) => ({
      title,
      courseName: bulkCourse || undefined,
      semester: bulkSemester || undefined,
      status: "pending",
      orderIndex: i,
    }));
    bulkMutation.mutate(cases);
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold" data-testid="text-page-title">
          Add Cases
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Add your HBS cases here, then head to Catalogue to record your takeaways.
          {stats && stats.total > 0 && (
            <span className="ml-1">You have {stats.total} cases so far.</span>
          )}
        </p>
      </div>

      {/* Mode tabs */}
      <div className="flex gap-1 bg-muted p-1 rounded-md w-fit">
        <button
          onClick={() => setMode("bulk")}
          className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
            mode === "bulk"
              ? "bg-background font-medium"
              : "text-muted-foreground"
          }`}
          data-testid="button-mode-bulk"
        >
          Paste list
        </button>
        <button
          onClick={() => setMode("upload")}
          className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
            mode === "upload"
              ? "bg-background font-medium"
              : "text-muted-foreground"
          }`}
          data-testid="button-mode-upload"
        >
          Upload files
        </button>
      </div>

      {mode === "bulk" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Paste case titles</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Paste one case title per line. Fastest way to add cases from a syllabus.
            </p>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Course name
                </label>
                <Input
                  placeholder="e.g. FRC, TEM, LEAD..."
                  value={bulkCourse}
                  onChange={(e) => setBulkCourse(e.target.value)}
                  data-testid="input-bulk-course"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Semester
                </label>
                <Select value={bulkSemester} onValueChange={setBulkSemester}>
                  <SelectTrigger data-testid="select-bulk-semester">
                    <SelectValue placeholder="Select semester" />
                  </SelectTrigger>
                  <SelectContent>
                    {SEMESTERS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Textarea
              placeholder={"Walmart's Workforce of the Future\nRobin Hood\nGeneral Electric\nAirborne Express..."}
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              rows={10}
              className="font-mono text-sm"
              data-testid="textarea-bulk-cases"
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {bulkText.split("\n").filter((l) => l.trim()).length} cases
              </span>
              <Button
                onClick={handleBulkAdd}
                disabled={!bulkText.trim() || bulkMutation.isPending}
                data-testid="button-bulk-add"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add cases
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {mode === "upload" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Upload syllabi or case lists</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`border-2 border-dashed rounded-md p-10 text-center transition-colors ${
                dragOver
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/20"
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              data-testid="dropzone"
            >
              <Upload className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-2">
                Drop PDF, TXT, or CSV files here
              </p>
              <p className="text-xs text-muted-foreground mb-4">
                We'll extract case titles from syllabi and reading lists
              </p>
              <label>
                <Button variant="secondary" asChild>
                  <span>
                    <FileText className="w-4 h-4 mr-2" />
                    Choose files
                  </span>
                </Button>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.txt,.csv,.md"
                  className="hidden"
                  onChange={handleFileSelect}
                  data-testid="input-file-upload"
                />
              </label>
            </div>
            {uploadMutation.isPending && (
              <p className="text-sm text-muted-foreground mt-3 text-center">
                Processing files...
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {stats && stats.total > 0 && (
        <div className="flex justify-center pt-2">
          <Button onClick={() => setLocation("/catalogue")} data-testid="button-go-catalogue">
            <BookOpen className="w-4 h-4 mr-2" />
            Start cataloguing ({stats.total} cases)
          </Button>
        </div>
      )}
    </div>
  );
}
