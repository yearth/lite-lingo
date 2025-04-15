import type { ContentScriptContext } from "#imports";
import { SelectionPopup } from "@/entrypoints/content/components/selection-popup";
import { useSelectionStore } from "@/store/selection";
import { createRoot } from "react-dom/client";
import "~/assets/globals.css";

export default defineContentScript({
  matches: ["*://*/*"],
  cssInjectionMode: "ui",

  async main(ctx) {
    const ui = await createUi(ctx);
    ui.mount();
  },
});

function createUi(ctx: ContentScriptContext) {
  return createShadowRootUi(ctx, {
    name: "selection-popup",
    position: "inline",
    anchor: "body",
    append: "first",
    onMount: (uiContainer) => {
      console.log("[ Lite Lingo ] onMount, uiContainer", uiContainer);
      // 创建React根节点
      const root = createRoot(uiContainer);
      root.render(<SelectionPopup />);

      // 监听文本选择
      document.addEventListener("mouseup", handleSelection);
    },
  });
}

function handleSelection() {
  console.log("[ Lite Lingo ] handleSelection");
  const selection = window.getSelection();
  console.log("[ Lite Lingo ] selection", selection);
  if (!selection || selection.isCollapsed) return;

  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();

  useSelectionStore.getState().setSelection(selection.toString(), {
    x: rect.left + window.scrollX,
    y: rect.top + window.scrollY,
  });
  useSelectionStore.getState().setVisibility(true);
}
