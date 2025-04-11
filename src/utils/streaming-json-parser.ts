import { DictionaryData } from "@/types/dictionary"; // Re-adding this type
import { AnalysisInfoPayload } from "@/types/messaging";

// Define the expected structure for type safety (optional but helpful)
interface TargetJsonStructure {
  analysisInfo?: AnalysisInfoPayload;
  context?: {
    word_translation?: string;
    explanation?: string;
  };
  dictionary?: DictionaryData; // Use the imported type
  translationResult?: string;
  fragmentError?: string;
}

// Define callback types
interface ParserCallbacks {
  // Callbacks for non-streaming fields (called when value fully parsed)
  onAnalysisInfo: (data: AnalysisInfoPayload) => void; // Assuming this is non-streaming for now
  onContextWordTranslation: (text: string) => void;
  onDictionaryWord: (text: string) => void;
  onDictionaryPhonetic: (text: string) => void;
  // Callbacks for streaming fields (called char by char)
  onContextExplanationChar: (char: string) => void;
  onDictionaryDefinitionChar: (char: string) => void; // Simplified path for now
  onDictionaryExampleChar: (char: string) => void; // Simplified path for now
  onTranslationResultChar: (char: string) => void;
  onFragmentErrorChar: (char: string) => void;
  // General callbacks
  onComplete: (result: TargetJsonStructure) => void;
  onError: (error: Error) => void;
}

enum State {
  BEFORE_START,
  EXPECT_TOP_KEY_OR_END, // Expecting top-level key or '}' (Handles nested objects too)
  INSIDE_KEY_STRING,
  EXPECT_COLON,
  EXPECT_VALUE,
  INSIDE_STRING_VALUE,
  // TODO: Add states for numbers, booleans, null if needed
  AFTER_VALUE, // Expecting comma or '}'
}

export class StreamingJsonParser {
  private state: State = State.BEFORE_START;
  private callbacks: ParserCallbacks;
  private fullBuffer = ""; // Accumulates the entire JSON string
  private currentStringValue: string | null = null; // Accumulates current string value
  private currentKey: string | null = null; // Last parsed key
  private isEscaped = false;
  private stack: ('object')[] = []; // Simplified stack for object nesting only
  private currentPath: string[] = []; // e.g., ['dictionary', 'definitions', 'definition']
  private currentStreamingPath: string | null = null; // Tracks the path whose string value is being streamed

  constructor(callbacks: ParserCallbacks) {
    this.callbacks = callbacks;
  }

  public reset(): void {
    this.state = State.BEFORE_START;
    this.fullBuffer = "";
    this.currentStringValue = null;
    this.currentKey = null;
    this.isEscaped = false;
    this.stack = [];
    this.currentPath = [];
    this.currentStreamingPath = null;
    console.log("[StreamingJsonParser] Reset.");
  }

  public processChunk(chunk: string): void {
    try {
      for (const char of chunk) {
        this.processChar(char);
      }
    } catch (error: any) {
      console.error("[StreamingJsonParser] Processing error:", error);
      this.callbacks.onError(error instanceof Error ? error : new Error(String(error)));
      this.reset(); // Reset on error
    }
  }

  public finalize(): void {
     console.log("[StreamingJsonParser] Finalizing...");
     // Allow final state to be AFTER_VALUE (after root object) or BEFORE_START (empty input)
     if (this.state !== State.AFTER_VALUE && this.state !== State.BEFORE_START) {
         this.callbacks.onError(new Error(`Unexpected end of JSON stream in state: ${this.state}`));
         return;
     }
     if (this.stack.length > 0) {
         this.callbacks.onError(new Error("Unexpected end of JSON stream: Unclosed objects."));
         return;
     }
     try {
         console.log("[StreamingJsonParser] Final buffer:", this.fullBuffer);
         const finalResult = JSON.parse(this.fullBuffer || "{}"); // Handle empty input case
         console.log("[StreamingJsonParser] Final parsed object:", finalResult);

         // Callbacks for non-streamed fields (if not handled earlier)
         if (finalResult.analysisInfo && typeof this.callbacks.onAnalysisInfo === 'function') {
             this.callbacks.onAnalysisInfo(finalResult.analysisInfo);
         }
         // Other non-streamed fields like dictionary word/phonetic are handled in handleCompleteValue

         // Call the main onComplete callback
         this.callbacks.onComplete(finalResult);
     } catch (error: any) {
         console.error("[StreamingJsonParser] Final JSON parsing error:", error);
         this.callbacks.onError(new Error(`Final JSON parsing failed: ${error.message}`));
     } finally {
         this.reset();
     }
  }


