import { useFleet } from "../store";
import { AlertIcon, CheckIcon, CloudIcon, LoaderIcon } from "./icons";

/**
 * Small header badge showing the cloud sync state. Hidden in local mode
 * (no Supabase backend) since there is nothing to sync.
 */
export function SyncIndicator() {
  const { syncStatus } = useFleet();

  if (syncStatus === "local") return null;

  const config = {
    loading: { text: "Loading…", spin: true, cls: "text-maroon-100" },
    saving: { text: "Saving…", spin: true, cls: "text-maroon-100" },
    saved: { text: "Synced", spin: false, cls: "text-emerald-200" },
    error: { text: "Sync error", spin: false, cls: "text-amber-200" },
  }[syncStatus];

  return (
    <span
      className={`hidden items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1.5 text-xs font-semibold sm:inline-flex ${config.cls}`}
      title={
        syncStatus === "error"
          ? "Could not reach the cloud database. Your latest change may not be saved."
          : "Shared cloud data"
      }
    >
      {syncStatus === "saved" ? (
        <CloudIcon className="h-3.5 w-3.5" />
      ) : syncStatus === "error" ? (
        <AlertIcon className="h-3.5 w-3.5" />
      ) : syncStatus === "loading" || syncStatus === "saving" ? (
        <LoaderIcon className={`h-3.5 w-3.5 ${config.spin ? "animate-spin" : ""}`} />
      ) : (
        <CheckIcon className="h-3.5 w-3.5" />
      )}
      {config.text}
    </span>
  );
}
