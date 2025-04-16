import {
  CloseIcon,
  CopyIcon,
  ExplainIcon,
  SpeakIcon,
  TranslateIcon,
} from "@/components/icons";
import { IconButton } from "@/components/ui/icon-button";
import { backgroundSSE } from "@/services/api/instance";
import { useSelectionStore } from "@/store/selection";
import { useTranslationStore } from "@/store/translation";
import {
  autoUpdate,
  flip,
  FloatingPortal,
  offset,
  shift,
  useFloating,
} from "@floating-ui/react";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef } from "react";

export function SelectionPopup() {
  const { position, isVisible, setVisibility } = useSelectionStore();
  const {
    setVisibility: setTranslationVisibility,
    setPosition: setTranslationPosition,
    setOriginalText,
    setTranslatedText,
    setLoading,
    setActiveRequestId,
  } = useTranslationStore();

  const portalRef = useRef<HTMLElement | null>(null);
  const shadowRootRef = useRef<ShadowRoot | null>(null);

  const { refs, floatingStyles } = useFloating({
    placement: "top",
    strategy: "fixed",
    middleware: [
      offset(10),
      flip({
        fallbackAxisSideDirection: "start",
      }),
      shift(),
    ],
    whileElementsMounted: autoUpdate,
  });

  // 按钮配置
  const buttons = [
    {
      icon: <CopyIcon />,
      tooltip: "复制",
      action: () => {
        // 复制选中的文本到剪贴板
        navigator.clipboard.writeText(window.getSelection()?.toString() || "");
      },
    },
    {
      icon: <ExplainIcon />,
      tooltip: "解释",
      action: () => {
        // 解释功能
        console.log("解释");
      },
    },
    {
      icon: <TranslateIcon />,
      tooltip: "翻译",
      action: async () => {
        // 获取选中文本
        const selectedText = window.getSelection()?.toString() || "";
        console.log("[ Lite Lingo ] selectedText", selectedText);

        // 先设置翻译面板的所有数据
        setOriginalText(selectedText);
        if (position) {
          setTranslationPosition(position);
        }

        // 设置加载状态
        setLoading(true);

        // 显示翻译面板
        setTranslationVisibility(true);

        try {
          console.log("[ Lite Lingo ] 发起流式翻译请求");

          // 设置初始翻译状态
          setTranslatedText("正在翻译...");

          // 创建请求配置
          const sseConfig = {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Accept-Version": "2",
            },
            body: JSON.stringify({
              text: selectedText,
              // 所有可选参数暂时不传
            }),
            useEventSource: false, // 使用fetch流处理
            onRequestInit: (reqId: string) => {
              // 保存请求ID到状态
              console.log("[ Lite Lingo ] 保存翻译请求ID:", reqId);
              setActiveRequestId(reqId);
            },
          };

          // 使用backgroundSSE发起流式请求
          console.log("[ Lite Lingo ] 配置SSE请求:", sseConfig);
          const { stream, requestId } = backgroundSSE<any>(
            "/v2/translate/stream",
            sseConfig
          );

          // 如果onRequestInit回调没有触发，这里再次保存requestId
          if (requestId) {
            console.log("[ Lite Lingo ] 确保保存翻译请求ID:", requestId);
            setActiveRequestId(requestId);
          }

          // 读取流数据
          const reader = stream.getReader();
          let completeTranslation = "";
          let hasReceivedData = false;

          // 处理流数据
          try {
            while (true) {
              const { done, value } = await reader.read();

              if (done) {
                console.log("[ Lite Lingo ] 翻译流结束");
                break;
              }

              // 记录每个数据块
              console.log("[ Lite Lingo ] 翻译数据块:", value);
              hasReceivedData = true;

              // 从value中提取文本内容
              let textChunk = "";
              if (value && value.data && value.data.text) {
                textChunk = value.data.text;
              } else if (value && value.text) {
                textChunk = value.text;
              } else if (typeof value === "string") {
                textChunk = value;
              } else {
                console.warn("[ Lite Lingo ] 无法从数据块中提取文本:", value);
                // 尝试将整个对象转为字符串
                textChunk = JSON.stringify(value);
              }

              if (textChunk) {
                completeTranslation += textChunk;
                // 更新UI显示当前翻译结果
                setTranslatedText(completeTranslation);
              }
            }
          } catch (streamError) {
            console.error("[ Lite Lingo ] 处理翻译流时出错:", streamError);

            // 如果已经收到了一些数据，显示已翻译的部分
            if (hasReceivedData && completeTranslation) {
              setTranslatedText(completeTranslation + " (翻译中断)");
            } else {
              setTranslatedText(
                `处理翻译流出错: ${
                  streamError instanceof Error
                    ? streamError.message
                    : "未知错误"
                }`
              );
            }

            // 不抛出异常，因为我们已经处理了错误
          }

          // 流结束后，确保显示完整翻译结果
          if (completeTranslation) {
            console.log("[ Lite Lingo ] 完整翻译结果:", completeTranslation);
            setTranslatedText(completeTranslation);
          } else if (!hasReceivedData) {
            setTranslatedText("翻译完成，但未返回内容");
          }
        } catch (error) {
          // 处理异常
          console.error("[ Lite Lingo ] 翻译请求失败:", error);
          setTranslatedText(
            `请求失败: ${error instanceof Error ? error.message : "未知错误"}`
          );

          // 清除请求ID
          setActiveRequestId(null);
        } finally {
          // 重置加载状态
          setLoading(false);
        }

        // 最后隐藏划词气泡
        setVisibility(false);
      },
    },
    {
      icon: <SpeakIcon />,
      tooltip: "朗读",
      action: () => {
        // 朗读功能
        console.log("朗读");
      },
    },
    {
      icon: <CloseIcon />,
      tooltip: "关闭",
      action: () => {
        // 关闭弹窗
        setVisibility(false);
      },
    },
  ];

  // 设置 Portal 的根元素
  useEffect(() => {
    // 获取 shadow root
    const shadowRoot = document.querySelector("selection-popup")?.shadowRoot;
    if (shadowRoot) {
      shadowRootRef.current = shadowRoot;
      // 创建一个 portal 容器
      const portalContainer = document.createElement("div");
      portalContainer.id = "floating-portal-root";
      shadowRoot.appendChild(portalContainer);
      portalRef.current = portalContainer;

      return () => {
        shadowRoot.removeChild(portalContainer);
        portalRef.current = null;
        shadowRootRef.current = null;
      };
    }
  }, []);

  useEffect(() => {
    if (isVisible && position) {
      refs.setPositionReference({
        getBoundingClientRect() {
          return {
            width: 0,
            height: 0,
            x: position.x,
            y: position.y,
            top: position.y,
            right: position.x,
            bottom: position.y,
            left: position.x,
            toJSON() {
              return this;
            },
          };
        },
      });
    }
  }, [isVisible, position]);

  const handleClickOutside = (e: Event) => {
    // 使用 composedPath 来获取事件路径，包括 Shadow DOM
    const path = e.composedPath();
    const target = path[0] as Node;
    const portalElement = portalRef.current;

    // 如果点击目标不在 portal 容器内，则关闭弹窗
    if (portalElement && !portalElement.contains(target)) {
      setVisibility(false);
    }
  };

  useEffect(() => {
    if (!portalRef.current) return;

    const element = portalRef.current;
    element.addEventListener("mousedown", handleClickOutside);

    return () => {
      element.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  if (!portalRef.current) return null;

  return (
    <FloatingPortal root={portalRef.current}>
      <AnimatePresence>
        {isVisible && (
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            className="fixed z-[999]"
          >
            <motion.div
              className="bg-white rounded-xl select-none inline-flex overflow-hidden"
              style={{
                boxShadow: "0 4px 20px rgba(0, 0, 0, 0.15)",
              }}
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              transition={{
                duration: 0.1,
                ease: "easeOut",
              }}
            >
              <div className="px-2 py-0.5 flex gap-1.5 items-center bg-white">
                {buttons.map((button, index) => (
                  <IconButton
                    key={index}
                    icon={button.icon}
                    tooltipContent={button.tooltip}
                    onClick={button.action}
                  />
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </FloatingPortal>
  );
}
