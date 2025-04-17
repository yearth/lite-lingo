import { backgroundSSE } from "@/services/api/instance";
import { useSelectionStore } from "@/store/selection";
import { TranslationType, useTranslationStore } from "@/store/translation";
import { useCallback } from "react";

export function useTranslate() {
  const { position, setVisibility } = useSelectionStore();
  const {
    setVisibility: setTranslationVisibility,
    setPosition: setTranslationPosition,
    setOriginalText,
    setTranslatedText,
    setLoading,
    setActiveRequestId,
    updateParsedContent,
    setTranslationType,
  } = useTranslationStore();

  return useCallback(async () => {
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
    // 设置初始翻译类型为加载状态
    setTranslationType(TranslationType.LOADING);

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
      let translationTypeDetected = false; // 标记是否已检测到翻译类型

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

          // 检测翻译类型 (仅在第一次收到数据时)
          if (!translationTypeDetected) {
            const isTextMode = value && value.isTextMode === true;
            const detectedType = isTextMode
              ? TranslationType.SENTENCE
              : TranslationType.WORD;
            console.log(`[ Lite Lingo ] 检测到翻译类型: ${detectedType}`);
            setTranslationType(detectedType);
            translationTypeDetected = true;
          }

          // 处理不同格式的数据
          if (value && value.isTextMode) {
            // 文本模式数据 - 直接处理文本
            console.log("[ Lite Lingo ] 接收到文本模式数据");
            const textContent = value.text || "";

            completeTranslation += textContent;
            // 更新UI显示当前翻译结果
            setTranslatedText(completeTranslation);
          } else if (value && value.section && value.data) {
            // 解析后的结构化数据 - 按section更新
            console.log(
              "[ Lite Lingo ] 更新解析内容:",
              value.section,
              value.data
            );
            updateParsedContent(value.section, value.data);
          } else {
            // 处理其他格式的数据 - 兼容原有逻辑
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
        }
      } catch (streamError) {
        console.error("[ Lite Lingo ] 处理翻译流时出错:", streamError);

        // 如果已经收到了一些数据，显示已翻译的部分
        if (hasReceivedData && completeTranslation) {
          setTranslatedText(completeTranslation + " (翻译中断)");
        } else {
          setTranslatedText(
            `处理翻译流出错: ${
              streamError instanceof Error ? streamError.message : "未知错误"
            }`
          );
        }
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
  }, [
    position,
    setActiveRequestId,
    setLoading,
    setOriginalText,
    setTranslatedText,
    setTranslationPosition,
    setTranslationVisibility,
    setTranslationType,
    setVisibility,
    updateParsedContent,
  ]);
}
