import { ScrollArea } from "@/components/ui/scroll-area";
import React, { useRef } from "react"; // Import useState and useEffect
import { createPortal } from "react-dom";
import Draggable from "react-draggable"; // Import Draggable
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
  const resultRef = useRef<HTMLDivElement>(null); // Keep this ref for initial position calculation if needed by useFloatingPosition
  const nodeRef = useRef<HTMLDivElement>(null); // Ref for Draggable
  const initialPosition = useFloatingPosition(position, resultRef, isVisible); // Use resultRef for initial calculation
  // Removed deltaPosition and isDragging states
  // Removed useEffect for resetting deltaPosition
  // Removed handleDrag function
  // Removed finalPosition calculation

  const handleSpeech = () => {
    if (onSpeech) {
      onSpeech(text);
    }
  };

  if (!isVisible) {
    return null;
  }

  // Removed conditional positionStyle

  const resultContent = (
    <Draggable
      nodeRef={nodeRef as React.RefObject<HTMLElement>} // Pass ref to Draggable with type assertion
      handle=".translation-result-drag-handle" // Specify the drag handle
      // Removed onDrag prop
      // Removed position prop
      defaultPosition={{ x: initialPosition.x, y: initialPosition.y }} // Use defaultPosition for initial placement
      // bounds="parent" // Optional: restrict dragging within parent/window
      // Removed onStart prop
      // onStop={() => { /* Potentially update state if needed after drag */ }}
    >
      {/* The Draggable component wraps the element it makes draggable */}
      <div
        ref={nodeRef} // Attach ref here for Draggable
        id="lite-lingo-translation-result"
        className="fixed z-[9999] rounded-lg shadow-lg p-3 max-w-xs min-w-[200px] bg-white border border-gray-200 light cursor-default" // Removed dark classes, added light class, min-w, default cursor
        style={{
          left: `${initialPosition.x}px`,
          top: `${initialPosition.y}px`,
        }} // Re-added style for initial position
        onClick={(event) => {
          // Prevent clicks inside from closing the panel (already handled in content script, but good practice)
          event.stopPropagation();
        }}
      >
        <ResultHeader onClose={onClose} />
        <ScrollArea
          className="h-48 pr-3"
          onWheel={(e) => e.stopPropagation()} // Prevent page scroll when scrolling inside ScrollArea
        >
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
    </Draggable>
  );

  return createPortal(resultContent, document.body);
};