  private processChar(char: string): void {
    this.fullBuffer += char;

    // --- String State Handling ---
    if (this.state === State.INSIDE_STRING_VALUE) {
      if (this.isEscaped) {
        // Handle basic escapes, append the actual character
        let appendChar = char;
        if (char === 'n') appendChar = '\n';
        else if (char === 't') appendChar = '\t';
        // Add more escapes (\r, \b, \f) if needed
        // TODO: Handle unicode escapes (\uXXXX)

        this.currentStringValue += appendChar;
        this.streamCharIfNeeded(appendChar); // Stream the actual character
        this.isEscaped = false;
      } else if (char === '\\') {
        this.isEscaped = true;
        // Don't append the backslash itself
      } else if (char === '"') {
        // End of string value
        this.state = State.AFTER_VALUE;
        this.handleCompleteValue(this.currentStringValue);
        this.currentStringValue = null;
        this.currentStreamingPath = null; // Stop streaming for this path
      } else {
        this.currentStringValue += char;
        // Stream character if applicable path
        this.streamCharIfNeeded(char);
      }
      return;
    }

    // --- Key String State Handling ---
     if (this.state === State.INSIDE_KEY_STRING) {
      if (this.isEscaped) {
        // Keys shouldn't typically contain escapes other than maybe \" or \\
        this.currentStringValue += char;
        this.isEscaped = false;
      } else if (char === '\\') {
        this.isEscaped = true;
      } else if (char === '"') {
        // End of key string
        this.state = State.EXPECT_COLON;
        this.currentKey = this.currentStringValue;
        // Don't push to path yet, wait until value starts
        this.currentStringValue = null;
      } else {
        this.currentStringValue += char;
      }
      return;
    }

    // Ignore whitespace outside strings
    if (/\s/.test(char)) {
      return;
    }

    // --- Other States Handling ---
    switch (this.state) {
      case State.BEFORE_START:
        if (char === '{') {
          this.state = State.EXPECT_TOP_KEY_OR_END;
          this.stack.push('object');
          this.currentPath = []; // Start root path
        } else {
          throw new Error(`Invalid JSON start: Expected '{', got '${char}'`);
        }
        break;

      case State.EXPECT_TOP_KEY_OR_END:
        if (char === '"') {
          this.state = State.INSIDE_KEY_STRING;
          this.currentStringValue = ""; // Start key string accumulation
        } else if (char === '}') {
          if (this.stack.pop() !== 'object') throw new Error("Mismatched '}'");
          this.state = State.AFTER_VALUE; // End of object
          if (this.currentPath.length > 0) this.currentPath.pop(); // Pop object key from path
          console.log(`[StreamingJsonParser] Closed object. Path: ${this.currentPath.join('.')}`);
        } else {
          throw new Error(`Expected key string or '}' in state ${this.state}, got '${char}'`);
        }
        break;

      case State.EXPECT_COLON:
        if (char === ':') {
          this.state = State.EXPECT_VALUE;
          this.currentPath.push(this.currentKey!); // Push key now that we expect its value
          console.log(`[StreamingJsonParser] Expecting value for key: "${this.currentKey}", Path: ${this.currentPath.join('.')}`);
        } else {
          throw new Error(`Expected ':' after key "${this.currentKey}", got '${char}'`);
        }
        break;

      case State.EXPECT_VALUE:
        this.currentStreamingPath = null; // Reset before parsing new value
        if (char === '"') {
          this.state = State.INSIDE_STRING_VALUE;
          this.currentStringValue = "";
          // Determine if this string should be streamed based on path
          const path = this.currentPath.join('.');
          if (path === 'translationResult' || path === 'context.explanation' || path === 'dictionary.definitions.definition' || path === 'dictionary.definitions.example' || path === 'fragmentError') {
              this.currentStreamingPath = path;
              console.log(`[StreamingJsonParser] Starting stream for path: ${this.currentStreamingPath}`);
          }
        } else if (char === '{') {
          this.state = State.EXPECT_TOP_KEY_OR_END; // Expect key or end for nested object
          this.stack.push('object');
          // Path already includes the key for this new object
        }
        // TODO: Handle array '[', number, true, false, null starts
        else {
          throw new Error(`Expected value start (", {, [ etc.), got '${char}'`);
        }
        break;

      case State.AFTER_VALUE:
        if (char === ',') {
           if (this.stack[this.stack.length - 1] === 'object') {
               this.state = State.EXPECT_TOP_KEY_OR_END; // Expect next key
               this.currentPath.pop(); // Value processed, pop its key from path
               this.currentKey = null;
           } else {
               throw new Error("Comma handling for arrays not implemented");
           }
        } else if (char === '}') {
           if (this.stack.pop() !== 'object') throw new Error("Mismatched '}'");
           this.state = State.AFTER_VALUE; // Still need comma or end of parent
           if (this.currentPath.length > 0) this.currentPath.pop(); // Pop key of the closing object
           console.log(`[StreamingJsonParser] Closed object after value. Path: ${this.currentPath.join('.')}`);
        }
        // TODO: Handle ']' if arrays are supported
        else {
          throw new Error(`Expected ',' or '}' after value, got '${char}'`);
        }
        break;

      default:
        throw new Error(`Unhandled parser state: ${this.state}`);
    }
  }

