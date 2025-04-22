import type { ContentScriptContext } from "#imports";
import { SelectionPopup } from "@/entrypoints/content/components/selection-popup";
import { TranslationHandler } from "@/entrypoints/content/components/translation-handler";
import { TranslationPanel } from "@/entrypoints/content/components/translation-panel";
import { useSelectionStore } from "@/store/selection";
import { useTranslationStore } from "@/store/translation";
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
      root.render(
        <>
          <SelectionPopup />
          <TranslationPanel />
          <TranslationHandler />
        </>
      );

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

  // 先检查翻译面板是否处于打开状态
  const isTranslationPanelVisible = useTranslationStore.getState().isVisible;

  // 翻译面板打开时，不显示划词气泡
  if (isTranslationPanelVisible) {
    return;
  }

  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();

  // 只有当翻译面板关闭时，才显示划词气泡
  useSelectionStore.getState().setSelection(selection.toString(), {
    x: rect.left + window.scrollX,
    y: rect.top + window.scrollY,
  });
  useSelectionStore.getState().setVisibility(true);
}
