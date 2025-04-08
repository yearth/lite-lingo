import React from "react";
import {
  DictionaryData,
  DictionaryDefinition,
  DictionaryExample,
} from "../../types/dictionary"; // Adjust path as needed

interface DictionaryDisplayProps {
  data: DictionaryData;
}

// Optional: Sub-component for rendering examples
const ExampleItem: React.FC<{ example: DictionaryExample }> = ({ example }) => (
  <div className="text-xs text-gray-500 ml-4 mt-0.5">
    <div>例: {example.original}</div>
    <div>{example.translation}</div>
    {/* Add speech button for example? */}
  </div>
);

// Optional: Sub-component for rendering definitions
const DefinitionItem: React.FC<{ definition: DictionaryDefinition }> = ({
  definition,
}) => (
  <div className="mb-1.5 ml-1">
    <div className="text-xs text-blue-600 font-medium">{definition.pos}</div>
    <div className="text-sm text-gray-700 ml-2">{definition.def}</div>
    {definition.examples.map((ex, exIndex) => (
      <ExampleItem key={exIndex} example={ex} />
    ))}
  </div>
);

export const DictionaryDisplay: React.FC<DictionaryDisplayProps> = ({
  data,
}) => {
  return (
    <>
      {/* Dictionary Header */}
      <div className="mb-1">
        <span className="text-sm font-semibold">{data.word}</span>
        {data.phonetic && (
          <span className="text-xs text-gray-500 ml-1">[{data.phonetic}]</span>
        )}
        <span className="text-sm text-gray-600 ml-2">({data.translation})</span>
        {/* Add a speech button specifically for the dictionary word? */}
      </div>
      {/* Definitions and Examples */}
      {data.definitions.map((def, index) => (
        <DefinitionItem key={index} definition={def} />
      ))}
    </>
  );
};
