/**
 * StudPilot Development Mock Fixtures
 * 
 * Isolated test/mock data layer behind typed TypeScript contracts.
 * Used for development preview, responsive UI testing, and design verification
 * without coupling to live backend infrastructure or external AI providers.
 */

export interface SubjectItem {
  id: string;
  code: string;
  name: string;
  category: "General" | "Sciences" | "Commercial" | "Arts";
  description: string;
  materialCount: number;
  questionCount: number;
  color: string;
}

export interface MaterialItem {
  id: string;
  title: string;
  filename: string;
  subjectId: string;
  subjectName: string;
  fileSizeFormatted: string;
  pageCount: number;
  status: "ready" | "processing" | "pending" | "failed";
  uploadedAt: string;
  keyTopics: string[];
  summary: string;
  generatedQuestionsCount: number;
  difficultyBreakdown: {
    easy: number;
    medium: number;
    hard: number;
  };
}

export interface QuestionOption {
  id: string;
  text: string;
}

export interface CBTQuestion {
  id: string;
  number: number;
  subject: string;
  topic: string;
  question: string;
  options: QuestionOption[];
  correctOptionId: string; // Used strictly post-submission in results view
  explanation: string;     // Used strictly post-submission in results view
  sourcePage?: number;
  difficulty: "easy" | "medium" | "hard";
}

export interface ExamSessionFixture {
  id: string;
  title: string;
  subject: string;
  totalQuestions: number;
  timeLimitMinutes: number;
  mode: "strict" | "practice";
  startedAt: string;
  status: "active" | "completed";
  score?: number; // 0 - 100
  correctCount?: number;
  timeSpentSeconds?: number;
  questions: CBTQuestion[];
}

export interface StudentStats {
  totalExamsTaken: number;
  averageScorePercentage: number;
  totalStudyHours: number;
  totalQuestionsAnswered: number;
  masteryLevel: "Novice" | "Proficient" | "Master";
  recentExams: Array<{
    id: string;
    title: string;
    subject: string;
    date: string;
    score: number;
    totalQuestions: number;
    durationMinutes: number;
  }>;
  subjectPerformance: Array<{
    subject: string;
    accuracy: number;
    examsCount: number;
    color: string;
  }>;
  scoreProgression: Array<{
    examLabel: string;
    score: number;
  }>;
  weakTopics: Array<{
    topic: string;
    subject: string;
    accuracy: number;
  }>;
}

export const MOCK_SUBJECTS: SubjectItem[] = [
  {
    id: "sub-1",
    code: "ENG-101",
    name: "Use of English",
    category: "General",
    description: "Comprehension passages, lexis and structure, oral English, and grammatical registers.",
    materialCount: 14,
    questionCount: 380,
    color: "#6366f1",
  },
  {
    id: "sub-2",
    code: "MTH-102",
    name: "General Mathematics",
    category: "Sciences",
    description: "Algebra, calculus, geometry, trigonometry, probability, and statistics.",
    materialCount: 19,
    questionCount: 520,
    color: "#0ea5e9",
  },
  {
    id: "sub-3",
    code: "PHY-103",
    name: "Physics",
    category: "Sciences",
    description: "Mechanics, thermal physics, waves, optics, electromagnetism, and atomic physics.",
    materialCount: 11,
    questionCount: 310,
    color: "#8b5cf6",
  },
  {
    id: "sub-4",
    code: "CHM-104",
    name: "Chemistry",
    category: "Sciences",
    description: "Physical, organic, and inorganic chemistry, stoichiometry, and reaction kinetics.",
    materialCount: 16,
    questionCount: 440,
    color: "#10b981",
  },
  {
    id: "sub-5",
    code: "ECN-105",
    name: "Economics",
    category: "Commercial",
    description: "Microeconomics, macroeconomic policies, financial institutions, and public finance.",
    materialCount: 9,
    questionCount: 260,
    color: "#f59e0b",
  },
];

