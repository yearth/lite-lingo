import { InlineStyle } from "@/components/ui/inline-style";
import { FloatingPortal } from "@floating-ui/react";
import { ReactNode, useEffect, useRef } from "react";

interface TranslationPortalProps {
  children: ReactNode;
  styles?: {
    scrollbarCSS?: string;
    cursorCSS?: string;
    lineClampCSS?: string;
    [key: string]: string | undefined;
  };
  selector?: string;
  portalId?: string;
}

/**
 * 用于在Shadow DOM中创建Portal的组件
 */
export function TranslationPortal({
  children,
  styles = {},
  selector = "selection-popup",
  portalId = "translation-panel-root",
}: TranslationPortalProps) {
  const portalRef = useRef<HTMLElement | null>(null);
  const shadowRootRef = useRef<ShadowRoot | null>(null);

  // 设置Portal逻辑
  useEffect(() => {
    const shadowRoot = document.querySelector(selector)?.shadowRoot;
    if (shadowRoot) {
      shadowRootRef.current = shadowRoot;

      const portalContainer = document.createElement("div");
      portalContainer.id = portalId;
      shadowRoot.appendChild(portalContainer);
      portalRef.current = portalContainer;

      return () => {
        shadowRoot.removeChild(portalContainer);
        portalRef.current = null;
        shadowRootRef.current = null;
      };
    }
  }, [selector, portalId]);

  if (!portalRef.current) return null;

  return (
    <FloatingPortal root={portalRef.current}>
      {/* 注入样式 */}
      {Object.entries(styles).map(
        ([key, css]) => css && <InlineStyle key={key} css={css} />
      )}
      {children}
    </FloatingPortal>
  );
}
