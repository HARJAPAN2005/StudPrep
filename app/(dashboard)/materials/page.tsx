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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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

export default function MaterialLibraryPage() {
  const [materials, setMaterials] = React.useState<MaterialItem[]>(MOCK_MATERIALS);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedSubject, setSelectedSubject] = React.useState("All");
  const [isUploadOpen, setIsUploadOpen] = React.useState(false);
  const [uploadSuccessToast, setUploadSuccessToast] = React.useState<string | null>(null);

  const subjects = ["All", "Use of English", "General Mathematics", "Physics", "Chemistry"];

  const filteredMaterials = materials.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.keyTopics.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesSubject = selectedSubject === "All" || item.subjectName === selectedSubject;
    return matchesSearch && matchesSubject;
  });

  const handleFileUploaded = (file: File) => {
    const newMaterial: MaterialItem = {
      id: `mat-${Date.now()}`,
      title: file.name.replace(/\.[^/.]+$/, "").replace(/_/g, " "),
      filename: file.name,
      subjectId: "sub-1",
      subjectName: selectedSubject === "All" ? "Use of English" : selectedSubject,
      fileSizeFormatted: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
      pageCount: 32,
      status: "processing",
      uploadedAt: new Date().toISOString().split("T")[0],
      keyTopics: ["Extracted Syllabus", "Practice Concepts"],
      summary: "Newly uploaded document currently queued for concept indexing.",
      generatedQuestionsCount: 0,
      difficultyBreakdown: { easy: 0, medium: 0, hard: 0 },
    };

    setMaterials([newMaterial, ...materials]);
    setIsUploadOpen(false);
    setUploadSuccessToast(`"${file.name}" uploaded successfully! Analysis scheduled.`);
    setTimeout(() => setUploadSuccessToast(null), 5000);
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
                Upload your PDF or DOCX file (up to 20MB). Extracted text is treated securely as untrusted reference data.
              </DialogDescription>
            </DialogHeader>
            <div className="py-2">
              <Dropzone onFileSelect={handleFileUploaded} />
            </div>
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
