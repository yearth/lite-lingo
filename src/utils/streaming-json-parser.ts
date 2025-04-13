import { DictionaryData } from "@/types/dictionary";
import { AnalysisInfoPayload } from "@/types/messaging";

// Define the expected structure for type safety (optional but helpful)
interface TargetJsonStructure {
  analysisInfo?: AnalysisInfoPayload;
  context?: {
    word_translation?: string;
    explanation?: string;
  };
  // Expect definitions to be an array now
  dictionary?: Omit<DictionaryData, 'definitions'> & {
      definitions?: Array<{ // Array of objects
          pos?: string; // Assuming pos is part of the definition object
          definition?: string;
          example?: string;
      }>;
  };
  translationResult?: string;
  fragmentError?: string;
}

// Define callback types - Update for array index
interface ParserCallbacks {
  // Callbacks for non-streaming fields (called when value fully parsed)
  onAnalysisInfo: (data: AnalysisInfoPayload) => void;
  onContextWordTranslation: (text: string) => void;
  onDictionaryWord: (text: string) => void;
  onDictionaryPhonetic: (text: string) => void;
  onDictionaryDefinitionPos: (index: number, pos: string) => void; // Added for non-streamed POS
  // Callbacks for streaming fields (called char by char)
  onContextExplanationChar: (char: string) => void;
  onDictionaryDefinitionChar: (index: number, char: string) => void; // Added index
  onDictionaryExampleChar: (index: number, char: string) => void; // Added index
  onTranslationResultChar: (char: string) => void;
  onFragmentErrorChar: (char: string) => void;
  // General callbacks
  onComplete: (result: TargetJsonStructure) => void;
  onError: (error: Error) => void;
}

enum State {
  BEFORE_START,
  EXPECT_TOP_KEY_OR_END, // Expecting top-level key or '}'
  INSIDE_KEY_STRING,
  EXPECT_COLON,
  EXPECT_VALUE,
  INSIDE_STRING_VALUE,
  EXPECT_ARRAY_VALUE_OR_END, // New state for arrays
  // TODO: Add states for numbers, booleans, null if needed
  AFTER_VALUE, // Expecting comma or '}' or ']'
}

