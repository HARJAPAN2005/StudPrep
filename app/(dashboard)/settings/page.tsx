"use client";

import * as React from "react";
import { User, Bell, Sliders, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

type FontSize = "normal" | "large" | "extra-large";

export default function SettingsPage() {
  const [savedSuccess, setSavedSuccess] = React.useState(false);
  const [fullName, setFullName] = React.useState("Amaka Okafor");
  const [fontSize, setFontSize] = React.useState<FontSize>("normal");
  const [timerAlertMins, setTimerAlertMins] = React.useState(5);
  const [autoAdvance, setAutoAdvance] = React.useState(true);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 4000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in-50 duration-300">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="border-b border-border pb-6">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Platform & Examination Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Customize your CBT runner experience, notifications, and candidate profile.
        </p>
      </div>

      {savedSuccess && (
        <div
          role="status"
          className="flex items-center gap-2 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-sm font-medium animate-in fade-in-50"
        >
          <CheckCircle2 className="h-4 w-4" />
          <span>Preferences updated successfully! Settings are synced for your next session.</span>
        </div>
      )}

      {/* ── Tabbed Settings ─────────────────────────────────────────────────── */}
      <Tabs defaultValue="cbt-runner" className="space-y-6">
        <TabsList className="grid grid-cols-3 max-w-md">
          <TabsTrigger value="cbt-runner" className="gap-2 text-xs">
            <Sliders className="h-3.5 w-3.5" /> CBT Runner
          </TabsTrigger>
          <TabsTrigger value="profile" className="gap-2 text-xs">
            <User className="h-3.5 w-3.5" /> Profile
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2 text-xs">
            <Bell className="h-3.5 w-3.5" /> Alerts
          </TabsTrigger>
        </TabsList>

        {/* ── CBT Runner Preferences ────────────────────────────────────────── */}
        <TabsContent value="cbt-runner" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">CBT Runner Interface & Pacing</CardTitle>
              <CardDescription>
                Configure how the distraction-free exam runner displays timers and transitions between questions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSave} className="space-y-6">
                {/* Font Scaling */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-foreground">Question Text Size</Label>
                  <p className="text-xs text-muted-foreground">Choose a comfortable font size for examination reading.</p>
                  <div className="grid grid-cols-3 gap-3 max-w-sm pt-1">
                    {[
                      { id: "normal" as const, label: "Standard (16px)" },
                      { id: "large" as const, label: "Comfort (18px)" },
                      { id: "extra-large" as const, label: "Large (20px)" },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setFontSize(opt.id)}
                        className={`py-2 px-3 rounded-lg border text-xs font-semibold transition-all ${
                          fontSize === opt.id
                            ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/20"
                            : "border-border hover:bg-muted text-muted-foreground"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Timer Alert Warning */}
                <div className="space-y-2 pt-2">
                  <Label className="text-sm font-semibold text-foreground">Timer Urgency Alert</Label>
                  <p className="text-xs text-muted-foreground">
                    Display flashing amber warning banner when time remaining drops below threshold.
                  </p>
                  <div className="flex items-center gap-4 max-w-xs pt-1">
                    <Input
                      type="number"
                      min={1}
                      max={15}
                      value={timerAlertMins}
                      onChange={(e) => setTimerAlertMins(Number(e.target.value))}
                      className="w-24 font-mono text-center"
                    />
                    <span className="text-xs text-muted-foreground">minutes before expiration</span>
                  </div>
                </div>

                {/* Auto-Advance */}
                <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-card">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-semibold text-foreground">Auto-Advance on Selection</Label>
                    <p className="text-xs text-muted-foreground">
                      Automatically navigate to the next question when an option is selected.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoAdvance}
                    onChange={(e) => setAutoAdvance(e.target.checked)}
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary accent-primary cursor-pointer"
                  />
                </div>

                <Button type="submit">Save Runner Settings</Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Profile Preferences ───────────────────────────────────────────── */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Candidate Credentials</CardTitle>
              <CardDescription>Your registered student identification on the platform.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSave} className="space-y-5 max-w-md">
                <div className="space-y-1.5">
                  <Label htmlFor="full_name">Candidate Name</Label>
                  <Input
                    id="full_name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="email">Registered Email</Label>
                  <Input
                    id="email"
                    value="amaka@exam.ng"
                    disabled
                    readOnly
                    className="opacity-70 cursor-not-allowed"
                  />
                  <p className="text-xs text-muted-foreground">Managed via Supabase Auth</p>
                </div>

                <Button type="submit">Update Profile</Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Notification Preferences ──────────────────────────────────────── */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Notifications & Study Reminders</CardTitle>
              <CardDescription>Configure practice alerts and weekly diagnostic summaries.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { title: "Weekly Progress Summary", desc: "Receive email breakdown of score trends and weak topic areas." },
                  { title: "Material Ready Notification", desc: "Alert when uploaded textbooks or notes finish AI indexing." },
                  { title: "Practice Cadence Reminders", desc: "Daily reminders to maintain your 25-minute practice streak." },
                ].map((notif, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3.5 rounded-xl border border-border">
                    <div className="space-y-0.5">
                      <p className="text-sm font-semibold text-foreground">{notif.title}</p>
                      <p className="text-xs text-muted-foreground">{notif.desc}</p>
                    </div>
                    <input
                      type="checkbox"
                      defaultChecked={idx !== 2}
                      className="h-4 w-4 rounded border-border text-primary focus:ring-primary accent-primary cursor-pointer"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
