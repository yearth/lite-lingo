import { useEffect, useRef } from "react";

/**
 * 用于在Shadow DOM中创建并管理portal容器的钩子
 * @param selector 包含shadowRoot的元素选择器
 * @param portalId portal容器的ID
 */
export function useShadowPortal(selector: string, portalId: string) {
  const portalRef = useRef<HTMLElement | null>(null);
  const shadowRootRef = useRef<ShadowRoot | null>(null);

  useEffect(() => {
    const shadowRoot = document.querySelector(selector)?.shadowRoot;
    if (shadowRoot) {
      shadowRootRef.current = shadowRoot;

      // 创建一个portal容器
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

  return { portalRef, shadowRootRef };
}