export const MOCK_MATERIALS: MaterialItem[] = [
  {
    id: "mat-1",
    title: "JAMB Use of English Syllabus & Lexis Handbook",
    filename: "jamb_english_lexis_2026.pdf",
    subjectId: "sub-1",
    subjectName: "Use of English",
    fileSizeFormatted: "4.8 MB",
    pageCount: 68,
    status: "ready",
    uploadedAt: "2026-10-24",
    keyTopics: ["Sentence Structure", "Idiomatic Expressions", "Antonyms & Synonyms", "Vowel Sounds"],
    summary: "Comprehensive guide addressing standard exam conventions, register vocabulary, and clause syntax.",
    generatedQuestionsCount: 94,
    difficultyBreakdown: { easy: 30, medium: 45, hard: 19 },
  },
  {
    id: "mat-2",
    title: "Calculus & Vector Analysis Companion",
    filename: "calculus_vector_notes.pdf",
    subjectId: "sub-2",
    subjectName: "General Mathematics",
    fileSizeFormatted: "8.2 MB",
    pageCount: 112,
    status: "ready",
    uploadedAt: "2026-10-26",
    keyTopics: ["Differentiation", "Definite Integrals", "Vector Coordinates", "Rates of Change"],
    summary: "Worked examples and problem sets covering rate calculation, tangent equations, and dot products.",
    generatedQuestionsCount: 120,
    difficultyBreakdown: { easy: 25, medium: 60, hard: 35 },
  },
  {
    id: "mat-3",
    title: "Modern Wave Theory & Quantum Optics",
    filename: "optics_and_quantum_physics.docx",
    subjectId: "sub-3",
    subjectName: "Physics",
    fileSizeFormatted: "3.1 MB",
    pageCount: 45,
    status: "ready",
    uploadedAt: "2026-10-28",
    keyTopics: ["Electromagnetic Spectrum", "Photoelectric Effect", "Refraction", "Diffraction Grating"],
    summary: "Lecture slides and summaries focusing on Planck's equation and wave interference phenomena.",
    generatedQuestionsCount: 65,
    difficultyBreakdown: { easy: 20, medium: 30, hard: 15 },
  },
  {
    id: "mat-4",
    title: "Organic Reaction Mechanisms & Functional Groups",
    filename: "organic_chemistry_handout.pdf",
    subjectId: "sub-4",
    subjectName: "Chemistry",
    fileSizeFormatted: "6.4 MB",
    pageCount: 84,
    status: "processing",
    uploadedAt: "2026-10-29",
    keyTopics: ["Esterification", "Polymerization", "Aromatic Hydrocarbons", "Alkanols"],
    summary: "Extracting reaction equations and isomer identification rules.",
    generatedQuestionsCount: 0,
    difficultyBreakdown: { easy: 0, medium: 0, hard: 0 },
  },
];

export const MOCK_STUDENT_STATS: StudentStats = {
  totalExamsTaken: 18,
  averageScorePercentage: 74,
  totalStudyHours: 32.5,
  totalQuestionsAnswered: 450,
  masteryLevel: "Proficient",
  recentExams: [
    {
      id: "exam-101",
      title: "Use of English Mastery Test #3",
      subject: "Use of English",
      date: "2026-10-28",
      score: 82,
      totalQuestions: 20,
      durationMinutes: 30,
    },
    {
      id: "exam-102",
      title: "Calculus & Geometry Sprint",
      subject: "General Mathematics",
      date: "2026-10-27",
      score: 68,
      totalQuestions: 20,
      durationMinutes: 40,
    },
    {
      id: "exam-103",
      title: "Physics Mechanics & Waves Diagnostic",
      subject: "Physics",
      date: "2026-10-25",
      score: 75,
      totalQuestions: 20,
      durationMinutes: 35,
    },
    {
      id: "exam-104",
      title: "Chemistry Stoichiometry Drill",
      subject: "Chemistry",
      date: "2026-10-23",
      score: 80,
      totalQuestions: 15,
      durationMinutes: 25,
    },
  ],
  subjectPerformance: [
    { subject: "Use of English", accuracy: 82, examsCount: 6, color: "#6366f1" },
    { subject: "General Mathematics", accuracy: 68, examsCount: 5, color: "#0ea5e9" },
    { subject: "Physics", accuracy: 75, examsCount: 4, color: "#8b5cf6" },
    { subject: "Chemistry", accuracy: 80, examsCount: 3, color: "#10b981" },
  ],
  scoreProgression: [
    { examLabel: "Ex 1", score: 58 },
    { examLabel: "Ex 2", score: 62 },
    { examLabel: "Ex 3", score: 65 },
    { examLabel: "Ex 4", score: 71 },
    { examLabel: "Ex 5", score: 68 },
    { examLabel: "Ex 6", score: 78 },
    { examLabel: "Ex 7", score: 74 },
    { examLabel: "Ex 8", score: 82 },
  ],
  weakTopics: [
    { topic: "Vector Cross Products", subject: "General Mathematics", accuracy: 44 },
    { topic: "Direct and Indirect Speech Registers", subject: "Use of English", accuracy: 52 },
    { topic: "Doppler Effect Equations", subject: "Physics", accuracy: 55 },
  ],
};