  // Called when a complete value (string, number, object, array, etc.) is parsed
  private handleCompleteValue(value: any): void {
      const currentFullPath = this.currentPath.join('.');
      console.log(`[StreamingJsonParser] Handling complete value for path: ${currentFullPath}`, value);

      // Handle non-streaming fields by calling callbacks with the complete value
      // Only call if the path exactly matches (avoid triggering for streamed fields)
      if (currentFullPath === 'context.word_translation') {
          this.callbacks.onContextWordTranslation(value);
      } else if (currentFullPath === 'dictionary.word') {
          this.callbacks.onDictionaryWord(value);
      } else if (currentFullPath === 'dictionary.phonetic') {
          this.callbacks.onDictionaryPhonetic(value);
      }
      // analysisInfo, context object, dictionary object are handled by onComplete
  }

  // Routes character to the correct streaming callback based on current path
  private streamCharIfNeeded(char: string): void {
      // Use the dedicated streaming path tracker
      if (!this.currentStreamingPath) return;

      // console.log(`[StreamingJsonParser] Streaming char for path: ${this.currentStreamingPath}`); // Verbose

      if (this.currentStreamingPath === 'translationResult') {
          this.callbacks.onTranslationResultChar(char);
      } else if (this.currentStreamingPath === 'context.explanation') {
          this.callbacks.onContextExplanationChar(char);
      } else if (this.currentStreamingPath === 'dictionary.definitions.definition') {
          this.callbacks.onDictionaryDefinitionChar(char);
      } else if (this.currentStreamingPath === 'dictionary.definitions.example') {
          this.callbacks.onDictionaryExampleChar(char);
      } else if (this.currentStreamingPath === 'fragmentError') {
          this.callbacks.onFragmentErrorChar(char);
      }
  }
}