export class StreamingJsonParser {
  private state: State = State.BEFORE_START;
  private callbacks: ParserCallbacks;
  private fullBuffer = "";
  private currentStringValue: string | null = null;
  private currentKey: string | null = null;
  private isEscaped = false;
  private stack: ('object' | 'array')[] = []; // Stack now tracks object or array context
  private currentPath: (string | number)[] = []; // Path can contain string keys or number indices
  private currentStreamingPath: string | null = null; // Still tracks the string path being streamed

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
      this.reset();
    }
  }

  public finalize(): void {
     console.log("[StreamingJsonParser] Finalizing...");
     if (this.state !== State.AFTER_VALUE && this.state !== State.BEFORE_START) {
         // Allow final state only after root value or before start
         this.callbacks.onError(new Error(`Unexpected end of JSON stream in state: ${this.state}`));
         return;
     }
     if (this.stack.length > 0) {
         this.callbacks.onError(new Error("Unexpected end of JSON stream: Unclosed objects/arrays."));
         return;
     }
     try {
         console.log("[StreamingJsonParser] Final buffer:", this.fullBuffer);
         const finalResult = JSON.parse(this.fullBuffer || "{}");
         console.log("[StreamingJsonParser] Final parsed object:", finalResult);

         if (finalResult.analysisInfo && typeof this.callbacks.onAnalysisInfo === 'function') {
             this.callbacks.onAnalysisInfo(finalResult.analysisInfo);
         }
         // Non-streamed fields within dictionary definitions (like 'pos') are handled in handleCompleteValue

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
        let appendChar = char;
        if (char === 'n') appendChar = '\n';
        else if (char === 't') appendChar = '\t';
        // TODO: Handle more escapes

        this.currentStringValue += appendChar;
        this.streamCharIfNeeded(appendChar);
        this.isEscaped = false;
      } else if (char === '\\') {
        this.isEscaped = true;
      } else if (char === '"') {
        this.state = State.AFTER_VALUE;
        this.handleCompleteValue(this.currentStringValue);
        this.currentStringValue = null;
        this.currentStreamingPath = null;
      } else {
        this.currentStringValue += char;
        this.streamCharIfNeeded(char);
      }
      return;
    }

    // --- Key String State Handling ---
     if (this.state === State.INSIDE_KEY_STRING) {
      if (this.isEscaped) {
        this.currentStringValue += char;
        this.isEscaped = false;
      } else if (char === '\\') {
        this.isEscaped = true;
      } else if (char === '"') {
        this.state = State.EXPECT_COLON;
        this.currentKey = this.currentStringValue;
        // Path is pushed only when value starts (in EXPECT_COLON)
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
          this.currentPath = [];
        } else {
          throw new Error(`Invalid JSON start: Expected '{', got '${char}'`);
        }
        break;

      case State.EXPECT_TOP_KEY_OR_END: // Handles keys or '}' in objects
        if (char === '"') {
          this.state = State.INSIDE_KEY_STRING;
          this.currentStringValue = "";
        } else if (char === '}') {
          if (this.stack.pop() !== 'object') throw new Error("Mismatched '}'");
          this.state = State.AFTER_VALUE;
          if (this.currentPath.length > 0) this.currentPath.pop(); // Pop object key from path
          console.log(`[StreamingJsonParser] Closed object. Path: ${this.currentPath.join('.')}`);
        } else {
          throw new Error(`Expected key string or '}' in state ${this.state}, got '${char}'`);
        }
        break;

      case State.EXPECT_COLON:
        if (char === ':') {
          this.state = State.EXPECT_VALUE;
          this.currentPath.push(this.currentKey!); // Push key now
          console.log(`[StreamingJsonParser] Expecting value for key: "${this.currentKey}", Path: ${this.currentPath.join('.')}`);
        } else {
          throw new Error(`Expected ':' after key "${this.currentKey}", got '${char}'`);
        }
        break;

      case State.EXPECT_VALUE: // Expecting the start of a value
        this.currentStreamingPath = null;
        if (char === '"') {
          this.state = State.INSIDE_STRING_VALUE;
          this.currentStringValue = "";
          this.determineStreamingPath(); // Check if this path needs streaming
        } else if (char === '{') {
          this.state = State.EXPECT_TOP_KEY_OR_END;
          this.stack.push('object');
          // Path already includes the key for this new object
        } else if (char === '[') { // <<<--- Handle Array Start
            this.state = State.EXPECT_ARRAY_VALUE_OR_END;
            this.stack.push('array');
            this.currentPath.push(0); // Start with index 0
            console.log(`[StreamingJsonParser] Started array. Path: ${this.currentPath.join('.')}`);
        }
        // TODO: Handle number, true, false, null starts
        else {
          throw new Error(`Expected value start (", {, [ etc.), got '${char}'`);
        }
        break;

       case State.EXPECT_ARRAY_VALUE_OR_END: // Inside an array
          if (char === ']') { // End of Array
              if (this.stack.pop() !== 'array') throw new Error("Mismatched ']'");
              this.currentPath.pop(); // Pop index
              this.currentPath.pop(); // Pop array key
              this.state = State.AFTER_VALUE;
              console.log(`[StreamingJsonParser] Closed array. Path: ${this.currentPath.join('.')}`);
          } else {
              // Expecting a value within the array
              this.state = State.EXPECT_VALUE; // Go back to expecting a value
              this.processChar(char); // Re-process the character in the new state
          }
          break;

      case State.AFTER_VALUE: // After a value, expecting ',', '}', or ']'
        const currentContext = this.stack[this.stack.length - 1];
        if (char === ',') {
           // Don't pop path here for array! The index is the last element.
           if (currentContext === 'object') {
               this.currentPath.pop(); // Pop the key of the completed value
               this.state = State.EXPECT_TOP_KEY_OR_END; // Expect next key
               this.currentKey = null;
           } else if (currentContext === 'array') {
               // Path already points to the index of the completed element. Increment it.
               const lastIndex = this.currentPath.length - 1;
               if (typeof this.currentPath[lastIndex] === 'number') {
                   (this.currentPath[lastIndex] as number)++; // Increment array index
                   this.state = State.EXPECT_ARRAY_VALUE_OR_END; // Expect next value
                   console.log(`[StreamingJsonParser] Next array element. Path: ${this.currentPath.join('.')}`);
               } else {
                   throw new Error("Invalid path state: Expected number index at the end of path in array context after comma.");
               }
           } else {
                throw new Error("Comma found outside of object or array context");
           }
        } else if (char === '}') {
           if (currentContext !== 'object') throw new Error("Mismatched '}'");
           this.stack.pop(); // Pop 'object' context
           this.currentPath.pop(); // Pop key of the value/structure just finished
           this.state = State.AFTER_VALUE; // Still need comma or end of parent
           // The key/index of the object itself will be popped by the next comma or closing bracket
           console.log(`[StreamingJsonParser] Closed object. Path now points to container: ${this.currentPath.join('.')}`);
        } else if (char === ']') {
            if (currentContext !== 'array') throw new Error("Mismatched ']'");
            this.stack.pop(); // Pop 'array' context
            this.currentPath.pop(); // Pop index of the value/structure just finished
            this.state = State.AFTER_VALUE; // Still need comma or end of parent
            // The key of the array itself will be popped by the next comma or closing bracket
            console.log(`[StreamingJsonParser] Closed array. Path now points to container: ${this.currentPath.join('.')}`);
        }
        else {
          throw new Error(`Expected ',', '}', or ']' after value, got '${char}'`);
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
      if (currentFullPath === 'context.word_translation') {
          this.callbacks.onContextWordTranslation(value);
      } else if (currentFullPath === 'dictionary.word') {
          this.callbacks.onDictionaryWord(value);
      } else if (currentFullPath === 'dictionary.phonetic') {
          this.callbacks.onDictionaryPhonetic(value);
      } else if (currentFullPath.match(/^dictionary\.definitions\.\d+\.pos$/)) { // Handle 'pos' within array element
          const match = currentFullPath.match(/^dictionary\.definitions\.(\d+)\.pos$/);
          if (match && match[1]) {
              const index = parseInt(match[1], 10);
              this.callbacks.onDictionaryDefinitionPos(index, value);
          }
      }
      // analysisInfo, context object, dictionary object are handled by onComplete
  }

  // Determines if the current path corresponds to a field that should be streamed
  private determineStreamingPath(): void {
      const path = this.currentPath.join('.');
      if (path === 'translationResult' || path === 'context.explanation' || path === 'fragmentError' ||
          path.match(/^dictionary\.definitions\.\d+\.definition$/) || // Match definition inside array
          path.match(/^dictionary\.definitions\.\d+\.example$/)) {    // Match example inside array
          this.currentStreamingPath = path;
          console.log(`[StreamingJsonParser] Starting stream for path: ${this.currentStreamingPath}`);
      } else {
          this.currentStreamingPath = null;
      }
  }

  // Routes character to the correct streaming callback based on current path and index
  private streamCharIfNeeded(char: string): void {
      if (!this.currentStreamingPath) return;

      // Extract index if path is within the definitions array
      let index = -1;
      const definitionMatch = this.currentStreamingPath.match(/^dictionary\.definitions\.(\d+)\.definition$/);
      const exampleMatch = this.currentStreamingPath.match(/^dictionary\.definitions\.(\d+)\.example$/);

      if (definitionMatch && definitionMatch[1]) {
          index = parseInt(definitionMatch[1], 10);
          this.callbacks.onDictionaryDefinitionChar(index, char);
      } else if (exampleMatch && exampleMatch[1]) {
          index = parseInt(exampleMatch[1], 10);
          this.callbacks.onDictionaryExampleChar(index, char);
      } else if (this.currentStreamingPath === 'translationResult') {
          this.callbacks.onTranslationResultChar(char);
      } else if (this.currentStreamingPath === 'context.explanation') {
          this.callbacks.onContextExplanationChar(char);
      } else if (this.currentStreamingPath === 'fragmentError') {
          this.callbacks.onFragmentErrorChar(char);
      }
  }
}
