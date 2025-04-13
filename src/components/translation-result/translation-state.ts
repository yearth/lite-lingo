import { AnalysisInfoPayload } from "@/types/messaging";
import { DictionaryData } from "../../types/dictionary";

// Interface defining the state managed by this class
// Note: dictionaryData might become just a string if we only append raw text
// Or keep the structure and append raw text to a new field?
// Let's keep the structure for now, but add a raw field if needed later.
// For simplicity as requested, we'll just append to the 'word' field for now.
export interface ITranslationState {
  text: string;
  originalText: string;
  explanation: string | null; // TODO: Potentially remove if covered by contextExplanation
  contextExplanation: string | null; // Streamed
  dictionaryData: DictionaryData | null; // Holds non-streamed parts like word, phonetic, maybe pos?
  dictionaryDefinitions: string[] | null; // Streamed definitions text array
  dictionaryExamples: string[] | null; // Streamed examples text array
  isLoading: boolean;
  onSpeech?: (text: string) => void;
}

// Type for the callback function when state changes
type StateChangeCallback = (newState: ITranslationState) => void;

export class TranslationState {
  private state: ITranslationState;
  private onChange: StateChangeCallback | null = null;

  constructor(initialState?: Partial<ITranslationState>) {
    this.state = {
      text: "",
      originalText: "",
      explanation: null,
      contextExplanation: null,
      dictionaryData: null,
      dictionaryDefinitions: null, // Initialize as null
      dictionaryExamples: null, // Initialize as null
      isLoading: false,
      onSpeech: undefined,
      ...initialState,
    };
  }

  // Method to subscribe to state changes
  public setOnChange(callback: StateChangeCallback): void {
    this.onChange = callback;
  }

  // Method to get the current state
  public getState(): ITranslationState {
    // Return a copy to prevent direct mutation? Or trust the consumer?
    // For now, return direct reference for simplicity.
    return this.state;
  }

  // Method to update state and notify listener
  private updateState(newState: Partial<ITranslationState>): void {
    // Only update if there's an actual change? Deep comparison might be needed.
    // For simplicity, always update and notify for now.
    this.state = { ...this.state, ...newState };
    if (this.onChange) {
      this.onChange(this.state); // Notify listener with the new state
    }
  }

  // --- State Update Methods (to be moved from Manager) ---

  public reset(): void {
    console.log("[Lite Lingo State] Resetting state");
    this.updateState({
      text: "",
      originalText: "", // Keep originalText or reset? Resetting seems safer.
      explanation: null,
      contextExplanation: null,
      dictionaryData: null,
      dictionaryDefinitions: null, // Reset to null
      dictionaryExamples: null, // Reset to null
      isLoading: false,
      // onSpeech: undefined,
    });
  }

  public setAnalysisInfo(info: AnalysisInfoPayload): void {
    console.log("[Lite Lingo State] Setting analysis info:", info);
    this.updateState({
      originalText: info.sourceText,
    });
  }

  public setLoading(isLoading: boolean): void {
    if (this.state.isLoading !== isLoading) {
      console.log("[Lite Lingo State] Setting loading state:", isLoading);
      this.updateState({ isLoading });
    }
  }

  // --- Methods to set specific parts of the state ---

  public setContext(context: { word_translation?: string; explanation?: string } | null): void {
    console.log("[Lite Lingo State] Setting context:", context);
    this.updateState({ contextExplanation: context?.explanation ?? null }); // Assuming contextExplanation holds this
    // If word_translation needs to be stored separately, add a state field for it.
  }

  public setDictionary(dictionary: DictionaryData | null): void {
    console.log("[Lite Lingo State] Setting dictionary:", dictionary);
    this.updateState({ dictionaryData: dictionary });
  }

  public setTranslationResult(text: string): void {
    console.log("[Lite Lingo State] Setting translation result:", text);
    this.updateState({ text: text }); // Update the main 'text' field
  }

  public setFragmentError(errorText: string): void {
    console.log("[Lite Lingo State] Setting fragment error:", errorText);
    // Decide how to display fragment errors. Append to main text? Separate field?
    // Appending to main text for now.
    // Appending to main text for now.
    // Appending to main text for now.
    this.updateState({ text: (this.state.text || "") + `\n[ERROR: ${errorText}]`, isLoading: false });
  }

  // --- Methods to set specific parts of the state (non-streaming) ---
   public setDictionaryDefinitionText(index: number, text: string): void {
     // Sets the complete text for a definition at a specific index
     const definitions = [...(this.state.dictionaryDefinitions || [])];
     while (definitions.length <= index) { definitions.push(""); } // Ensure array length
     definitions[index] = text;
     this.updateState({ dictionaryDefinitions: definitions });
  }

