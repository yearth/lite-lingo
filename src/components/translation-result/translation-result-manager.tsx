import * as ReactDOM from "react-dom/client";
import {
  DictionaryData,
  DictionaryDefinition,
  DictionaryExample,
} from "../../types/dictionary"; // Relative path from new location
import {
  TranslationResult,
  TranslationResultProps,
} from "./translation-result"; // Import the component and its props type

/**
 * 翻译结果管理器
 * 用于管理翻译结果的创建、显示和隐藏
 */
export class TranslationResultManager {
  private container: HTMLDivElement | null = null;
  private root: ReactDOM.Root | null = null; // Use specific type ReactDOM.Root
  private isInitialized: boolean = false;

  // Store the props needed by TranslationResult component
  private currentProps: Omit<TranslationResultProps, "onClose"> & {
    position: { x: number; y: number };
  } = {
    text: "",
    originalText: "",
    position: { x: 0, y: 0 },
    isVisible: false,
    isLoading: false,
    contextExplanation: null,
    dictionaryData: null,
    onSpeech: undefined,
  };

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

  public show(
    text: string,
    originalText: string,
    position: { x: number; y: number },
    isLoading: boolean = false,
    onSpeech?: (text: string) => void
  ): void {
    this.currentProps = {
      ...this.currentProps,
      text: text,
      originalText: originalText,
      position: position,
      isVisible: true,
      isLoading: isLoading,
      contextExplanation: null,
      dictionaryData: null,
      onSpeech: onSpeech,
    };
    this.renderComponent();
  }

  public update(text: string, isLoading: boolean = false): void {
    if (!this.isInitialized || !this.currentProps.isVisible) return;
    console.log("[Lite Lingo] Updating main translation text", {
      text,
      isLoading,
    });
    this.currentProps = { ...this.currentProps, text, isLoading };
    this.renderComponent();
  }

  public updateContextExplanation(explanation: string): void {
    if (!this.isInitialized || !this.currentProps.isVisible) return;
    console.log("[Lite Lingo] Updating context explanation", { explanation });
    this.currentProps = {
      ...this.currentProps,
      contextExplanation: explanation,
      isLoading: true,
    };
    this.renderComponent();
  }

  public startDictionary(data: DictionaryData): void {
    if (!this.isInitialized || !this.currentProps.isVisible) return;
    console.log("[Lite Lingo] Starting dictionary", data);
    this.currentProps = {
      ...this.currentProps,
      dictionaryData: { ...data, definitions: [] },
      isLoading: true,
    };
    this.renderComponent();
  }

  public addDefinition(
    definitionData: Omit<DictionaryDefinition, "examples">
  ): void {
    if (!this.isInitialized || !this.currentProps.dictionaryData) {
      console.warn(
        "[Lite Lingo] Cannot add definition: No active dictionary or not initialized."
      );
      return;
    }
    console.log("[Lite Lingo] Adding definition", definitionData);
    if (!this.currentProps.dictionaryData.definitions) {
      this.currentProps.dictionaryData.definitions = [];
    }
    this.currentProps.dictionaryData.definitions.push({
      ...definitionData,
      examples: [],
    });
    this.renderComponent();
  }

  public addExample(exampleData: DictionaryExample): void {
    if (
      !this.isInitialized ||
      !this.currentProps.dictionaryData ||
      this.currentProps.dictionaryData.definitions.length === 0
    ) {
      console.warn(
        "[Lite Lingo] Cannot add example: No active definition or not initialized."
      );
      return;
    }
    console.log("[Lite Lingo] Adding example", exampleData);
    const lastDefinition =
      this.currentProps.dictionaryData.definitions[
        this.currentProps.dictionaryData.definitions.length - 1
      ];
    if (!lastDefinition.examples) {
      lastDefinition.examples = [];
    }
    lastDefinition.examples.push(exampleData);
    this.renderComponent();
  }

  public endDictionary(): void {
    if (!this.isInitialized) return;
    console.log("[Lite Lingo] Ending dictionary section");
    this.renderComponent();
  }

  public hide(): void {
    if (!this.isInitialized) return;
    console.log("[Lite Lingo] Hiding translation result");
    if (this.currentProps.isVisible) {
      this.currentProps = {
        ...this.currentProps,
        text: "",
        originalText: "",
        isVisible: false,
        isLoading: false,
        contextExplanation: null,
        dictionaryData: null,
        onSpeech: undefined,
      };
      this.renderComponent();
    }
  }

  public setLoading(isLoading: boolean): void {
    if (!this.isInitialized || !this.currentProps.isVisible) return;
    console.log("[Lite Lingo] Setting loading state", { isLoading });
    if (this.currentProps.isLoading === isLoading) return;
    this.currentProps = { ...this.currentProps, isLoading };
    this.renderComponent();
  }

  private renderComponent(): void {
    if (!this.root) {
      console.error(
        "[Lite Lingo] Error: Translation result React root not initialized."
      );
      return;
    }
    console.log(
      "[Lite Lingo] Rendering TranslationResult with props:",
      this.currentProps
    );
    this.root.render(
      <TranslationResult
        text={this.currentProps.text}
        originalText={this.currentProps.originalText}
        position={this.currentProps.position}
        isVisible={this.currentProps.isVisible}
        isLoading={this.currentProps.isLoading}
        contextExplanation={this.currentProps.contextExplanation}
        dictionaryData={this.currentProps.dictionaryData}
        onClose={() => this.hide()} // Pass internal hide method
        onSpeech={this.currentProps.onSpeech}
      />
    );
  }

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
