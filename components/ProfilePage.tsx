"use client";

import { useCallback, useEffect, useState } from "react";
import { TopNav } from "@/components/TopNav";
import { captureClientException } from "@/lib/sentry";

interface ProfileData {
  displayName: string;
  billingMode: string;
  manualBalanceUsd: number | null;
  budgetLimitUsd: number | null;
  budgetAlertPercent: number;
}

interface UsageData {
  imagesGenerated: number;
  spendTodayUsd: number;
  spendWeekUsd: number;
  totalEstimatedUsd: number;
  remainingBudgetUsd: number | null;
}

export function ProfilePage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/profile/usage");
      const text = await res.text();
      if (!text) {
        setMessage("Profile API returned an empty response.");
        return;
      }

      const data = JSON.parse(text);
      if (res.ok) {
        setProfile(data.profile);
        setUsage(data.usage);
        setMessage(null);
      } else {
        setMessage(data.error ?? "Failed to load profile.");
      }
    } catch (err) {
      captureClientException(err, "ProfilePage.load");
      setMessage("Failed to load profile data.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      if (res.ok) {
        setMessage("Settings saved.");
        await load();
      } else {
        const data = await res.json();
        setMessage(data.error ?? "Failed to save.");
        captureClientException(new Error(data.error ?? "Failed to save profile."), "ProfilePage.handleSave");
      }
    } finally {
      setSaving(false);
    }
  };

  if (!profile || !usage) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white">
        <TopNav />
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-2 text-white/40">
          <p>{message ?? "Loading profile..."}</p>
          {message && (
            <button
              type="button"
              onClick={load}
              className="rounded-lg border border-white/10 px-4 py-2 text-xs text-white/70 hover:text-white"
            >
              Retry
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <TopNav />

      <main className="mx-auto max-w-2xl space-y-8 p-6">
        <div>
          <h1 className="text-xl font-semibold">Profile & Budget</h1>
          <p className="mt-1 text-sm text-white/40">
            Local tracking only — manage billing on BytePlus console.
          </p>
        </div>

        <section className="space-y-4 rounded-2xl border border-white/10 bg-neutral-950/80 p-6">
          <h2 className="text-sm font-medium text-white/70">Settings</h2>

          <label className="block space-y-1">
            <span className="text-xs text-white/40">Display name</span>
            <input
              type="text"
              value={profile.displayName}
              onChange={(e) => setProfile({ ...profile, displayName: e.target.value })}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-yellow-400/40"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-xs text-white/40">Billing mode</span>
            <select
              value={profile.billingMode}
              onChange={(e) => setProfile({ ...profile, billingMode: e.target.value })}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none"
            >
              <option value="prepaid" className="bg-neutral-900">Prepaid</option>
              <option value="postpaid" className="bg-neutral-900">Postpaid</option>
            </select>
          </label>

          <label className="block space-y-1">
            <span className="text-xs text-white/40">Manual balance (USD)</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={profile.manualBalanceUsd ?? ""}
              onChange={(e) =>
                setProfile({
                  ...profile,
                  manualBalanceUsd: e.target.value ? parseFloat(e.target.value) : null,
                })
              }
              placeholder="e.g. 10.00"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-yellow-400/40"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-xs text-white/40">Budget soft cap (USD)</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={profile.budgetLimitUsd ?? ""}
              onChange={(e) =>
                setProfile({
                  ...profile,
                  budgetLimitUsd: e.target.value ? parseFloat(e.target.value) : null,
                })
              }
              placeholder="Blocks generate when exceeded"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-yellow-400/40"
            />
          </label>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-xl bg-yellow-400 px-6 py-2.5 text-sm font-semibold text-black hover:bg-yellow-300 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save settings"}
          </button>
          {message && <p className="text-xs text-white/50">{message}</p>}
        </section>

        <section className="space-y-4 rounded-2xl border border-white/10 bg-neutral-950/80 p-6">
          <h2 className="text-sm font-medium text-white/70">Usage</h2>
          <div className="grid grid-cols-2 gap-4">
            <Stat label="Images generated" value={String(usage.imagesGenerated)} />
            <Stat label="Spend today" value={`$${usage.spendTodayUsd.toFixed(2)}`} />
            <Stat label="Spend this week" value={`$${usage.spendWeekUsd.toFixed(2)}`} />
            <Stat label="Total estimated" value={`$${usage.totalEstimatedUsd.toFixed(2)}`} />
            {usage.remainingBudgetUsd != null && (
              <Stat label="Remaining budget" value={`$${usage.remainingBudgetUsd.toFixed(2)}`} />
            )}
          </div>
        </section>

        <section className="space-y-3 rounded-2xl border border-white/10 bg-neutral-950/80 p-6">
          <h2 className="text-sm font-medium text-white/70">BytePlus Console</h2>
          <ul className="space-y-2 text-sm">
            <li>
              <a
                href="https://console.byteplus.com/modelark"
                target="_blank"
                rel="noopener noreferrer"
                className="text-yellow-400/80 hover:text-yellow-400"
              >
                ModelArk — model activation
              </a>
            </li>
            <li>
              <a
                href="https://console.byteplus.com/billing"
                target="_blank"
                rel="noopener noreferrer"
                className="text-yellow-400/80 hover:text-yellow-400"
              >
                Billing — top-up & prepaid/postpaid
              </a>
            </li>
            <li>
              <a
                href="https://docs.byteplus.com/en/docs/ModelArk/1159199"
                target="_blank"
                rel="noopener noreferrer"
                className="text-yellow-400/80 hover:text-yellow-400"
              >
                Usage monitoring docs
              </a>
            </li>
          </ul>
          <p className="text-xs text-white/30">
            Postpaid billing has up to ~1 hour delay. Set consumption warnings in the BytePlus console.
          </p>
        </section>
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/5 px-4 py-3">
      <p className="text-xs text-white/40">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}
