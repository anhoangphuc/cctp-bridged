import { useState, useCallback } from 'react';

export type StepStatus = 'pending' | 'processing' | 'success' | 'error';

export interface StepState {
  status: StepStatus;
  txHash?: string;
  error?: string;
  attestation?: string;
  messageHash?: string;
}

export type BridgeSteps = Record<string, StepState>;

interface UseBridgeStepsReturn {
  steps: BridgeSteps;
  updateStep: (stepName: string, update: Partial<StepState>) => void;
  setStepProcessing: (stepName: string) => void;
  setStepSuccess: (stepName: string, data?: Partial<StepState>) => void;
  setStepError: (stepName: string, error: string) => void;
  resetSteps: () => void;
  isStepComplete: (stepName: string) => boolean;
  canProceedToStep: (stepName: string, previousSteps: string[]) => boolean;
}

/**
 * Hook to manage bridge transaction steps state
 * Provides utilities to update step status and check progress
 *
 * @param initialSteps - Initial step configuration (e.g., { approve: { status: 'pending' } })
 */
export function useBridgeSteps(initialSteps: BridgeSteps): UseBridgeStepsReturn {
  const [steps, setSteps] = useState<BridgeSteps>(initialSteps);

  /**
   * Update a specific step with partial data
   */
  const updateStep = useCallback((stepName: string, update: Partial<StepState>) => {
    setSteps(prev => ({
      ...prev,
      [stepName]: {
        ...prev[stepName],
        ...update,
      },
    }));
  }, []);

  /**
   * Set a step to processing status
   */
  const setStepProcessing = useCallback((stepName: string) => {
    updateStep(stepName, { status: 'processing', error: undefined });
  }, [updateStep]);

  /**
   * Set a step to success status with optional data
   */
  const setStepSuccess = useCallback((stepName: string, data?: Partial<StepState>) => {
    updateStep(stepName, { status: 'success', error: undefined, ...data });
  }, [updateStep]);

  /**
   * Set a step to error status with error message
   */
  const setStepError = useCallback((stepName: string, error: string) => {
    updateStep(stepName, { status: 'error', error });
  }, [updateStep]);

  /**
   * Reset all steps to initial state
   */
  const resetSteps = useCallback(() => {
    setSteps(initialSteps);
  }, [initialSteps]);

  /**
   * Check if a step is complete (status === 'success')
   */
  const isStepComplete = useCallback((stepName: string): boolean => {
    return steps[stepName]?.status === 'success';
  }, [steps]);

  /**
   * Check if we can proceed to a step (all previous steps must be complete)
   */
  const canProceedToStep = useCallback((stepName: string, previousSteps: string[]): boolean => {
    // If no previous steps, can always proceed
    if (previousSteps.length === 0) return true;

    // Check if all previous steps are complete
    return previousSteps.every(prevStep => isStepComplete(prevStep));
  }, [isStepComplete]);

  return {
    steps,
    updateStep,
    setStepProcessing,
    setStepSuccess,
    setStepError,
    resetSteps,
    isStepComplete,
    canProceedToStep,
  };
}
