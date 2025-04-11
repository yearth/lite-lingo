import { ScrollArea } from "@/components/ui/scroll-area";
import {
  autoUpdate,
  flip,
  offset,
  shift,
  useFloating,
  VirtualElement,
} from "@floating-ui/react"; // Import Floating UI hooks and types
import React, { useEffect, useMemo, useRef } from "react"; // Remove useState import
import { createPortal } from "react-dom";
// import Draggable, { DraggableData, DraggableEvent } from "react-draggable"; // Comment out Draggable import
import { DictionaryData } from "../../types/dictionary";
import { Separator } from "../ui/separator";
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
  dictionaryDefinition?: string | null; // Add new prop
  dictionaryExample?: string | null; // Add new prop
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
  dictionaryDefinition, // Destructure new prop
  dictionaryExample, // Destructure new prop
}) => {
  // Floating UI setup
  const referenceElement = useMemo((): VirtualElement | null => {
    if (!position) return null;
    // Try using getClientRects()[0] for potentially more accurate positioning,
    // especially for multi-line selections. Fallback to getBoundingClientRect.
    const rect =
      position.getClientRects().length > 0
        ? position.getClientRects()[0]
        : position.getBoundingClientRect();

    console.log("[Lite Lingo] Rendering TranslationResult rect:", rect);

    return {
      getBoundingClientRect: () => rect,
      // getClientRects is optional for VirtualElement
      // getClientRects: () => position.getClientRects(),
      contextElement: position.startContainer.parentElement ?? undefined,
    };
  }, [position]);

  // Initialize useFloating without the elements option initially
  const { refs, floatingStyles, context } = useFloating({
    // elements: { // Removed from here
    //   reference: referenceElement,
    // },
    whileElementsMounted: autoUpdate,
    placement: "bottom-start", // Or choose another placement
    middleware: [
      offset(10), // Add some space between selection and result box
      flip(), // Flip to opposite side if not enough space
      shift({ padding: 5 }), // Prevent overflow
    ],
  });

  // Use useEffect to set the reference element when it changes
  useEffect(() => {
    console.log(
      "[Lite Lingo] Rendering TranslationResult referenceElement:",
      referenceElement
    );

    refs.setReference(referenceElement);
  }, [refs, referenceElement]);

  const nodeRef = useRef<HTMLDivElement>(null); // Keep nodeRef for Draggable

  // Combine refs for Floating UI and Draggable
  const mergedRef = useMemo(() => {
    return (instance: HTMLDivElement | null) => {
      refs.setFloating(instance);
      (nodeRef as React.MutableRefObject<HTMLDivElement | null>).current =
        instance;
    };
  }, [refs, nodeRef]);

  // Remove drag offset state and handler
  // const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  // useEffect(() => {
  //   setDragOffset({ x: 0, y: 0 });
  // }, [position]);
  // const handleDrag = (e: DraggableEvent, data: DraggableData) => {
  //   setDragOffset((prev) => ({
  //     x: prev.x + data.deltaX,
  //     y: prev.y + data.deltaY,
  //   }));
  // };

  const handleSpeech = () => {
    if (onSpeech) {
      onSpeech(text);
    }
  };

  if (!isVisible) {
    return null;
  }

  // Log the calculated styles before rendering
  console.log("[Lite Lingo] Calculated Floating Styles:", floatingStyles);

  // Log the calculated styles before rendering
  console.log("[Lite Lingo] Calculated Floating Styles:", floatingStyles);

  const resultContent = (
    // Comment out Draggable again
    // <Draggable
    //   nodeRef={nodeRef as React.RefObject<HTMLElement>}
    //   handle=".translation-result-drag-handle"
    //   onDrag={handleDrag}
    //   position={dragOffset}
    // >
    <div
      // Apply Floating UI ref directly when Draggable is removed
      // Use floatingStyles directly for positioning
      ref={refs.setFloating} // Apply Floating UI ref directly
      id="lite-lingo-translation-result"
      className="z-[9999] rounded-lg shadow-lg p-3 max-w-xs min-w-[200px] bg-white border border-gray-200 light cursor-default"
      style={floatingStyles} // Apply floatingStyles directly
      onClick={(event) => {
        event.stopPropagation();
      }}
    >
      <ResultHeader onClose={onClose} />
      {/* Main Translation - Display directly with bold styling */}
      <div className="text-sm font-bold mb-2 break-words text-gray-800">
        {text || (isLoading && "...")} {/* Show text or loading indicator */}
      </div>
      <ScrollArea className="h-48 pr-3" onWheel={(e) => e.stopPropagation()}>
        {/* Explanation Section */}
        {explanation && (
          <>
            <Separator />
            <TextSection title="Explanation" text={explanation} />
          </>
        )}
        {/* Context Explanation Section */}
        {contextExplanation && (
          <>
            <Separator />
            <TextSection
              title="Context Explanation"
              text={contextExplanation}
            />
          </>
        )}
        {/* Dictionary Section - Render if any dictionary info is available */}
        {(dictionaryData || dictionaryDefinition || dictionaryExample) && (
          <>
            <Separator />
            {/* Pass dictionary data and streamed text to its display component, providing null defaults */}
            <DictionaryDisplay
              data={dictionaryData ?? null}
              definitionText={dictionaryDefinition ?? null}
              exampleText={dictionaryExample ?? null}
            />
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
    // </Draggable> // Comment out Draggable again
  );

  return createPortal(resultContent, document.body);
};
