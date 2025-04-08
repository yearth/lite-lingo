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

    const cleanupMessageHandler = setupMessageHandler(translationResult);

    const cleanupSelectionListener = setupSelectionListener(
      selectionBubble,
      translationResult,
      handleTranslate,
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
