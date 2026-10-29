"use client";

import * as React from "react";
import { UploadCloud, FileText, CheckCircle2, AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

export interface DropzoneProps {
  onFileSelect?: (file: File) => void;
  acceptTypes?: string[];
  maxSizeMB?: number;
  className?: string;
}

export function Dropzone({
  onFileSelect,
  acceptTypes = [".pdf", ".docx"],
  maxSizeMB = 20,
  className,
}: DropzoneProps) {
  const [isDragging, setIsDragging] = React.useState(false);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const validateAndHandle = (file: File) => {
    setError(null);
    const extension = "." + file.name.split(".").pop()?.toLowerCase();
    if (!acceptTypes.includes(extension)) {
      setError(`Invalid file type. Supported formats: ${acceptTypes.join(", ")}`);
      return;
    }

    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`File size exceeds ${maxSizeMB}MB limit.`);
      return;
    }

    setSelectedFile(file);
    onFileSelect?.(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndHandle(e.dataTransfer.files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndHandle(e.target.files[0]);
    }
  };

  const removeFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedFile(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className={cn("w-full flex flex-col gap-2", className)}>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        aria-label="Upload study material document"
        className={cn(
          "relative flex flex-col items-center justify-center p-8 rounded-xl border-2 border-dashed transition-all cursor-pointer text-center",
          isDragging
            ? "border-primary bg-primary/5 scale-[1.01]"
            : "border-border hover:border-primary/50 hover:bg-muted/40 bg-card",
          selectedFile && "border-emerald-500/50 bg-emerald-50/20 dark:bg-emerald-950/10"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={acceptTypes.join(",")}
          className="hidden"
          onChange={handleInputChange}
        />

        {selectedFile ? (
          <div className="flex flex-col items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
            </div>
            <div className="space-y-1">
              <div className="font-semibold text-foreground text-sm flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary shrink-0" />
                <span className="truncate max-w-[280px]">{selectedFile.name}</span>
                <button
                  type="button"
                  onClick={removeFile}
                  className="text-muted-foreground hover:text-destructive p-1 rounded-md"
                  aria-label="Remove selected file"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB · Ready for analysis
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <UploadCloud className="h-6 w-6" aria-hidden="true" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">
                Click to upload or drag & drop syllabus / document
              </p>
              <p className="text-xs text-muted-foreground">
                Supported: PDF, DOCX (up to {maxSizeMB}MB)
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-1 pointer-events-none"
            >
              Select Document
            </Button>
          </div>
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2"
        >
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