  public setDictionaryExampleText(index: number, text: string): void {
     // Sets the complete text for an example at a specific index
     const examples = [...(this.state.dictionaryExamples || [])];
     while (examples.length <= index) { examples.push(""); } // Ensure array length
     examples[index] = text;
     this.updateState({ dictionaryExamples: examples });
  }


  // --- Methods to append text chunks for streaming effect ---

  public appendText(chunk: string): void {
    // Append to the main translation text field
    this.updateState({ text: (this.state.text || "") + chunk });
    // Ensure loading is true while actively appending
    if (!this.state.isLoading) {
        this.setLoading(true);
    }
  }

  public appendContextExplanation(chunk: string): void {
    this.updateState({ contextExplanation: (this.state.contextExplanation || "") + chunk });
     if (!this.state.isLoading) {
        this.setLoading(true);
    }
  }

  // Updated append methods to handle arrays
  public appendDictionaryDefinition(index: number, chunk: string): void {
    const definitions = [...(this.state.dictionaryDefinitions || [])];
    // Ensure the array is long enough
    while (definitions.length <= index) {
        definitions.push("");
    }
    definitions[index] = (definitions[index] || "") + chunk;
    this.updateState({ dictionaryDefinitions: definitions }); // Update correct state property
     if (!this.state.isLoading) {
        this.setLoading(true);
    }
  }

  public appendDictionaryExample(index: number, chunk: string): void {
    const examples = [...(this.state.dictionaryExamples || [])];
     // Ensure the array is long enough
    while (examples.length <= index) {
        examples.push("");
    }
    examples[index] = (examples[index] || "") + chunk;
    this.updateState({ dictionaryExamples: examples }); // Update correct state property
     if (!this.state.isLoading) {
        this.setLoading(true);
    }
  }

  // TODO: Handle potential nested structure within dictionary if needed later.
  // For now, assuming definition and example are direct children for streaming.

  // This would require more complex state updates for the nested structure.
  // This would require more complex state updates for the nested structure.

  // Added public method to specifically set original text
  public setOriginalText(originalText: string): void {
    this.updateState({ originalText });
  }

  public setSpeechHandler(onSpeech?: (text: string) => void): void {
    this.updateState({ onSpeech });
  }

  public showError(errorMessage: string): void {
    console.error("[Lite Lingo State] Setting error state:", errorMessage);
    this.updateState({
      text: `Error: ${errorMessage}`,
      isLoading: false,
      explanation: null,
      contextExplanation: null,
      dictionaryData: null,
    });
  }

  // --- Section Updaters Map (Simplified) ---
  // Note: These methods return the partial state changes to be applied.
  // which is then passed to updateState in updateSection.

  private sectionUpdaters: Record<
    string,
    (
      chunk: string,
      state: ITranslationState
    ) => Partial<ITranslationState> | null
  > = {
    EXPLANATION: (chunk, state) => ({ // Use uppercase to match backend payload
      explanation: (state.explanation || "") + chunk,
    }),
    CONTEXT_EXPLANATION: (chunk, state) => ({ // Use uppercase
      contextExplanation: (state.contextExplanation || "") + chunk,
    }),
    DICTIONARY: (chunk, state) => { // Use uppercase
      // Simple append logic for dictionary as requested
      const dictionaryData = state.dictionaryData || {
        word: "",
        translation: "",
        phonetic: "",
        definitions: [],
      };
      // Append raw chunk to the 'word' field for now, as a placeholder for raw text display
      // A better approach might be a dedicated 'rawContent' field.
      dictionaryData.word = (dictionaryData.word || "") + chunk;
      return { dictionaryData: { ...dictionaryData } };
    },
    // Assuming 'translationResult' is not sent via section markers, but directly?
    // If it IS sent via markers, add a case for it.
    // If not, the TranslationResultManager might call updateState directly for it,
    // or we need a dedicated method. Let's keep the updater for now.
    translationResult: (chunk, state) => ({ // Keep this for potential direct updates?
      text: (state.text || "") + chunk,
    }),
    fragmentError: (chunk, state) => {
      console.error("[Lite Lingo State] Fragment Error Chunk:", chunk);
      return {
        text: (state.text || "") + `\n[ERROR: ${chunk}]`,
        isLoading: false, // Stop loading on error
      };
    },
  };

  public updateSection(sectionName: string, textChunk: string): void {
    const updater = this.sectionUpdaters[sectionName];
    if (updater) {
      // Pass the current state to the updater function
      const newStateChanges = updater(textChunk, this.state);
      if (newStateChanges) {
        // Apply the changes returned by the updater
        this.updateState(newStateChanges);

        // Ensure loading is true while streaming actively, unless it was an error
        if (sectionName !== "fragmentError") {
          this.setLoading(true); // Use setLoading to handle notification
        }
      }
    } else {
      console.warn(`[Lite Lingo State] Unknown section name: "${sectionName}"`);
    }
  }
}
