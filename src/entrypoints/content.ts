import "@/assets/globals.css";
import {
  handleSpeech,
  handleTranslate,
} from "../content-modules/bubble-actions";
import { setupClickListener } from "../content-modules/click-listener";
import { setupMessageHandler } from "../content-modules/message-handler";
import { setupSelectionListener } from "../content-modules/selection-listener";
import { initUiManagers } from "../content-modules/ui-managers";

export default defineContentScript({
  matches: [
    "*://*.com/*",
    "*://*.org/*",
    "*://*.net/*",
    "*://*.edu/*",
    "*://*.gov/*",
    "*://*.io/*",
  ],
  main() {
    console.log("[Lite Lingo] Content script loaded", {
      timestamp: new Date().toISOString(),
    });

    const { selectionBubble, translationResult, cleanupUiManagers } =
      initUiManagers();

    const { cleanup: cleanupMessageHandler, reset: resetMessageHandler } =
      setupMessageHandler(translationResult);

    const enhancedHandleTranslate = (
      text: string,
      context: string,
      translationResultMgr: typeof translationResult,
      selectionBubbleMgr: typeof selectionBubble,
      selectionRange: Range
    ) => {
      console.log("[Lite Lingo] Resetting message handler before translation");
      resetMessageHandler();
      handleTranslate(
        text,
        context,
        translationResultMgr,
        selectionBubbleMgr,
        selectionRange
      );
    };

    const cleanupSelectionListener = setupSelectionListener(
      selectionBubble,
      translationResult,
      enhancedHandleTranslate,
      handleSpeech
    );

    const cleanupClickListener = setupClickListener(
      selectionBubble,
      translationResult
    );

    return () => {
      console.log(
        "[Lite Lingo] Running combined cleanup for content script..."
      );
      cleanupUiManagers();
      cleanupMessageHandler();
      cleanupSelectionListener();
      cleanupClickListener();
      console.log("[Lite Lingo] Combined cleanup finished.");
    };
  },
});
