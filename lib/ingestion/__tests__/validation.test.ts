import { describe, it, expect, beforeEach } from "vitest";
import {
  validatePdfMagicBytes,
  sanitizeFilename,
  generateInternalStoragePath,
  sanitizeExtractedText,
  inspectPdfBuffer,
} from "../validation";
import { checkUploadRateLimit, resetRateLimits } from "../rate-limiter";
import { INGESTION_CONFIG } from "../config";

describe("Document Ingestion Validation & Security", () => {
  describe("Binary Magic Bytes (File Signature) Validation", () => {
    it("accepts a valid PDF starting with %PDF- header", () => {
      const validPdfHeader = Buffer.from("%PDF-1.7\n%âãÏÓ\n1 0 obj\n<<>>\nendobj\n");
      expect(validatePdfMagicBytes(validPdfHeader)).toBe(true);
    });

    it("accepts a valid PDF with leading byte-order mark or whitespace within 1024 bytes", () => {
      const paddedPdf = Buffer.concat([
        Buffer.from([0xef, 0xbb, 0xbf]), // UTF-8 BOM
        Buffer.from("%PDF-1.4 standard content"),
      ]);
      expect(validatePdfMagicBytes(paddedPdf)).toBe(true);
    });

    it("rejects an executable script or HTML file renamed with .pdf extension", () => {
      const fakePdfHtml = Buffer.from("<!DOCTYPE html><html><script>alert('xss')</script></html>");
      expect(validatePdfMagicBytes(fakePdfHtml)).toBe(false);
    });

    it("rejects an image file disguised as a PDF", () => {
      const fakeJpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
      expect(validatePdfMagicBytes(fakeJpeg)).toBe(false);
    });

    it("rejects truncated or empty buffers", () => {
      expect(validatePdfMagicBytes(Buffer.from(""))).toBe(false);
      expect(validatePdfMagicBytes(Buffer.from("%PD"))).toBe(false);
    });
  });

  describe("Filename Sanitization & Storage Path Generation", () => {
    it("strips directory traversal characters from filenames", () => {
      const sanitized = sanitizeFilename("../../../etc/passwd.pdf");
      expect(sanitized).toBe("etcpasswd.pdf");
      expect(sanitized).not.toContain("..");
      expect(sanitized).not.toContain("/");
    });

    it("strips null bytes and control characters", () => {
      const sanitized = sanitizeFilename("malicious\0file\x01\x1f.pdf");
      expect(sanitized).toBe("maliciousfile.pdf");
      expect(sanitized).not.toContain("\0");
    });

    it("ensures the .pdf extension is always enforced", () => {
      expect(sanitizeFilename("syllabus_physics")).toBe("syllabus_physics.pdf");
      expect(sanitizeFilename("curriculum.docx")).toBe("curriculum.docx.pdf");
    });

    it("generates an isolated, safe internal storage path", () => {
      const path = generateInternalStoragePath("user-123-abc", "doc-456-xyz");
      expect(path).toBe("user-123-abc/doc-456-xyz.pdf");
      expect(path).not.toContain("..");
    });
  });

  describe("Extracted Text Sanitization (Untrusted Data Isolation)", () => {
    it("strips null bytes and non-printable control codes", () => {
      const dirty = "Extracted text with \0 null byte and \x07 bell bell";
      const clean = sanitizeExtractedText(dirty);
      expect(clean).toBe("Extracted text with  null byte and  bell bell");
      expect(clean).not.toContain("\0");
    });

    it("normalizes consecutive blank lines and carriage returns", () => {
      const messy = "Line 1\r\n\r\n\r\n\r\nLine 2";
      const clean = sanitizeExtractedText(messy);
      expect(clean).toBe("Line 1\n\nLine 2");
    });

    it("handles empty or non-string inputs safely", () => {
      expect(sanitizeExtractedText("")).toBe("");
      expect(sanitizeExtractedText(null as unknown as string)).toBe("");
    });
  });

  describe("PDF Buffer Inspection & Limits", () => {
    it("rejects files exceeding MAX_FILE_SIZE_BYTES", async () => {
      const oversizedBuffer = Buffer.alloc(INGESTION_CONFIG.MAX_FILE_SIZE_BYTES + 10);
      oversizedBuffer.write("%PDF-", 0);

      const result = await inspectPdfBuffer(oversizedBuffer);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("File size exceeds");
    });

    it("rejects non-PDF files without attempting to parse", async () => {
      const notPdf = Buffer.from("plain text without pdf signature");
      const result = await inspectPdfBuffer(notPdf);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("File header does not match");
    });
  });

  describe("Upload Rate Limiting", () => {
    beforeEach(() => {
      resetRateLimits();
    });

    it("allows uploads within the hourly quota", () => {
      const userId = "candidate-1";
      for (let i = 0; i < INGESTION_CONFIG.MAX_UPLOADS_PER_USER_PER_HOUR; i++) {
        const check = checkUploadRateLimit(userId);
        expect(check.allowed).toBe(true);
      }
    });

    it("blocks uploads once the hourly limit is reached", () => {
      const userId = "candidate-2";
      for (let i = 0; i < INGESTION_CONFIG.MAX_UPLOADS_PER_USER_PER_HOUR; i++) {
        checkUploadRateLimit(userId);
      }

      const blocked = checkUploadRateLimit(userId);
      expect(blocked.allowed).toBe(false);
      expect(blocked.remaining).toBe(0);
      expect(blocked.resetInMs).toBeGreaterThan(0);
    });

    it("isolates rate limits between different candidate accounts", () => {
      const userA = "candidate-a";
      const userB = "candidate-b";

      for (let i = 0; i < INGESTION_CONFIG.MAX_UPLOADS_PER_USER_PER_HOUR; i++) {
        checkUploadRateLimit(userA);
      }

      expect(checkUploadRateLimit(userA).allowed).toBe(false);
      expect(checkUploadRateLimit(userB).allowed).toBe(true);
    });
  });
});
