import { runReferenceFunction } from "./tasks";
import { parseInputValue } from "./utils";

interface CalculateOptions {
  inputs: string[];
  taskId: number;
  onResult: (output: string) => void;
  onError: (message: string) => void;
  onFinally: () => void;
}

/**
 * Run the reference function for a task with the given inputs.
 * Uses requestAnimationFrame to allow UI to show loading state.
 */
export function calculateResult({
  inputs,
  taskId,
  onResult,
  onError,
  onFinally,
}: CalculateOptions): void {
  requestAnimationFrame(() => {
    try {
      const parsedInputs = inputs.map(parseInputValue);
      const { result, error } = runReferenceFunction(taskId, parsedInputs);
      if (error) {
        onError(error);
      } else {
        const output = typeof result === "object" ? JSON.stringify(result) : String(result);
        onResult(output);
      }
    } catch {
      onError("Computation error");
    } finally {
      onFinally();
    }
  });
}
