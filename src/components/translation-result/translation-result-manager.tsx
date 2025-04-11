import { AnalysisInfoPayload } from "@/types/messaging"; // Import V2 type
import * as ReactDOM from "react-dom/client";
// Dictionary types are now primarily used within TranslationState
import { TranslationResult } from "./translation-result"; // Import the component and its props type
import { TranslationState } from "./translation-state"; // Import the new state manager

/**
 * 翻译结果管理器
 * 用于管理翻译结果的创建、显示和隐藏
 */
export class TranslationResultManager {
  private container: HTMLDivElement | null = null;
  private root: ReactDOM.Root | null = null; // Use specific type ReactDOM.Root
  private isInitialized: boolean = false;
  private stateManager: TranslationState; // Instance of the state manager

  // UI-specific state managed directly by the Manager
  private isVisible: boolean = false;
  private position: Range | null = null;

  constructor() {
    this.stateManager = new TranslationState();
    // Subscribe to state changes to trigger re-renders
    this.stateManager.setOnChange(() => {
      // Only render if the component is currently visible
      if (this.isVisible) {
        this.renderComponent();
      }
    });
  }

  public init(): void {
    if (this.isInitialized) {
      return;
    }
    this.container = document.createElement("div");
    this.container.id = "lite-lingo-translation-container";
    if (!document.getElementById(this.container.id)) {
      document.body.appendChild(this.container);
    }
    this.root = ReactDOM.createRoot(this.container);
    this.renderComponent(); // Initial render (hidden)
    this.isInitialized = true;
  }

  // --- Public Methods ---

  // Update show method to accept Range for positioning
  public show(
    text: string,
    originalText: string,
    position: Range, // Changed from { x: number; y: number }
    isLoading: boolean = false,
    onSpeech?: (text: string) => void
  ): void {
    // Reset data state via state manager (reset clears originalText too)
    this.stateManager.reset();
    // Set initial data if provided
    // Don't call setAnalysisInfo here as inputType is missing.
    // originalText will be set via the public setAnalysisInfo method when available.
    // For now, if we need originalText immediately, we might need to pass it to reset or updateState directly.
    // Let's assume originalText is primarily set via setAnalysisInfo externally.
    // We still need to set the initial translation text if provided.
    if (text) {
      this.stateManager.updateSection("translationResult", text); // Set initial translation text
    }
    // We might need to explicitly set originalText if it's needed before setAnalysisInfo is called.
    this.stateManager.setOriginalText(originalText); // Use the new public method

    this.stateManager.setLoading(isLoading);
    this.stateManager.setSpeechHandler(onSpeech);

    // Update Manager's UI state
    this.position = position;
    this.isVisible = true;

    // Trigger initial render
    this.renderComponent();
  }

  public hide(): void {
    if (!this.isInitialized || !this.isVisible) return; // Check manager's isVisible
    console.log("[Lite Lingo] Hiding translation result");

    // Update Manager's UI state
    this.isVisible = false;
    this.position = null;

    // Reset data state via state manager
    this.stateManager.reset(); // Reset data for next time

    // Render one last time to ensure component is unmounted/hidden by React
    this.renderComponent();
  }

  // Delegate setLoading to state manager
  public setLoading(isLoading: boolean): void {
    if (!this.isInitialized || !this.isVisible) return;
    this.stateManager.setLoading(isLoading);
  }

  private renderComponent(): void {
    if (!this.root) {
      console.error(
        "[Lite Lingo] Error: Translation result React root not initialized."
      );
      return;
    }

    // Get data state from the state manager
    const dataState = this.stateManager.getState();

    // console.log( // Reduce log verbosity
    //   "[Lite Lingo] Rendering TranslationResult with state:",
    //   { ...dataState, isVisible: this.isVisible, position: this.position }
    // );

    // Combine data state with Manager's UI state for rendering
    this.root.render(
      <TranslationResult
        {...dataState} // Spread data state (text, originalText, explanation, etc.)
        position={this.position} // Pass position from Manager
        isVisible={this.isVisible} // Pass visibility from Manager
        // isLoading is now part of dataState
        onClose={() => this.hide()} // Pass internal hide method
        // onSpeech is now part of dataState
      />
    );
  }

  // --- V2 Streaming Methods (Delegated) ---

  // No public reset needed, handled internally by show/hide

  // Delegate setAnalysisInfo to state manager
  public setAnalysisInfo(info: AnalysisInfoPayload): void {
    if (!this.isInitialized || !this.isVisible) return;
    this.stateManager.setAnalysisInfo(info);
  }

  // Delegate updateSection to state manager
  public updateSection(sectionName: string, textChunk: string): void {
    if (!this.isInitialized || !this.isVisible) return;
    this.stateManager.updateSection(sectionName, textChunk);
  }

  // Delegate showError to state manager, but ensure visibility
  public showError(errorMessage: string): void {
    if (!this.isInitialized) return; // Can show error even if not visible yet

    // Ensure the UI becomes visible to show the error
    this.isVisible = true;
    // Position might be null if error occurs before show, handle gracefully in TranslationResult if needed

    this.stateManager.showError(errorMessage);
    // stateManager's onChange will trigger renderComponent if needed
  }

  // --- Methods to set specific state parts (delegated) ---
  public setContext(context: { word_translation?: string; explanation?: string } | null): void {
    if (!this.isInitialized || !this.isVisible) return;
    this.stateManager.setContext(context);
  }

  public setDictionary(dictionary: any | null): void { // Use 'any' for now, refine if DictionaryData type is available
    if (!this.isInitialized || !this.isVisible) return;
    this.stateManager.setDictionary(dictionary);
  }

  public setTranslationResult(text: string): void {
    if (!this.isInitialized || !this.isVisible) return;
    this.stateManager.setTranslationResult(text);
  }

  public setFragmentError(errorText: string): void {
    if (!this.isInitialized || !this.isVisible) return;
    this.stateManager.setFragmentError(errorText);
  }

  // --- Methods to append text chunks (delegated) ---
  public appendText(chunk: string): void {
    if (!this.isInitialized || !this.isVisible) return;
    this.stateManager.appendText(chunk);
  }

  public appendContextExplanation(chunk: string): void {
     if (!this.isInitialized || !this.isVisible) return;
    this.stateManager.appendContextExplanation(chunk);
  }

  public appendDictionaryDefinition(chunk: string): void {
     if (!this.isInitialized || !this.isVisible) return;
    this.stateManager.appendDictionaryDefinition(chunk);
  }

  public appendDictionaryExample(chunk: string): void {
     if (!this.isInitialized || !this.isVisible) return;
    this.stateManager.appendDictionaryExample(chunk);
  }

   // Methods to reset streamed fields at the beginning
   public setDictionaryDefinition(text: string): void {
     if (!this.isInitialized || !this.isVisible) return;
     this.stateManager.setDictionaryDefinition(text);
   }

   public setDictionaryExample(text: string): void {
      if (!this.isInitialized || !this.isVisible) return;
     this.stateManager.setDictionaryExample(text);
   }

  // --- End V2 Streaming Methods ---

  public getContainer(): HTMLElement | null {
    return this.container;
  }

  public cleanup(): void {
    if (this.root) {
      this.root.unmount();
      this.root = null;
    }
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
      this.container = null;
    }
    this.isInitialized = false;
  }
}
