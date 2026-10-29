import type { Metadata } from "next";
import { RegisterForm } from "../register/register-form";

export const metadata: Metadata = {
  title: "Create Account · StudPilot",
  description: "Join StudPilot to accelerate your exam preparation with AI-powered CBT practice.",
};

export default function SignUpPage() {
  return (
    <>
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Create your StudPilot Account
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Free access to syllabus materials and timed examination simulations
        </p>
      </div>

      <RegisterForm />
    </>
  );
}
