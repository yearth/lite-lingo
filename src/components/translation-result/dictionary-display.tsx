import React from "react";
import {
  DictionaryData
} from "../../types/dictionary";

interface DictionaryDisplayProps {
  data: DictionaryData | null; // Non-streamed parts (word, phonetic)
  definitionTexts: string[] | null; // Array for streamed definitions
  exampleTexts: string[] | null; // Array for streamed examples
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
  definitionTexts, // Use plural name for array prop
  exampleTexts, // Use plural name for array prop
}) => {
  // Handle case where no data is available yet
  if (!data && (!definitionTexts || definitionTexts.length === 0)) {
    return null;
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
      {/* Render streamed definitions by mapping over the array */}
      {definitionTexts && definitionTexts.length > 0 && definitionTexts.map((defText, index) => (
          // TODO: Need a way to get the corresponding 'pos' if available (maybe from data.definitions[index]?)
          // For now, just display the streamed text.
          <div key={`def-${index}`} className="mb-1.5 ml-1">
              {/* <div className="text-xs text-blue-600 font-medium">{data?.definitions?.[index]?.pos ?? '释义'}</div>{" "} */}
              <div className="text-sm text-gray-700 ml-2">{defText || "..."}</div>{" "}
              {/* Render corresponding streamed example if available */}
              {exampleTexts && exampleTexts[index] && (
                  <div className="text-xs text-gray-500 ml-4 mt-0.5">
                      <div>例: {exampleTexts[index]}</div>
                  </div>
              )}
          </div>
      ))}
    </>
  );
};

// Remove the duplicate definition below
