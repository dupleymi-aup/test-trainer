"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useLocale, useTranslations } from "next-intl";
import { logClientError } from "@/lib/logger";
import {
  Mail,
  Phone,
  Building,
  Users,
  Loader2,
  ShieldCheck,
  LogOut,
  Pencil,
  Check,
  X,
  KeyRound,
  Beaker,
  BarChart3,
  RefreshCw,
  Download,
  Upload,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { PasswordStrengthIndicator } from "@/components/password-strength-indicator";
import { StatisticsPanel } from "@/components/statistics-panel";
import { AchievementsPanel } from "@/components/achievements-panel";
import { loadAttemptHistory, exportAllProgress, importAllProgress, clearAllProgress } from "@/lib/storage";
import { apiFetch } from "@/lib/api-client";

const roleKeys: Record<string, string> = {
  student: "roleStudent",
  STUDENT: "roleStudent",
  teacher: "roleTeacher",
  TEACHER: "roleTeacher",
  admin: "roleAdmin",
  ADMIN: "roleAdmin",
};

function getProfileSchema(t: (key: string) => string) {
  return z.object({
    name: z.string().min(2, t("nameMinLength")).optional(),
    phone: z
      .string()
      .min(10, t("phoneMinLength"))
      .optional()
      .or(z.literal("")),
    bio: z.string().optional(),
    university: z.string().optional(),
    group: z.string().optional(),
  });
}

function getPasswordSchema(t: (key: string) => string) {
  return z
    .object({
      currentPassword: z.string().min(1, t("requiredField")),
      newPassword: z.string().min(8, t("passwordMinLength")),
      confirmPassword: z.string(),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      message: t("passwordsMismatch"),
      path: ["confirmPassword"],
    });
}

type ProfileForm = z.infer<ReturnType<typeof getProfileSchema>>;
type PasswordForm = z.infer<ReturnType<typeof getPasswordSchema>>;

interface UserProfile {
  id: string;
  name: string | null;
  email: string | null;
  emailVerified: string | null;
  phone: string | null;
  role: string;
  avatar: string | null;
  bio: string | null;
  university: string | null;
  group: string | null;
  createdAt: string;
}

export default function ProfilePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 dark:from-zinc-950 dark:via-zinc-900 dark:to-emerald-950/20">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600 dark:text-emerald-400" />
      </div>
    }>
      <ProfileContent />
    </Suspense>
  );
}

