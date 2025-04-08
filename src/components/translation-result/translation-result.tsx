import { ScrollArea } from "@/components/ui/scroll-area";
import React, { useRef } from "react";
import { createPortal } from "react-dom";
import { useFloatingPosition } from "../../hooks/useFloatingPosition";
import { DictionaryData } from "../../types/dictionary";
import { Separator } from "../ui/separator";
import { ActionButtons } from "./action-buttons";
import { DictionaryDisplay } from "./dictionary-display";
import { ResultHeader } from "./result-header";
import { TextSection } from "./text-section";

export interface TranslationResultProps {
  text: string;
  originalText: string;
  position: { x: number; y: number };
  isVisible: boolean;
  isLoading: boolean;
  contextExplanation?: string | null;
  dictionaryData?: DictionaryData | null;
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
  contextExplanation,
  dictionaryData,
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
      className="fixed z-[9999] rounded-lg shadow-lg p-3 max-w-xs min-w-[200px] bg-white border border-gray-200 light" // Removed dark classes, added light class and min-w
      style={{
        left: `${resultPosition.x}px`,
        top: `${resultPosition.y}px`,
      }}
      onClick={(event) => {
        event.stopPropagation();
      }}
    >
      <ResultHeader onClose={onClose} />
      <ScrollArea className="h-48 pr-3">
        {contextExplanation && (
          <>
            <Separator />
            <TextSection text={contextExplanation} />
          </>
        )}
        {dictionaryData && (
          <>
            <Separator />
            <DictionaryDisplay data={dictionaryData} />
          </>
        )}
      </ScrollArea>
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
