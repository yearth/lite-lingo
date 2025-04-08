import { useCallback, useState } from "react";

/**
 * Custom hook to handle copying text to the clipboard.
 * @param timeout Duration in milliseconds to show the copied state (default: 2000ms).
 * @returns An object containing:
 *          - `copy`: Function to trigger the copy operation. Takes the text to copy as an argument.
 *          - `copied`: Boolean state indicating if the text was recently copied.
 */
export function useCopyToClipboard(timeout: number = 2000): {
  copy: (text: string) => Promise<void>;
  copied: boolean;
} {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(
    async (text: string) => {
      if (!navigator?.clipboard) {
        console.warn("Clipboard not supported");
        return;
      }

      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        // Reset copied state after timeout
        const timer = setTimeout(() => setCopied(false), timeout);
        // Optional: Cleanup timer if component unmounts or copy is called again
        // This might require returning a cleanup function from the hook or managing timers differently.
        // For simplicity, we'll rely on the timeout for now.
      } catch (error) {
        console.warn("Copy failed", error);
        setCopied(false); // Ensure copied is false on error
      }
    },
    [timeout] // Dependency array includes timeout in case it changes
  );

  return { copy, copied };
}