function ProfileContent() {
  const { status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useLocale();
  const t = useTranslations("profile");
  const initialTab = searchParams.get("tab") || "profile";
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [newPasswordValue, setNewPasswordValue] = useState("");
  const [verifyCooldown, setVerifyCooldown] = useState(0);
  const [isSendingVerification, setIsSendingVerification] = useState(false);
  const [activeTab, setActiveTab] = useState(initialTab);

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(getProfileSchema(t)),
    defaultValues: {
      name: "",
      phone: "",
      bio: "",
      university: "",
      group: "",
    },
  });

  const passwordForm = useForm<PasswordForm>({
    resolver: zodResolver(getPasswordSchema(t)),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (status === "authenticated") {
      (async () => {
        try {
          const res = await apiFetch("/api/auth/profile");
          const json = await res.json();
          if (res.ok) {
            setProfile(json.user);
            profileForm.reset({
              name: json.user.name || "",
              phone: json.user.phone || "",
              bio: json.user.bio || "",
              university: json.user.university || "",
              group: json.user.group || "",
            });
          } else {
            toast.error(json.error || t("profileLoadError"));
          }
        } catch (e) {
          logClientError("Failed to load profile", e);
          toast.error(t("profileLoadError"));
        } finally {
          setLoading(false);
        }
      })();
    }
  }, [status, router, profileForm, t]);

  const onProfileSubmit = async (data: ProfileForm) => {
    setSaving(true);
    try {
      const res = await apiFetch("/api/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const json = await res.json();
      if (res.ok) {
        setProfile(json.user);
        setEditing(false);
        toast.success(t("profileUpdated"));
      } else {
        toast.error(json.error || t("profileUpdateError"));
      }
    } catch (e) {
      logClientError("Failed to update profile", e);
      toast.error(t("profileUpdateError"));
    } finally {
      setSaving(false);
    }
  };

  const onPasswordSubmit = async (data: PasswordForm) => {
    setIsSavingPassword(true);
    try {
      const res = await apiFetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
        }),
      });

      const json = await res.json();
      if (res.ok) {
        toast.success(t("passwordChanged"));
        passwordForm.reset();
        setNewPasswordValue("");
      } else {
        toast.error(json.error || t("passwordChangeError"));
      }
    } catch (e) {
      logClientError("Failed to change password", e);
      toast.error(t("passwordChangeError"));
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleLogout = async () => {
    await signOut({ redirect: true, callbackUrl: "/" });
  };

  useEffect(() => {
    if (verifyCooldown <= 0) return;
    const timer = setTimeout(() => setVerifyCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [verifyCooldown]);

  const handleResendVerification = useCallback(async () => {
    if (verifyCooldown > 0) return;
    setIsSendingVerification(true);
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
      });
      const json = await res.json();
      if (res.ok) {
        toast.success(t("verificationEmailSent"));
        setVerifyCooldown(60);
      } else {
        toast.error(json.error || t("sendEmailError"));
      }
    } catch (e) {
      logClientError("Failed to resend verification email", e);
      toast.error(t("sendEmailError"));
    } finally {
      setIsSendingVerification(false);
    }
  }, [verifyCooldown, t]);

  const handleExportProgress = useCallback(() => {
    const json = exportAllProgress();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `test-trainer-progress-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t("progressExported"));
  }, [t]);

  const handleImportProgress = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const content = ev.target?.result;
        if (typeof content === "string" && importAllProgress(content)) {
          toast.success(t("progressImported"));
          // Refresh the page to show updated stats
          window.location.reload();
        } else {
          toast.error(t("importError"));
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, [t]);

  const handleResetProgress = useCallback(() => {
    clearAllProgress();
    toast.success(t("progressReset"));
    window.location.reload();
  }, [t]);

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 dark:from-zinc-950 dark:via-zinc-900 dark:to-emerald-950/20">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600 dark:text-emerald-400" />
      </div>
    );
  }

  if (!profile) return null;

  const initials = profile.name
    ? profile.name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 dark:from-zinc-950 dark:via-zinc-900 dark:to-emerald-950/20">
      {/* Header */}
      <header className="border-b bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-4 sm:py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/30">
                <Beaker className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                  {t("title")}
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {t("subtitle")}
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              {t("logout")}
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid gap-8 md:grid-cols-3">
          {/* Sidebar */}
          <div className="md:col-span-1">
            <Card>
              <CardHeader className="text-center">
                <div className="flex justify-center">
                  <Avatar className="h-24 w-24">
                    <AvatarFallback className="text-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <CardTitle className="mt-4">{profile.name || t("user")}</CardTitle>
                <CardDescription className="break-all">{profile.email}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <span className="truncate">{profile.email || t("notSet")}</span>
                    {profile.emailVerified ? (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        {t("verified")}
                      </Badge>
                    ) : (
                      <div className="mt-1">
                        <Badge variant="destructive" className="text-[10px] mb-1">
                          {t("notVerified")}
                        </Badge>
                        {verifyCooldown > 0 ? (
                          <p className="text-[11px] text-muted-foreground">
                            {t("resendIn", { countdown: verifyCooldown })}
                          </p>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto p-0 text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300"
                            onClick={handleResendVerification}
                            disabled={isSendingVerification}
                          >
                            {isSendingVerification ? (
                              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                            ) : (
                              <RefreshCw className="mr-1 h-3 w-3" />
                            )}
                            {t("verifyEmail")}
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>{profile.phone || t("notSet")}</span>
                </div>
                {profile.university && (
                  <div className="flex items-center gap-2 text-sm">
                    <Building className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span>{profile.university}</span>
                  </div>
                )}
                {profile.group && (
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span>{profile.group}</span>
                  </div>
                )}
                <Separator />
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ShieldCheck className="h-4 w-4" />
                  <span>{roleKeys[profile.role] ? t(roleKeys[profile.role]) : profile.role}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {t("accountCreated", { date: new Date(profile.createdAt).toLocaleDateString(locale) })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="md:col-span-2">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="profile">{t("tabProfile")}</TabsTrigger>
                <TabsTrigger value="security">{t("tabSecurity")}</TabsTrigger>
                <TabsTrigger value="stats">
                  <BarChart3 className="mr-1 h-3.5 w-3.5" />
                  {t("tabStats")}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="profile" className="mt-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>{t("editProfileTitle")}</CardTitle>
                        <CardDescription>
                          {t("editProfileSubtitle")}
                        </CardDescription>
                      </div>
                      {!editing && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditing(true)}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          {t("edit")}
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Form {...profileForm}>
                      <form
                        onSubmit={profileForm.handleSubmit(onProfileSubmit)}
                        className="space-y-4"
                      >
                        <FormField
                          control={profileForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t("name")}</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  disabled={!editing}
                                  placeholder="John Doe"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={profileForm.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t("phone")}</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  disabled={!editing}
                                  placeholder="+79991234567"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={profileForm.control}
                          name="bio"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t("bio")}</FormLabel>
                              <FormControl>
                                <Textarea
                                  {...field}
                                  disabled={!editing}
                                  placeholder="Tell us about yourself..."
                                  rows={3}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={profileForm.control}
                            name="university"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{t("university")}</FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    disabled={!editing}
                                    placeholder="University"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={profileForm.control}
                            name="group"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{t("group")}</FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    disabled={!editing}
                                    placeholder="IT-101"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        {editing && (
                          <div className="flex gap-2">
                            <Button type="submit" disabled={saving}>
                              {saving && (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              )}
                              <Check className="mr-2 h-4 w-4" />
                              {t("save")}
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                setEditing(false);
                                profileForm.reset({
                                  name: profile.name || "",
                                  phone: profile.phone || "",
                                  bio: profile.bio || "",
                                  university: profile.university || "",
                                  group: profile.group || "",
                                });
                              }}
                            >
                              <X className="mr-2 h-4 w-4" />
                              {t("cancel")}
                            </Button>
                          </div>
                        )}
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="security" className="mt-6">
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>{t("changePasswordTitle")}</CardTitle>
                      <CardDescription>
                        {t("changePasswordSubtitle")}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Form {...passwordForm}>
                        <form
                          onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}
                          className="space-y-4"
                        >
                          <FormField
                            control={passwordForm.control}
                            name="currentPassword"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{t("currentPassword")}</FormLabel>
                                <FormControl>
                                  <PasswordInput {...field} placeholder="••••••••" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={passwordForm.control}
                            name="newPassword"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{t("newPassword")}</FormLabel>
                                <FormControl>
                                  <PasswordInput
                                    {...field}
                                    placeholder="••••••••"
                                    onChange={(e) => {
                                      field.onChange(e);
                                      setNewPasswordValue(e.target.value);
                                    }}
                                  />
                                </FormControl>
                                <FormMessage />
                                <PasswordStrengthIndicator password={newPasswordValue} />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={passwordForm.control}
                            name="confirmPassword"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{t("confirmPassword")}</FormLabel>
                                <FormControl>
                                  <PasswordInput {...field} placeholder="••••••••" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <Button type="submit" disabled={isSavingPassword}>
                            {isSavingPassword && (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            <KeyRound className="mr-2 h-4 w-4" />
                            {t("changePassword")}
                          </Button>
                        </form>
                      </Form>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="stats" className="mt-6">
                <div className="space-y-6">
                  {/* Data Management */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">{t("dataManagement")}</CardTitle>
                      <CardDescription>
                        {t("dataManagementSubtitle")}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <Button variant="outline" onClick={handleExportProgress} className="flex items-center gap-2">
                          <Download className="h-4 w-4" />
                          {t("export")}
                        </Button>
                        <Button variant="outline" onClick={handleImportProgress} className="flex items-center gap-2">
                          <Upload className="h-4 w-4" />
                          {t("import")}
                        </Button>
                        <Button variant="destructive" onClick={handleResetProgress} className="flex items-center gap-2">
                          <Trash2 className="h-4 w-4" />
                          {t("reset")}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <StatisticsPanel attempts={loadAttemptHistory()} />
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">{t("achievements")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <AchievementsPanel />
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
    </div>
  );
}
