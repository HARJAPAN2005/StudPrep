import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Badge } from "../badge";
import { Card, CardTitle, CardDescription, CardContent } from "../card";
import { Dropzone } from "../dropzone";

describe("Badge Component", () => {
  it("renders with default variant", () => {
    render(<Badge>Default Badge</Badge>);
    expect(screen.getByText("Default Badge")).toBeInTheDocument();
  });

  it("renders with success and warning variants", () => {
    render(<Badge variant="success">Active</Badge>);
    expect(screen.getByText("Active")).toBeInTheDocument();
  });
});

describe("Card Component", () => {
  it("renders header, title, and content", () => {
    render(
      <Card>
        <CardTitle>Test Title</CardTitle>
        <CardDescription>Test Description</CardDescription>
        <CardContent>Test Body Content</CardContent>
      </Card>
    );
    expect(screen.getByText("Test Title")).toBeInTheDocument();
    expect(screen.getByText("Test Description")).toBeInTheDocument();
    expect(screen.getByText("Test Body Content")).toBeInTheDocument();
  });
});

describe("Dropzone Component", () => {
  it("renders upload call to action with accepted types", () => {
    render(<Dropzone acceptTypes={[".pdf", ".docx"]} maxSizeMB={20} />);
    expect(screen.getByText(/Click to upload or drag & drop/i)).toBeInTheDocument();
    expect(screen.getByText(/Supported: PDF, DOCX/i)).toBeInTheDocument();
  });

  it("handles valid file selection", () => {
    const handleSelect = vi.fn();
    const { container } = render(<Dropzone onFileSelect={handleSelect} />);
    const file = new File(["dummy content"], "syllabus.pdf", { type: "application/pdf" });

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    Object.defineProperty(input, "files", {
      value: [file],
    });
    fireEvent.change(input);

    expect(handleSelect).toHaveBeenCalledWith(file);
    expect(screen.getByText("syllabus.pdf")).toBeInTheDocument();
  });

  it("shows error on invalid file type", () => {
    const { container } = render(<Dropzone acceptTypes={[".pdf"]} />);
    const file = new File(["dummy"], "malicious.exe", { type: "application/x-msdownload" });

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    Object.defineProperty(input, "files", {
      value: [file],
    });
    fireEvent.change(input);

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText(/Invalid file type/i)).toBeInTheDocument();
  });
});

