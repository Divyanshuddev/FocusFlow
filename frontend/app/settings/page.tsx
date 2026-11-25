"use client";

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Bell, Lock, Moon, Save, Sliders, Sun, User as UserIcon } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth, useTheme, useToast } from "@/hooks";
import { extractApiError } from "@/lib/api";
import { userService } from "@/services/userService";

const profilePrefsSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(120),
  email: z.string().email("Enter a valid email address"),
  timezone: z.string().min(1, "Timezone is required").max(64),
  default_focus_minutes: z.coerce.number().min(5).max(180),
  default_short_break_minutes: z.coerce.number().min(1).max(60),
  default_long_break_minutes: z.coerce.number().min(5).max(90),
  daily_focus_goal_minutes: z.coerce.number().min(15).max(720),
  notifications_enabled: z.boolean(),
  theme_preference: z.enum(["dark", "light"]),
});

const passwordSchema = z
  .object({
    current_password: z.string().min(1, "Current password is required"),
    new_password: z.string().min(8, "New password must be at least 8 characters"),
    confirm_password: z.string().min(1, "Please confirm your new password"),
  })
  .refine((d) => d.new_password === d.confirm_password, {
    message: "New passwords do not match",
    path: ["confirm_password"],
  });

type ProfilePrefsValues = z.infer<typeof profilePrefsSchema>;
type PasswordValues = z.infer<typeof passwordSchema>;

const TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Berlin",
  "Asia/Kolkata",
  "Asia/Tokyo",
  "Australia/Sydney",
];

