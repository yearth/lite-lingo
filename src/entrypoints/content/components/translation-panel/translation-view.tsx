import { Skeleton } from "@/components/ui/skeleton";
import { TranslationType } from "@/store/translation";
import { AnimatePresence, motion } from "framer-motion";
import { useMemo } from "react";
import { SentenceTranslationView } from "./sentence-translation-view";
import { WordTranslationView } from "./word-translation-view";

/**
 * 纯内容显示组件，只负责展示翻译结果，不包含操作按钮
 */
export function TranslationView({
  isLoading,
  translatedText,
  originalText,
  parsedContent,
  translationType,
  activeRequestId,
  shouldShowCursor,
}: {
  isLoading: boolean;
  translatedText: string;
  originalText: string;
  parsedContent: any;
  translationType: TranslationType;
  activeRequestId: string | null;
  shouldShowCursor?: boolean;
}) {
  // 如果外部没有提供shouldShowCursor，则内部计算
  const showCursor =
    shouldShowCursor ??
    useMemo(() => {
      // 只在流式翻译过程中显示光标：有内容，正在加载，且内容在变化
      return (
        translatedText &&
        isLoading &&
        translatedText !== "正在翻译..." &&
        activeRequestId !== null
      ); // 确保有活跃的请求ID
    }, [translatedText, isLoading, activeRequestId]);

  // 显示基本加载状态
  if (isLoading && !translatedText) {
    return (
      <div className="flex flex-col space-y-4 p-4 w-full">
        {/* 使用骨架屏代替文本提示 */}
        <Skeleton className="h-4 w-3/4 bg-gray-200" />
        <Skeleton className="h-20 w-full bg-gray-200" />
        <Skeleton className="h-4 w-5/6 bg-gray-200" />
      </div>
    );
  }

  // 使用AnimatePresence进行平滑过渡
  return (
    <AnimatePresence>
      {translationType === TranslationType.SENTENCE ? (
        <motion.div
          key="sentence-view"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          <SentenceTranslationView
            translatedText={translatedText}
            shouldShowCursor={!!showCursor}
          />
        </motion.div>
      ) : translationType === TranslationType.WORD ? (
        <motion.div
          key="word-view"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          <WordTranslationView
            parsedContent={parsedContent}
            shouldShowCursor={!!showCursor}
            translatedText={translatedText}
          />
        </motion.div>
      ) : (
        <motion.div
          key="loading-view"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="flex flex-col space-y-4 p-4 w-full">
            {/* 使用骨架屏代替文本提示 */}
            <Skeleton className="h-4 w-3/4 bg-gray-200" />
            <Skeleton className="h-20 w-full bg-gray-200" />
            <Skeleton className="h-4 w-5/6 bg-gray-200" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
