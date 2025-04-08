import React, { useRef } from "react";
import { createPortal } from "react-dom";
import { useFloatingPosition } from "../../hooks/useFloatingPosition"; // Import hook
import { DictionaryData } from "../../types/dictionary"; // Corrected import path
import { ActionButtons } from "./ActionButtons"; // Corrected import path
import { DictionaryDisplay } from "./DictionaryDisplay"; // Corrected import path
import { ResultHeader } from "./ResultHeader"; // Corrected import path
import { TextSection } from "./TextSection"; // Corrected import path

// Export the props interface
export interface TranslationResultProps {
  text: string; // Main translation result
  originalText: string;
  position: { x: number; y: number };
  isVisible: boolean;
  isLoading: boolean;
  contextExplanation?: string | null; // New prop for context explanation
  dictionaryData?: DictionaryData | null; // New prop for dictionary data
  onClose: () => void;
  onSpeech?: (text: string) => void; // Speech for the main translation text
}

/**
 * 翻译结果组件
 * 用于显示翻译结果，支持流式更新
 */
// Export the component
export const TranslationResult: React.FC<TranslationResultProps> = ({
  text,
  originalText,
  position,
  isVisible,
  isLoading,
  onClose,
  onSpeech,
  contextExplanation, // Destructure new props
  dictionaryData, // Destructure new props
}) => {
  const resultRef = useRef<HTMLDivElement>(null);
  const resultPosition = useFloatingPosition(position, resultRef, isVisible);

  const handleSpeech = () => {
    if (onSpeech) {
      onSpeech(text);
    }
  };

  if (!isVisible) {
    return null;
  }

  const resultContent = (
    <div
      ref={resultRef}
      id="lite-lingo-translation-result"
      className="fixed z-[9999] bg-white rounded-lg shadow-lg border border-gray-200 p-3 max-w-xs"
      style={{
        left: `${resultPosition.x}px`,
        top: `${resultPosition.y}px`,
        minWidth: "200px",
      }}
      onClick={(event) => {
        event.stopPropagation();
      }}
    >
      <ResultHeader onClose={onClose} />
      <TextSection title="原文" text={originalText} />
      <div className="border-t border-gray-200 my-2"></div>
      <TextSection
        title="译文"
        text={text}
        isLoading={isLoading && text.length === 0}
      />
      {contextExplanation && (
        <>
          <div className="border-t border-gray-200 my-2"></div>
          <TextSection title="上下文解释" text={contextExplanation} />
        </>
      )}
      {dictionaryData && (
        <>
          <div className="border-t border-gray-200 my-2"></div>
          <DictionaryDisplay data={dictionaryData} />
        </>
      )}
      <ActionButtons
        textToCopy={text}
        onSpeech={handleSpeech}
        isSpeechDisabled={isLoading || text.length === 0}
        isCopyDisabled={isLoading || text.length === 0}
      />
    </div>
  );

  return createPortal(resultContent, document.body);
};

// Removed TranslationResultManager class from this file
// Also remove ReactDOM import if it exists at the top (it shouldn't based on last state)