export const MOCK_EXAM_SESSION: ExamSessionFixture = {
  id: "session-live-sample",
  title: "General Mathematics & Physics Combined Mock Exam",
  subject: "General Mathematics",
  totalQuestions: 5,
  timeLimitMinutes: 15,
  mode: "strict",
  startedAt: "2026-10-29T10:00:00Z",
  status: "active",
  questions: [
    {
      id: "q-1",
      number: 1,
      subject: "General Mathematics",
      topic: "Calculus",
      question: "If f(x) = 3x³ - 5x² + 7x - 4, what is the value of the second derivative f''(2)?",
      options: [
        { id: "opt-a", text: "26" },
        { id: "opt-b", text: "28" },
        { id: "opt-c", text: "32" },
        { id: "opt-d", text: "36" },
      ],
      correctOptionId: "opt-a",
      explanation: "First derivative f'(x) = 9x² - 10x + 7. Second derivative f''(x) = 18x - 10. Substituting x = 2: 18(2) - 10 = 36 - 10 = 26.",
      difficulty: "medium",
      sourcePage: 42,
    },
    {
      id: "q-2",
      number: 2,
      subject: "Physics",
      topic: "Optics",
      question: "A ray of light enters a glass prism with a refractive index of 1.50 from air. What is the critical angle for total internal reflection at the glass-air boundary?",
      options: [
        { id: "opt-a", text: "38.2°" },
        { id: "opt-b", text: "41.8°" },
        { id: "opt-c", text: "45.0°" },
        { id: "opt-d", text: "48.6°" },
      ],
      correctOptionId: "opt-b",
      explanation: "Using Snell's critical angle formula sin(c) = 1/n = 1/1.50 = 0.6667. arcsin(0.6667) ≈ 41.8°.",
      difficulty: "easy",
      sourcePage: 19,
    },
    {
      id: "q-3",
      number: 3,
      subject: "General Mathematics",
      topic: "Matrices & Determinants",
      question: "Find the determinant of the 2x2 matrix A = [[4, 7], [2, 5]].",
      options: [
        { id: "opt-a", text: "6" },
        { id: "opt-b", text: "-6" },
        { id: "opt-c", text: "14" },
        { id: "opt-d", text: "26" },
      ],
      correctOptionId: "opt-a",
      explanation: "det(A) = (4 * 5) - (7 * 2) = 20 - 14 = 6.",
      difficulty: "easy",
      sourcePage: 55,
    },
    {
      id: "q-4",
      number: 4,
      subject: "Physics",
      topic: "Electromagnetism",
      question: "A wire carrying a current of 5.0 A is placed perpendicularly in a uniform magnetic field of 0.40 T. If the active length of the wire is 0.80 m, what is the magnetic force exerted on it?",
      options: [
        { id: "opt-a", text: "1.2 N" },
        { id: "opt-b", text: "1.6 N" },
        { id: "opt-c", text: "2.0 N" },
        { id: "opt-d", text: "3.2 N" },
      ],
      correctOptionId: "opt-b",
      explanation: "F = B * I * L * sin(θ). For perpendicular orientation (θ = 90°), sin(90°) = 1. F = 0.40 T * 5.0 A * 0.80 m = 1.6 N.",
      difficulty: "medium",
      sourcePage: 78,
    },
    {
      id: "q-5",
      number: 5,
      subject: "General Mathematics",
      topic: "Probability",
      question: "Two fair six-sided dice are rolled simultaneously. What is the probability that the sum of the numbers is at least 10?",
      options: [
        { id: "opt-a", text: "1/6" },
        { id: "opt-b", text: "1/12" },
        { id: "opt-c", text: "5/36" },
        { id: "opt-d", text: "1/4" },
      ],
      correctOptionId: "opt-a",
      explanation: "Total outcomes = 36. Outcomes with sum >= 10: (4,6), (5,5), (5,6), (6,4), (6,5), (6,6) = 6 outcomes. Probability = 6/36 = 1/6.",
      difficulty: "medium",
      sourcePage: 94,
    },
  ],
};
