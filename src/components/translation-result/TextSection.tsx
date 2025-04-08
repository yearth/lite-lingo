import React from "react";

interface TextSectionProps {
  title: string;
  text: string | null | undefined; // Allow null/undefined for cases like contextExplanation
  isLoading?: boolean; // Optional loading state, primarily for translation text
}

export const TextSection: React.FC<TextSectionProps> = ({
  title,
  text,
  isLoading = false, // Default isLoading to false
}) => {
  // Don't render the section if text is null/undefined and not loading
  if (!text && !isLoading) {
    return null;
  }

  return (
    <>
      <div className="text-xs text-gray-500 mb-1">{title}:</div>
      <div className="text-sm mb-2 break-words text-gray-500">
        {isLoading ? (
          // Loading indicator (same as original translation loading)
          <div className="flex items-center space-x-1">
            <div className="h-1.5 w-1.5 bg-gray-400 rounded-full animate-bounce"></div>
            <div
              className="h-1.5 w-1.5 bg-gray-400 rounded-full animate-bounce"
              style={{ animationDelay: "0.2s" }}
            ></div>
            <div
              className="h-1.5 w-1.5 bg-gray-400 rounded-full animate-bounce"
              style={{ animationDelay: "0.4s" }}
            ></div>
          </div>
        ) : (
          text // Render the actual text
        )}
      </div>
    </>
  );
};
