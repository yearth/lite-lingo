import React from "react";
import {
  DictionaryData
} from "../../types/dictionary";

interface DictionaryDisplayProps {
  data: DictionaryData | null; // Allow null if data might not be fully available initially
  definitionText: string | null;
  exampleText: string | null;
}

// ExampleItem might not be needed if we stream example directly
// const ExampleItem: React.FC<{ example: DictionaryExample }> = ({ example }) => (
//   <div className="text-xs text-gray-500 ml-4 mt-0.5">
//     <div>例: {example.original}</div>
//     <div>{example.translation}</div>
//   </div>
// );

// DefinitionItem might not be needed if we stream definition directly
// const DefinitionItem: React.FC<{ definition: DictionaryDefinition }> = ({
//   definition,
// }) => (
//   <div className="mb-1.5 ml-1">
//     <div className="text-xs text-blue-600 font-medium">{definition.pos}</div>{" "}
//     <div className="text-sm text-gray-700 ml-2">{definition.def}</div>{" "}
//     {/* {definition.examples.map((ex, exIndex) => (
//       <ExampleItem key={exIndex} example={ex} />
//     ))} */}
//   </div>
// );

export const DictionaryDisplay: React.FC<DictionaryDisplayProps> = ({
  data,
  definitionText,
  exampleText,
}) => {
  // Handle case where data might be null initially
  if (!data && !definitionText && !exampleText) {
    return null; // Don't render if nothing is available yet
  }

  // Extract non-streamed data safely using optional chaining
  const word = data?.word ?? ""; // Use nullish coalescing for default
  const phonetic = data?.phonetic ?? "";
  const translation = data?.translation ?? ""; // Assuming translation is part of DictionaryData
  // const pos = data?.definitions?.[0]?.pos ?? "释义"; // Get pos from first definition if needed, but we render streamed text now

  return (
    <>
      <div className="mb-1">
        <span className="text-sm font-semibold text-gray-900">{word}</span>{" "}
        {phonetic && (
          <span className="text-xs text-gray-500 ml-1">[{phonetic}]</span>
        )}
        {translation && <span className="text-sm text-gray-600 ml-2">({translation})</span>}{" "}
      </div>
      {/* Render streamed definition only if it has content */}
      {definitionText && ( // Check if definitionText is truthy (not null, not empty string)
        <div className="mb-1.5 ml-1">
           {/* <div className="text-xs text-blue-600 font-medium">{pos}</div>{" "} Remove POS display for now */}
           <div className="text-sm text-gray-700 ml-2">{definitionText}</div>{" "} {/* Render directly */}
           {/* Render streamed example only if it has content */}
           {exampleText && ( // Check if exampleText is truthy
             <div className="text-xs text-gray-500 ml-4 mt-0.5">
                 <div>例: {exampleText}</div>
             </div>
           )}
        </div> // Correct closing div for mb-1.5 ml-1
      )}
      {/* Remove the loop based on data.definitions */}
    </>
  );
};

// Remove the duplicate definition below
