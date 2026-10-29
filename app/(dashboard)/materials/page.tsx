"use client";

import * as React from "react";
import Link from "next/link";
import {
  FolderArchive,
  Search,
  Filter,
  Plus,
  Sparkles,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Dropzone } from "@/components/ui/dropzone";
import { MOCK_MATERIALS, MaterialItem } from "@/lib/fixtures/mock-data";
import { uploadDocumentAction } from "@/app/actions/documents";

export default function MaterialLibraryPage() {
  const [materials, setMaterials] = React.useState<MaterialItem[]>(MOCK_MATERIALS);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedSubject, setSelectedSubject] = React.useState("All");
  const [isUploadOpen, setIsUploadOpen] = React.useState(false);
  const [uploadSuccessToast, setUploadSuccessToast] = React.useState<string | null>(null);
  const [uploadError, setUploadError] = React.useState<string | null>(null);

  // Upload progress & cancellation state
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const [currentUploadingFile, setCurrentUploadingFile] = React.useState<File | null>(null);
  const abortControllerRef = React.useRef<AbortController | null>(null);

  const subjects = ["All", "Use of English", "General Mathematics", "Physics", "Chemistry"];

  const filteredMaterials = materials.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.keyTopics.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesSubject = selectedSubject === "All" || item.subjectName === selectedSubject;
    return matchesSearch && matchesSubject;
  });

  const handleCancelUpload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsUploading(false);
    setUploadProgress(0);
    setCurrentUploadingFile(null);
    setUploadError("Upload cancelled by candidate.");
  };

  const handleFileUploaded = async (file: File) => {
    setUploadError(null);

    // Client-side pre-validation
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setUploadError("Only PDF documents are supported for automated CBT syllabus extraction.");
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setUploadError("File exceeds the 20MB maximum allowable upload size.");
      return;
    }

    setIsUploading(true);
    setUploadProgress(20);
    setCurrentUploadingFile(file);
    abortControllerRef.current = new AbortController();

    const progressTimer = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressTimer);
          return 90;
        }
        return prev + 15;
      });
    }, 200);

    try {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("subject_name", selectedSubject === "All" ? "General Studies" : selectedSubject);

      const result = await uploadDocumentAction(formData);

      clearInterval(progressTimer);

      if (result.success && result.documentId) {
        setUploadProgress(100);

        const newMaterial: MaterialItem = {
          id: result.documentId,
          title: file.name.replace(/\.[^/.]+$/, "").replace(/_/g, " "),
          filename: file.name,
          subjectId: "sub-1",
          subjectName: selectedSubject === "All" ? "General Studies" : selectedSubject,
          fileSizeFormatted: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
          pageCount: 1,
          status: "ready",
          uploadedAt: "Just now",
          keyTopics: ["Extracted Syllabus", "Practice Concepts"],
          summary: "Newly uploaded document processed and text extracted for CBT question synthesis.",
          generatedQuestionsCount: 0,
          difficultyBreakdown: { easy: 0, medium: 0, hard: 0 },
        };

        setMaterials([newMaterial, ...materials]);
        setIsUploadOpen(false);
        setUploadSuccessToast(`"${file.name}" uploaded and extracted successfully!`);
        setTimeout(() => setUploadSuccessToast(null), 5000);
      } else {
        setUploadError(result.error ?? "Failed to upload document.");
      }
    } catch (err: unknown) {
      clearInterval(progressTimer);
      setUploadError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      setCurrentUploadingFile(null);
      abortControllerRef.current = null;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-300">
      {/* Toast Notification */}
      {uploadSuccessToast && (
        <div
          role="status"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-foreground text-background px-4 py-3 rounded-xl shadow-xl border border-border text-sm font-medium animate-in slide-in-from-bottom-5"
        >
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>{uploadSuccessToast}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Material Library
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Upload curriculum materials, syllabi, and textbooks to generate subject-mapped CBT questions.
          </p>
        </div>

        <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 shadow-sm bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4" /> Upload Material
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Upload Syllabus or Study Material</DialogTitle>
              <DialogDescription>
                Upload your PDF file (up to 20MB). Binary magic bytes are validated and text is processed securely.
              </DialogDescription>
            </DialogHeader>

            {uploadError && (
              <div className="p-3 rounded-lg border border-destructive/20 bg-destructive/10 text-xs text-destructive flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            {isUploading ? (
              <div className="p-6 rounded-xl border border-border bg-card space-y-4 text-center">
                <FileText className="h-8 w-8 text-primary mx-auto animate-pulse" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">
                    Uploading & Validating Binary Header…
                  </p>
                  <p className="text-xs text-muted-foreground truncate max-w-xs mx-auto">
                    {currentUploadingFile?.name}
                  </p>
                </div>
                <Progress value={uploadProgress} className="h-2" />
                <div className="flex justify-between items-center text-xs text-muted-foreground pt-1">
                  <span>{uploadProgress}% completed</span>
                  <Button
                    onClick={handleCancelUpload}
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-destructive hover:bg-destructive/10"
                  >
                    <X className="h-3.5 w-3.5 mr-1" /> Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="py-2">
                <Dropzone onFileSelect={handleFileUploaded} />
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by title, topic, or keyword…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <Filter className="h-4 w-4 text-muted-foreground shrink-0 mr-1" />
          {subjects.map((subj) => (
            <button
              key={subj}
              onClick={() => setSelectedSubject(subj)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedSubject === subj
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-secondary text-secondary-foreground hover:bg-accent"
              }`}
            >
              {subj}
            </button>
          ))}
        </div>
      </div>

      {/* Material Cards Grid */}
      {filteredMaterials.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border p-12 text-center bg-card/50">
          <div className="h-12 w-12 rounded-xl bg-muted text-muted-foreground flex items-center justify-center mb-3">
            <FolderArchive className="h-6 w-6" />
          </div>
          <h3 className="text-base font-semibold text-foreground">No materials found</h3>
          <p className="text-sm text-muted-foreground max-w-sm mt-1 mb-4">
            No study documents match your search query &quot;{searchQuery}&quot;. Try adjusting your filter or upload a new file.
          </p>
          <Button onClick={() => { setSearchQuery(""); setSelectedSubject("All"); }} variant="outline" size="sm">
            Reset Filters
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMaterials.map((item) => (
            <Card key={item.id} className="flex flex-col justify-between hover:border-primary/50 transition-all hover:shadow-md group">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <Badge variant={item.status === "ready" ? "success" : "warning"} className="capitalize">
                    {item.status === "ready" ? (
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Ready
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3 animate-spin" /> Processing
                      </span>
                    )}
                  </Badge>
                  <span className="text-xs text-muted-foreground font-mono">{item.fileSizeFormatted}</span>
                </div>
                <CardTitle className="text-base mt-2 group-hover:text-primary transition-colors line-clamp-2">
                  {item.title}
                </CardTitle>
                <CardDescription className="text-xs">
                  {item.subjectName} · {item.pageCount} Pages · Uploaded {item.uploadedAt}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4 pt-0">
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {item.summary}
                </p>

                {/* Key Topics tags */}
                <div className="flex flex-wrap gap-1.5">
                  {item.keyTopics.slice(0, 3).map((topic) => (
                    <span
                      key={topic}
                      className="text-[10px] font-medium bg-secondary text-secondary-foreground px-2 py-0.5 rounded-md"
                    >
                      {topic}
                    </span>
                  ))}
                  {item.keyTopics.length > 3 && (
                    <span className="text-[10px] text-muted-foreground px-1 py-0.5 font-medium">
                      +{item.keyTopics.length - 3} more
                    </span>
                  )}
                </div>

                <div className="pt-3 border-t border-border flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground">
                    {item.generatedQuestionsCount} CBT Questions
                  </span>
                  <div className="flex gap-2">
                    <Button asChild variant="ghost" size="sm" className="h-8 px-2 text-xs">
                      <Link href={`/dashboard/materials/${item.id}`}>
                        Inspect <ChevronRight className="h-3 w-3 ml-1" />
                      </Link>
                    </Button>
                    {item.status === "ready" && (
                      <Button asChild variant="default" size="sm" className="h-8 px-3 text-xs gap-1">
                        <Link href={`/dashboard/exams/builder?material=${item.id}`}>
                          <Sparkles className="h-3 w-3" /> Practice
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
