import {
  computePosition,
  flip,
  offset,
  shift,
  VirtualElement,
} from "@floating-ui/react"; // Import Floating UI hooks and types
import { AnimatePresence, motion } from "framer-motion"; // 导入 motion 组件
import React, { useEffect, useMemo, useRef, useState } from "react"; // 添加 useState
import { createPortal } from "react-dom";
// import Draggable, { DraggableData, DraggableEvent } from "react-draggable"; // Comment out Draggable import
import { DictionaryData } from "../../types/dictionary";
// import { Separator } from "../ui/separator";
import { ActionButtons } from "./action-buttons";
import { DictionaryDisplay } from "./dictionary-display";
import { ResultHeader } from "./result-header";
import { TextSection } from "./text-section";

export interface TranslationResultProps {
  text: string; // Main translation result
  originalText: string;
  position: Range | null; // Changed type to accept Range or null
  isVisible: boolean;
  isLoading: boolean;
  explanation?: string | null;
  contextExplanation?: string | null;
  dictionaryData?: DictionaryData | null;
  dictionaryDefinitions?: string[] | null; // Rename to plural
  dictionaryExamples?: string[] | null; // Rename to plural
  onClose: () => void;
  onSpeech?: (text: string) => void;
}

export const TranslationResult: React.FC<TranslationResultProps> = ({
  text,
  originalText,
  position,
  isVisible,
  isLoading,
  onClose,
  onSpeech,
  explanation,
  contextExplanation,
  dictionaryData,
  dictionaryDefinitions, // Destructure plural name
  dictionaryExamples, // Destructure plural name
}) => {
  // 使用与划词气泡相同的定位策略
  const resultRef = useRef<HTMLDivElement>(null);
  const [resultPosition, setResultPosition] = useState({ x: 0, y: 0 });

  // 创建虚拟元素作为参考点
  const virtualElement = useMemo((): VirtualElement | null => {
    if (!position) return null;

    // 使用与划词气泡相同的方式获取选择区域的位置
    const rect =
      position.getClientRects().length > 0
        ? position.getClientRects()[0]
        : position.getBoundingClientRect();

    console.log("[Lite Lingo] Rendering TranslationResult rect:", rect);

    return {
      getBoundingClientRect: () => rect,
      contextElement: position.startContainer.parentElement ?? undefined,
    };
  }, [position]);

  // 使用 useAsync 异步计算位置
  useEffect(() => {
    const calculatePosition = async () => {
      if (!isVisible || !virtualElement || !resultRef.current) return;

      // 使用 computePosition 计算位置
      const { x, y } = await computePosition(
        virtualElement as Element,
        resultRef.current,
        {
          placement: "bottom-start",
          middleware: [offset(10), flip(), shift({ padding: 5 })],
        }
      );

      console.log("[Lite Lingo] 结果面板定位完成:", { x, y });
      setResultPosition({ x, y });
    };

    calculatePosition();
  }, [isVisible, virtualElement]);

  const handleSpeech = () => {
    if (onSpeech) {
      onSpeech(text);
    }
  };

  return createPortal(
    <AnimatePresence>
      {isVisible && (
        <motion.div
          ref={resultRef}
          id="lite-lingo-translation-result"
          className="fixed z-[9999] rounded-lg shadow-lg p-3 max-w-xs min-w-[200px] bg-white border border-gray-200 light cursor-default"
          style={{
            left: `${resultPosition.x}px`,
            top: `${resultPosition.y}px`,
          }}
          initial={{ opacity: 0, scale: 0.9, y: -5 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: -5 }}
          transition={{
            type: "spring",
            duration: 0.3,
            bounce: 0.2,
          }}
          onClick={(event) => {
            event.stopPropagation();
          }}
        >
          <ResultHeader onClose={onClose} />
          {/* Main Translation - Display directly with bold styling */}
          <div className="text-sm font-bold mb-2 break-words text-gray-800">
            {text || (isLoading && "...")}{" "}
            {/* Show text or loading indicator */}
          </div>
          <div
            className="h-48 pr-3 overflow-y-auto"
            onWheel={(e) => e.stopPropagation()}
          >
            {/* Explanation Section */}
            {explanation && (
              <>
                <hr className="my-2 border-t border-gray-200" />
                <TextSection title="Explanation" text={explanation} />
              </>
            )}
            {/* Context Explanation Section */}
            {contextExplanation && (
              <>
                <hr className="my-2 border-t border-gray-200" />
                <TextSection
                  title="Context Explanation"
                  text={contextExplanation}
                />
              </>
            )}
            {/* Dictionary Section - Render if any dictionary info is available */}
            {(dictionaryData ||
              dictionaryDefinitions ||
              dictionaryExamples) && (
              <>
                <hr className="my-2 border-t border-gray-200" />
                {/* Pass dictionary data and streamed text arrays to its display component, providing null defaults */}
                <DictionaryDisplay
                  data={dictionaryData ?? null}
                  definitionTexts={dictionaryDefinitions ?? null}
                  exampleTexts={dictionaryExamples ?? null}
                />
              </>
            )}
          </div>
          <ActionButtons
            textToCopy={text}
            onSpeech={handleSpeech}
            isSpeechDisabled={isLoading || text.length === 0}
            isCopyDisabled={isLoading || text.length === 0}
          />
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};
