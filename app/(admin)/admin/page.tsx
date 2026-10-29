import type { Metadata } from "next";
import {
  BookOpen,
  FileText,
  Database,
  Users,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MOCK_SUBJECTS, MOCK_MATERIALS } from "@/lib/fixtures/mock-data";

export const metadata: Metadata = {
  title: "Admin Dashboard · StudPilot",
  description: "Curriculum management, document processing queues, and question bank oversight.",
};

export default function AdminDashboardPage() {
  const subjects = MOCK_SUBJECTS;
  const materials = MOCK_MATERIALS;

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-300">
      {/* ── Title ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Curriculum & Processing Oversight
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage official examination board subjects, monitor document indexing, and review generated item banks.
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="default" size="sm" className="gap-2">
            <Plus className="h-4 w-4" /> Add Subject
          </Button>
        </div>
      </div>

      {/* ── Stat Overview ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Total Subjects</span>
              <p className="text-2xl font-bold text-foreground">{subjects.length}</p>
              <p className="text-[11px] text-muted-foreground">JAMB / WAEC / ICAN</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <BookOpen className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Uploaded Documents</span>
              <p className="text-2xl font-bold text-foreground">{materials.length}</p>
              <p className="text-[11px] text-emerald-600 font-medium">3 Indexed, 1 In Queue</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <FileText className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Approved Question Bank</span>
              <p className="text-2xl font-bold text-foreground">1,910</p>
              <p className="text-[11px] text-muted-foreground">Schema validated</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Database className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Active Candidate Cohort</span>
              <p className="text-2xl font-bold text-foreground">428</p>
              <p className="text-[11px] text-emerald-600 font-medium">Active practice students</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <Users className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Document Ingestion Processing Queue ─────────────────────────────── */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base font-semibold">Document Ingestion Pipeline Queue</CardTitle>
            <CardDescription>Live status of study documents uploaded by staff & students</CardDescription>
          </div>
          <Badge variant="outline">Private Storage Bucket: documents</Badge>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                <tr>
                  <th className="py-3 px-4">Document Title</th>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Size</th>
                  <th className="py-3 px-4">Pages</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {materials.map((mat) => (
                  <tr key={mat.id} className="hover:bg-muted/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-foreground block">{mat.title}</span>
                      <span className="text-xs text-muted-foreground font-mono">{mat.filename}</span>
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground">{mat.subjectName}</td>
                    <td className="py-3.5 px-4 font-mono text-xs">{mat.fileSizeFormatted}</td>
                    <td className="py-3.5 px-4 font-mono text-xs">{mat.pageCount}</td>
                    <td className="py-3.5 px-4">
                      <Badge variant={mat.status === "ready" ? "success" : "warning"} className="capitalize">
                        {mat.status}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Button variant="ghost" size="sm" className="h-7 text-xs">
                        Audit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ── Subject Management ─────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Curriculum Subject Directory</CardTitle>
          <CardDescription>Official examination board categories and question allocations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {subjects.map((subj) => (
              <div key={subj.id} className="p-4 rounded-xl border border-border bg-card space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-foreground">{subj.name}</span>
                  <Badge variant="indigo" className="font-mono text-[10px]">{subj.code}</Badge>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{subj.description}</p>
                <div className="pt-2 flex justify-between items-center text-xs font-semibold text-muted-foreground">
                  <span>{subj.materialCount} Documents</span>
                  <span>{subj.questionCount} Questions</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
