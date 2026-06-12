import React from 'react';

const OutputPanel = ({ output, isRunning, onClose }) => {
  if (!output && !isRunning) return null;

  const hasError = output?.stderr && output.stderr.trim().length > 0;
  const hasOutput = output?.stdout && output.stdout.trim().length > 0;
  const exitCode = output?.code;
  const isSuccess = exitCode === 0;

  return (
    <div className="outputPanel">
      <div className="outputHeader">
        <div className="outputTitleRow">
          <span className="outputTitle">Output</span>
          {output && !isRunning && (
            <span className={`exitBadge ${isSuccess && !hasError ? 'exitSuccess' : 'exitError'}`}>
              {isSuccess && !hasError ? '✓ Passed' : `✗ Exit ${exitCode}`}
            </span>
          )}
        </div>
        <button className="outputClose" onClick={onClose} title="Close output">✕</button>
      </div>

      <div className="outputBody">
        {isRunning && (
          <div className="outputRunning">
            <span className="runningDot" />
            <span className="runningDot" />
            <span className="runningDot" />
            <span className="runningText">Running…</span>
          </div>
        )}

        {!isRunning && output && (
          <>
            {hasOutput && (
              <div className="outputSection">
                <span className="outputSectionLabel stdout">stdout</span>
                <pre className="outputPre">{output.stdout}</pre>
              </div>
            )}
            {hasError && (
              <div className="outputSection">
                <span className="outputSectionLabel stderr">stderr</span>
                <pre className="outputPre error">{output.stderr}</pre>
              </div>
            )}
            {!hasOutput && !hasError && (
              <div className="outputEmpty">No output produced.</div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default OutputPanel;
