import { errorMessage } from "@/lib/adminApi";

/** Runs a save against the API and reports the outcome to a tab's saved/error state. */
export async function runSave(
  save: () => Promise<void>,
  setSaved: (saved: boolean) => void,
  setError: (error: string | null) => void,
): Promise<void> {
  setError(null);
  try {
    await save();
    setSaved(true);
  } catch (e) {
    setSaved(false);
    setError(errorMessage(e));
  }
}
