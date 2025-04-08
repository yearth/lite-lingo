/**
 * 翻译服务工具
 * 提供与翻译 API 交互的函数
 */

// 翻译请求参数接口
interface TranslateParams {
  text: string;
  context?: string;
  targetLanguage?: string;
  sourceLanguage?: string;
  provider?: string;
  model?: string;
}

// 翻译结果处理器接口
interface TranslationHandlers {
  onChunk: (chunk: string) => void;
  onComplete: () => void;
  onError: (error: string) => void;
}

/**
 * 流式翻译文本
 * 使用 Server-Sent Events (SSE) 获取流式翻译结果
 *
 * @param params 翻译参数
 * @param handlers 结果处理回调函数
 * @returns 取消翻译的函数
 */
export async function streamTranslate(
  params: TranslateParams,
  handlers: TranslationHandlers
): Promise<() => void> {
  const {
    text,
    context = "",
    targetLanguage = "zh-CN",
    sourceLanguage,
    provider,
    model,
  } = params;
  const { onChunk, onComplete, onError } = handlers;

  // 验证必填参数
  if (!text) {
    onError("翻译文本不能为空");
    return () => {};
  }

  try {
    console.log("[Lite Lingo] 开始流式翻译请求", { text, targetLanguage });

    // 准备请求参数
    const requestBody = JSON.stringify({
      text,
      context,
      targetLanguage,
      sourceLanguage,
      provider: params.provider || 'openrouter',
      model: params.model
    });

    // 发起请求
    const response = await fetch("http://127.0.0.1:3000/translate/stream", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: requestBody,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`翻译请求失败: ${response.status} ${errorText}`);
    }

    // 处理流式响应
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("无法获取响应流");
    }

    const decoder = new TextDecoder();
    let buffer = ""; // 用于存储未完成的消息片段

    // 创建一个标志，用于跟踪是否已取消
    let isCancelled = false;

    // 处理流数据的函数
    const processStream = async () => {
      try {
        while (!isCancelled) {
          const { done, value } = await reader.read();

          if (done) {
            console.log("[Lite Lingo] 流处理完成");
            onComplete();
            break;
          }

          // 解码二进制数据
          const chunk = decoder.decode(value, { stream: true });
          console.log("[Lite Lingo] 接收到翻译数据:", chunk);
          
          // 检查是否为错误消息
          if (chunk.includes("Error translating:")) {
            const errorMsg = chunk.substring(chunk.indexOf("Error translating:") + "Error translating:".length).trim();
            console.error("[Lite Lingo] 翻译错误:", errorMsg);
            onError(errorMsg);
            isCancelled = true;
            break;
          }
          
          // 解析 SSE 格式的消息
          // 每条 SSE 消息的格式为：
          // id: [id]
          // type: [type]
          // data: [data]
          // 空行表示消息结束
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data:')) {
              // 提取 data 字段的值
              const data = line.substring('data:'.length).trim();
              if (data) {
                console.log("[Lite Lingo] 提取的翻译数据:", data);
                onChunk(data);
              }
            }
          }
        }
      } catch (error) {
        console.error("[Lite Lingo] 流处理错误:", error);
        onError(error instanceof Error ? error.message : String(error));
      }
    };

    // 开始处理流
    processStream();

    // 返回取消函数
    return () => {
      console.log("[Lite Lingo] 取消翻译请求");
      isCancelled = true;
      reader.cancel().catch(console.error);
    };
  } catch (error) {
    console.error("[Lite Lingo] 翻译请求错误:", error);
    onError(error instanceof Error ? error.message : String(error));
    return () => {};
  }
}