export default function SettingsPage() {
  const { user, updateLocalUser } = useAuth();
  const { setTheme } = useTheme();
  const toast = useToast();

  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    reset: resetProfile,
    watch: watchProfile,
    setValue: setProfileValue,
    formState: { errors: profileErrors, isSubmitting: profileSaving },
  } = useForm<ProfilePrefsValues>({
    resolver: zodResolver(profilePrefsSchema),
  });

  const {
    register: registerPw,
    handleSubmit: handlePwSubmit,
    reset: resetPw,
    formState: { errors: pwErrors, isSubmitting: pwSaving },
  } = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
  });

  useEffect(() => {
    if (user) {
      resetProfile({
        name: user.name,
        email: user.email,
        timezone: user.timezone || "UTC",
        default_focus_minutes: user.default_focus_minutes,
        default_short_break_minutes: user.default_short_break_minutes,
        default_long_break_minutes: user.default_long_break_minutes,
        daily_focus_goal_minutes: user.daily_focus_goal_minutes,
        notifications_enabled: user.notifications_enabled,
        theme_preference: user.theme_preference,
      });
    }
  }, [user, resetProfile]);

  const selectedTheme = watchProfile("theme_preference");
  const notificationsEnabled = watchProfile("notifications_enabled");

  const onSaveProfile = async (values: ProfilePrefsValues) => {
    try {
      const updated = await userService.updateProfile(values);
      updateLocalUser(updated);
      setTheme(updated.theme_preference);
      toast.success("Settings saved", "Your profile and timer preferences were updated.");
    } catch (err) {
      toast.error("Failed to save settings", extractApiError(err));
    }
  };

  const onChangePassword = async (values: PasswordValues) => {
    try {
      await userService.changePassword({
        current_password: values.current_password,
        new_password: values.new_password,
      });
      resetPw();
      toast.success("Password updated", "Your account password has been changed.");
    } catch (err) {
      toast.error("Could not change password", extractApiError(err));
    }
  };

  const requestBrowserNotifications = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      toast.info("Browser notifications are not supported in this browser.");
      return;
    }
    const result = await Notification.requestPermission();
    if (result === "granted") {
      setProfileValue("notifications_enabled", true);
      toast.success("Browser notifications enabled");
    } else {
      toast.info("Notification permission was not granted.");
    }
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Settings & Profile
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-[#8B8E96]">
            Configure your account details, Pomodoro defaults, daily goal, and interface theme.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <form
            onSubmit={handleProfileSubmit(onSaveProfile)}
            className="glass-card space-y-6 p-6 lg:col-span-2"
          >
            <div>
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                <UserIcon className="h-4 w-4 text-[#48BC2B]" />
                Account Profile
              </div>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-[#B5B8C0]">
                    Full Name
                  </label>
                  <input {...registerProfile("name")} className="input-field" />
                  {profileErrors.name && (
                    <p className="mt-1 text-xs text-[#FF5A26]">{profileErrors.name.message}</p>
                  )}
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-[#B5B8C0]">
                    Email Address
                  </label>
                  <input type="email" {...registerProfile("email")} className="input-field" />
                  {profileErrors.email && (
                    <p className="mt-1 text-xs text-[#FF5A26]">{profileErrors.email.message}</p>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-[#B5B8C0]">
                    Timezone
                  </label>
                  <select {...registerProfile("timezone")} className="input-field">
                    {TIMEZONES.map((tz) => (
                      <option key={tz} value={tz}>
                        {tz}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200/80 pt-5 dark:border-white/[0.08]">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                <Sliders className="h-4 w-4 text-[#48BC2B]" />
                Timer & Daily Goal Defaults
              </div>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-[#B5B8C0]">
                    Focus (min)
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={180}
                    {...registerProfile("default_focus_minutes")}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-[#B5B8C0]">
                    Short Break (min)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    {...registerProfile("default_short_break_minutes")}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-[#B5B8C0]">
                    Long Break (min)
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={90}
                    {...registerProfile("default_long_break_minutes")}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-[#B5B8C0]">
                    Daily Goal (min)
                  </label>
                  <input
                    type="number"
                    min={15}
                    max={720}
                    {...registerProfile("daily_focus_goal_minutes")}
                    className="input-field"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200/80 pt-5 dark:border-white/[0.08]">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    Appearance Theme
                  </p>
                  <p className="text-xs text-slate-500 dark:text-[#8B8E96]">
                    Matte obsidian dark mode by default, or crisp daylight mode.
                  </p>
                </div>

                <div className="inline-flex rounded-2xl border border-slate-200 p-1 dark:border-white/10 dark:bg-[#141414]">
                  <button
                    type="button"
                    onClick={() => {
                      setProfileValue("theme_preference", "dark");
                      setTheme("dark");
                    }}
                    className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                      selectedTheme === "dark"
                        ? "bg-gradient-to-b from-[#5CD13E] to-[#3B9E23] text-[#040F02]"
                        : "text-slate-500 hover:text-slate-900 dark:text-[#8B8E96] dark:hover:text-white"
                    }`}
                  >
                    <Moon className="h-3.5 w-3.5" />
                    Dark
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setProfileValue("theme_preference", "light");
                      setTheme("light");
                    }}
                    className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                      selectedTheme === "light"
                        ? "bg-gradient-to-b from-[#5CD13E] to-[#3B9E23] text-[#040F02]"
                        : "text-slate-500 hover:text-slate-900 dark:text-[#8B8E96] dark:hover:text-white"
                    }`}
                  >
                    <Sun className="h-3.5 w-3.5" />
                    Light
                  </button>
                </div>
              </div>

              <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-white/[0.07] dark:bg-[#141414] sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <Bell className="mt-0.5 h-4 w-4 text-[#48BC2B]" />
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">
                      Session Chimes & Notifications
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-[#8B8E96]">
                      Play a soft chime and show reminders when focus blocks complete.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={requestBrowserNotifications}
                    className="text-xs font-semibold text-[#3A9A22] hover:underline dark:text-[#5CD13E]"
                  >
                    Enable Browser Alerts
                  </button>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      checked={Boolean(notificationsEnabled)}
                      onChange={(e) =>
                        setProfileValue("notifications_enabled", e.target.checked)
                      }
                      className="sr-only peer"
                    />
                    <div className="h-6 w-11 rounded-full bg-slate-300 peer-checked:bg-[#48BC2B] dark:bg-[#242424] after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:after:translate-x-5" />
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button type="submit" disabled={profileSaving} className="btn-primary">
                <Save className="h-4 w-4" />
                {profileSaving ? "Saving..." : "Save Preferences"}
              </button>
            </div>
          </form>

          <form onSubmit={handlePwSubmit(onChangePassword)} className="glass-card h-fit space-y-4 p-6">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
              <Lock className="h-4 w-4 text-[#FC3803]" />
              Security & Password
            </div>
            <p className="text-xs text-slate-500 dark:text-[#8B8E96]">
              Update your account password periodically to keep your workspace secure.
            </p>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-[#B5B8C0]">
                Current Password
              </label>
              <input
                type="password"
                {...registerPw("current_password")}
                className="input-field"
              />
              {pwErrors.current_password && (
                <p className="mt-1 text-xs text-[#FF5A26]">{pwErrors.current_password.message}</p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-[#B5B8C0]">
                New Password
              </label>
              <input type="password" {...registerPw("new_password")} className="input-field" />
              {pwErrors.new_password && (
                <p className="mt-1 text-xs text-[#FF5A26]">{pwErrors.new_password.message}</p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-[#B5B8C0]">
                Confirm New Password
              </label>
              <input
                type="password"
                {...registerPw("confirm_password")}
                className="input-field"
              />
              {pwErrors.confirm_password && (
                <p className="mt-1 text-xs text-[#FF5A26]">{pwErrors.confirm_password.message}</p>
              )}
            </div>

            <button type="submit" disabled={pwSaving} className="btn-secondary w-full">
              {pwSaving ? "Updating..." : "Change Password"}
            </button>
          </form>
        </div>
      </div>
    </AppShell>
  );
}
