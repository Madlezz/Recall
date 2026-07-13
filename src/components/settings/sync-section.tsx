import { Cloud, Copy, KeyRound, Link2, Loader2, RefreshCw, Shield, Unlink, X } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useRecallStore } from "@/stores/recall-store";
import { generateSyncCode, formatSyncCodeInput, isValidSyncCode } from "@/services/crypto";
import { performEncryptedSync, testSyncRelay, getDefaultRelayUrl, type SyncConfig } from "@/services/sync-protocol";

const DEFAULT_RELAY_URL = getDefaultRelayUrl();

export function SyncSection(): JSX.Element {
  const { t } = useTranslation();
  const settings = useRecallStore((state) => state.settings);
  const updateSettings = useRecallStore((state) => state.updateSettings);
  const decks = useRecallStore((state) => state.decks);
  const cards = useRecallStore((state) => state.cards);
  const reviewLogs = useRecallStore((state) => state.reviewLogs);
  const studySessions = useRecallStore((state) => state.studySessions);

  const [isSyncing, setIsSyncing] = useState(false);
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [codeInput, setCodeInput] = useState("");
  const [relayInput, setRelayInput] = useState("");

  const isPaired = !!settings.syncCode;
  const relayUrl = settings.syncRelayUrl || DEFAULT_RELAY_URL;

  async function handleGenerateCode(): Promise<void> {
    const { code } = generateSyncCode();
    await updateSettings({
      syncCode: code,
      syncEnabled: true,
    });
    toast.success(t("sync.codeGenerated"));
  }

  async function handleEnterCode(): Promise<void> {
    const formatted = formatSyncCodeInput(codeInput);
    if (!isValidSyncCode(formatted)) {
      toast.error(t("sync.invalidCode"));
      return;
    }

    // Test relay connectivity
    const testUrl = relayInput || DEFAULT_RELAY_URL;
    const relayOk = await testSyncRelay(testUrl);
    if (!relayOk) {
      toast.error(t("sync.relayUnreachable"));
      return;
    }

    await updateSettings({
      syncCode: formatted,
      syncRelayUrl: relayInput || null,
      syncEnabled: true,
    });

    toast.success(t("sync.devicePaired"));
    setShowCodeInput(false);
    setCodeInput("");
    setRelayInput("");
  }

  async function handleUnlink(): Promise<void> {
    await updateSettings({
      syncCode: null,
      syncRelayUrl: null,
      syncEnabled: false,
      syncLastAt: null,
    });
    toast.info(t("sync.deviceUnlinked"));
  }

  async function handleSyncNow(): Promise<void> {
    if (!settings.syncCode) return;
    setIsSyncing(true);

    try {
      const state = {
        decks,
        cards,
        reviewLogs,
        studySessions,
        settings,
      };

      const config: SyncConfig = {
        relayUrl,
        syncCode: settings.syncCode,
        enabled: true,
        lastSyncAt: settings.syncLastAt,
        autoSyncInterval: settings.syncAutoInterval,
      };

      const result = await performEncryptedSync(state, config);

      if (result.success) {
        await updateSettings({ syncLastAt: new Date().toISOString() });

        if (result.changes && (result.changes.decks > 0 || result.changes.cards > 0)) {
          toast.success(t("sync.syncCompleteWithChanges", {
            decks: result.changes.decks,
            cards: result.changes.cards,
          }));
        } else {
          toast.success(t("sync.syncComplete"));
        }
      } else {
        toast.error(result.error || t("sync.syncFailed"));
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("sync.syncFailed"));
    } finally {
      setIsSyncing(false);
    }
  }

  async function handleCopyCode(): Promise<void> {
    if (!settings.syncCode) return;
    try {
      await navigator.clipboard.writeText(settings.syncCode);
      toast.success(t("sync.codeCopied"));
    } catch {
      toast.error(t("sync.copyFailed"));
    }
  }

  return (
    <section>
      <h3 className="mb-4 text-sm font-bold text-text-primary dark:text-text-primary flex items-center gap-2">
        <Shield className="h-4 w-4" />
        {t("sync.encryptedSync")}
      </h3>

      <div className="rounded-lg border border-outline-variant bg-surface p-5 dark:border-outline-variant dark:bg-surface">
        {/* Description */}
        <p className="text-sm text-on-surface-variant dark:text-on-surface-variant mb-4">
          {t("sync.description")}
        </p>

        {/* Security badge */}
        <div className="mb-4 flex items-center gap-2 rounded-md bg-review-easy/10 px-3 py-2">
          <Shield className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
          <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
            {t("sync.e2eEncrypted")}
          </span>
        </div>

        {!isPaired ? (
          /* ── Not paired: show setup options ── */
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button onClick={handleGenerateCode} className="gap-2 min-h-[44px] flex-1">
                <KeyRound className="h-4 w-4" />
                {t("sync.generateCode")}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowCodeInput(!showCodeInput)}
                className="gap-2 min-h-[44px] flex-1"
              >
                <Link2 className="h-4 w-4" />
                {t("sync.enterCode")}
              </Button>
            </div>

            {showCodeInput && (
              <div className="space-y-3 rounded-md border border-outline-variant p-4 dark:border-outline-variant">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-on-surface-variant">
                    {t("sync.syncCode")}
                  </label>
                  <input
                    type="text"
                    value={codeInput}
                    onChange={(e) => setCodeInput(formatSyncCodeInput(e.target.value))}
                    placeholder="XXXXX-XXXXX-XXXXX-XXXXX-XXXXX-XXXXX-XXXXX-XXXXX-XXXXX-XXXXX"
                    className="w-full rounded-md border border-outline-variant bg-surface px-3 py-2 text-sm font-mono tracking-wider dark:border-outline dark:bg-surface-container"
                    maxLength={59}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-on-surface-variant">
                    {t("sync.relayUrl")} <span className="text-on-surface-variant">({t("sync.optional")})</span>
                  </label>
                  <input
                    type="url"
                    value={relayInput}
                    onChange={(e) => setRelayInput(e.target.value)}
                    placeholder={DEFAULT_RELAY_URL}
                    className="w-full rounded-md border border-outline-variant bg-surface px-3 py-2 text-sm dark:border-outline dark:bg-surface-container"
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => void handleEnterCode()} className="flex-1 min-h-[44px]">
                    {t("sync.pairDevice")}
                  </Button>
                  <Button variant="ghost" onClick={() => setShowCodeInput(false)} className="min-h-[44px]">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ── Paired: show sync status and controls ── */
          <div className="space-y-4">
            {/* Sync code display */}
            <div className="rounded-md border border-outline-variant p-4 dark:border-outline-variant">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-xs font-medium text-on-surface-variant">{t("sync.yourSyncCode")}</span>
                <button
                  onClick={() => void handleCopyCode()}
                  className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1"
                >
                  <Copy className="h-3 w-3" />
                  {t("sync.copy")}
                </button>
              </div>
              <code className="block text-sm font-mono tracking-wider text-text-primary dark:text-text-primary break-all">
                {settings.syncCode}
              </code>
              <p className="mt-2 text-xs text-on-surface-variant">{t("sync.shareCodeHint")}</p>
            </div>

            {/* Sync status */}
            <div className="flex items-center justify-between rounded-md bg-background dark:bg-surface-container/50 px-4 py-3">
              <div className="flex items-center gap-2">
                <Cloud className="h-4 w-4 text-on-surface-variant" />
                <span className="text-sm text-on-surface-variant dark:text-on-surface-variant">
                  {settings.syncLastAt
                    ? `${t("sync.lastSync")}: ${new Date(settings.syncLastAt).toLocaleString()}`
                    : t("sync.neverSynced")}
                </span>
              </div>
            </div>

            {/* Auto-sync toggle */}
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.syncAutoInterval > 0}
                onChange={(e) => void updateSettings({ syncAutoInterval: e.target.checked ? 15 : 0 })}
                className="rounded"
              />
              <span className="text-sm text-text-secondary dark:text-text-secondary">{t("sync.autoSyncEvery15min")}</span>
            </label>

            {/* Actions */}
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                onClick={() => void handleSyncNow()}
                disabled={isSyncing}
                className="gap-2 min-h-[44px] flex-1"
              >
                {isSyncing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                {isSyncing ? t("sync.syncing") : t("sync.syncNow")}
              </Button>
              <Button
                variant="outline"
                onClick={() => void handleUnlink()}
                className="gap-2 min-h-[44px]"
              >
                <Unlink className="h-4 w-4" />
                {t("sync.unlink")}
              </Button>
            </div>

            {/* Relay URL (advanced) */}
            <details className="text-xs text-on-surface-variant">
              <summary className="cursor-pointer hover:text-on-surface-variant dark:hover:text-text-secondary">
                {t("sync.advanced")}
              </summary>
              <p className="mt-2">
                {t("sync.relayUrl")}: <code className="text-on-surface-variant dark:text-on-surface-variant">{relayUrl}</code>
              </p>
            </details>
          </div>
        )}
      </div>
    </section>
  );
}
