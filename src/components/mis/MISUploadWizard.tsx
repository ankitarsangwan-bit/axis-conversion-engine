import { FileUploadZone } from './FileUploadZone';
import { ColumnMapper } from './ColumnMapper';
import { ValidationResults } from './ValidationResults';
import { ChangePreview } from './ChangePreview';
import { UploadComplete } from './UploadComplete';
import { useMISUpload } from '@/hooks/useMISUpload';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const STEPS = [
  { key: 'upload', label: 'Upload' },
  { key: 'mapping', label: 'Mapping' },
  { key: 'validation', label: 'Validate' },
  { key: 'preview', label: 'Preview' },
  { key: 'complete', label: 'Complete' },
] as const;

export function MISUploadWizard() {
  const {
    state,
    reset,
    setStep,
    parseFile,
    updateColumnMapping,
    validateData,
    generatePreview,
    applyChanges,
  } = useMISUpload();

  const currentStepIndex = STEPS.findIndex(s => s.key === state.step);

  return (
    <div className="space-y-4">
      {/* Progress Steps */}
      <div className="flex items-center justify-between px-2">
        {STEPS.map((step, idx) => {
          const isActive = state.step === step.key;
          const isComplete = idx < currentStepIndex;
          const isDisabled = idx > currentStepIndex;

          return (
            <div key={step.key} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    'w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-colors',
                    isActive && 'bg-primary text-primary-foreground',
                    isComplete && 'bg-success text-success-foreground',
                    isDisabled && 'bg-muted text-muted-foreground'
                  )}
                >
                  {isComplete ? '✓' : idx + 1}
                </div>
                <span className={cn(
                  'text-[10px] mt-1',
                  isActive && 'text-primary font-medium',
                  isComplete && 'text-success',
                  isDisabled && 'text-muted-foreground'
                )}>
                  {step.label}
                </span>
              </div>
              {idx < STEPS.length - 1 && (
                <div
                  className={cn(
                    'w-12 h-0.5 mx-2',
                    idx < currentStepIndex ? 'bg-success' : 'bg-muted'
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      <div className="min-h-[400px]">
        {state.step === 'upload' && (
          <FileUploadZone
            onFileSelect={parseFile}
            isProcessing={state.isProcessing}
            error={state.error}
          />
        )}

        {state.step === 'mapping' && state.parsedFile && (
          <ColumnMapper
            parsedFile={state.parsedFile}
            columnMappings={state.columnMappings}
            onUpdateMapping={updateColumnMapping}
            onValidate={validateData}
            onBack={reset}
          />
        )}

        {state.step === 'validation' && state.validationResult && (
          <ValidationResults
            validationResult={state.validationResult}
            onPreview={generatePreview}
            onBack={() => setStep('mapping')}
          />
        )}

        {state.step === 'preview' && state.changePreview && (
          <ChangePreview
            changePreview={state.changePreview}
            onApply={applyChanges}
            onBack={() => setStep('validation')}
            isProcessing={state.isProcessing}
          />
        )}

        {state.step === 'complete' && state.changePreview && (
          <UploadComplete
            changePreview={state.changePreview}
            onReset={reset}
          />
        )}
      </div>
    </div>
  );
}
