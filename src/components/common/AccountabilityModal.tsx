import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AlertOctagon, Flame, Copy, Check, ShieldAlert } from 'lucide-react';
import { RaceTemplate } from '../../types/race';
import { formatCutoffTimeDisplay } from '../../utils/dateUtils';

interface AccountabilityModalProps {
  isOpen: boolean;
  targetMessage: string;
  cutoffTime: string;
  pendingTemplates: RaceTemplate[];
  onSubmitApology: (message: string) => void;
}

interface CharToken {
  char: string;
  isSpace: boolean;
  status: 'match' | 'mismatch' | 'current' | 'untyped' | 'space';
  typedChar?: string;
  nonSpaceIndex?: number;
}

interface MatchCalculationResult {
  tokens: CharToken[];
  matchCount: number;
  mismatchCount: number;
  totalTargetNonSpace: number;
  firstMismatch: { expected: string; typed: string; index: number } | null;
  excessChars: string[];
  isExactMatch: boolean;
}

export const AccountabilityModal: React.FC<AccountabilityModalProps> = ({
  isOpen,
  targetMessage,
  cutoffTime,
  pendingTemplates,
  onSubmitApology,
}) => {
  const [inputText, setInputText] = useState('');
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Reset input when modal opens
  useEffect(() => {
    if (isOpen) {
      setInputText('');
      setCopied(false);
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  const trimmedTarget = targetMessage.trim();

  // Extract non-space characters from user input (ignoring spaces)
  const typedNonSpaceChars = useMemo(() => {
    return inputText.replace(/\s/g, '').split('');
  }, [inputText]);

  // Compute character-to-character tokens ignoring spaces
  const { tokens, matchCount, mismatchCount, totalTargetNonSpace, firstMismatch, excessChars, isExactMatch } =
    useMemo<MatchCalculationResult>(() => {
      const targetChars = trimmedTarget.split('');
      const targetNonSpace = targetChars.filter((c) => !/\s/.test(c));
      const totalNonSpace = targetNonSpace.length;

      let nonSpaceCount = 0;
      let matches = 0;
      let mismatches = 0;
      let firstBad: { expected: string; typed: string; index: number } | null = null;

      const tokenList: CharToken[] = targetChars.map((char) => {
        if (/\s/.test(char)) {
          return {
            char,
            isSpace: true,
            status: 'space',
          };
        }

        const currentIdx = nonSpaceCount;
        nonSpaceCount++;

        if (currentIdx < typedNonSpaceChars.length) {
          const typedChar = typedNonSpaceChars[currentIdx];
          const isMatch = typedChar === char;
          if (isMatch) {
            matches++;
          } else {
            mismatches++;
            if (!firstBad) {
              firstBad = { expected: char, typed: typedChar, index: currentIdx + 1 };
            }
          }

          return {
            char,
            isSpace: false,
            status: isMatch ? 'match' : 'mismatch',
            typedChar,
            nonSpaceIndex: currentIdx,
          };
        }

        if (currentIdx === typedNonSpaceChars.length) {
          return {
            char,
            isSpace: false,
            status: 'current',
            nonSpaceIndex: currentIdx,
          };
        }

        return {
          char,
          isSpace: false,
          status: 'untyped',
          nonSpaceIndex: currentIdx,
        };
      });

      const excess = typedNonSpaceChars.slice(totalNonSpace);
      const isMatched =
        totalNonSpace > 0 &&
        matches === totalNonSpace &&
        mismatches === 0 &&
        excess.length === 0;

      return {
        tokens: tokenList,
        matchCount: matches,
        mismatchCount: mismatches,
        totalTargetNonSpace: totalNonSpace,
        firstMismatch: firstBad,
        excessChars: excess,
        isExactMatch: isMatched,
      };
    }, [trimmedTarget, typedNonSpaceChars]);

  if (!isOpen) return null;

  const handleCopyTarget = async () => {
    try {
      await navigator.clipboard.writeText(trimmedTarget);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isExactMatch) return;
    onSubmitApology(inputText.trim());
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="accountability-dialog-title"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
      onKeyDown={(e) => {
        // Explicitly block Escape key to ensure persistence
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
        }
      }}
    >
      <div className="bg-slate-900 border-2 border-rose-600/70 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden my-auto">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-rose-500 to-red-600" />

        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 shrink-0">
            <ShieldAlert className="w-7 h-7 sm:w-8 sm:h-8 animate-pulse text-rose-400" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                Daily Deadline Reached ({formatCutoffTimeDisplay(cutoffTime)})
              </span>
            </div>
            <h2
              id="accountability-dialog-title"
              className="text-xl sm:text-2xl font-black text-slate-100 tracking-tight"
            >
              Accountability Check
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              The {formatCutoffTimeDisplay(cutoffTime)} cutoff has passed, and your scheduled races for today are still incomplete.
            </p>
          </div>
        </div>

        {/* Pending Races Notice */}
        {pendingTemplates.length > 0 && (
          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 text-xs text-slate-300 space-y-1.5">
            <span className="font-semibold text-amber-400 flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5" />
              <span>Incomplete Races Today ({pendingTemplates.length}):</span>
            </span>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
              {pendingTemplates.map((t) => (
                <span
                  key={t.id}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 font-medium text-[11px] border border-slate-700/60"
                >
                  {t.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* INTERACTIVE COLOR-CODED TEXT MATCH DISPLAY */}
        <div className="space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Pledge Match
              </span>
              <span className="text-[11px] text-slate-400">(Spaces are ignored)</span>
            </div>

            {/* Interactive Color Legend */}
            <div className="flex items-center gap-3 text-[11px] text-slate-400">
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                <span className="text-emerald-300 font-medium">Match</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                <span className="text-rose-300 font-medium">Mismatch</span>
              </div>
              <button
                type="button"
                onClick={handleCopyTarget}
                className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-orange-400 transition cursor-pointer px-2 py-0.5 rounded-md hover:bg-slate-800 shrink-0 ml-1"
                title="Copy target message"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Interactive Character-by-Character Viewer */}
          <div
            onClick={() => textareaRef.current?.focus()}
            className="p-4 sm:p-5 rounded-2xl bg-slate-950/90 border border-slate-800 text-sm sm:text-base font-mono leading-relaxed tracking-wide cursor-text transition shadow-inner select-text"
            data-testid="interactive-text-display"
          >
            {tokens.map((token, idx) => {
              if (token.isSpace) {
                return (
                  <span key={idx} className="text-slate-600 select-all">
                    {token.char === '\n' ? '\n' : ' '}
                  </span>
                );
              }

              if (token.status === 'match') {
                return (
                  <span
                    key={idx}
                    data-status="match"
                    className="text-emerald-400 bg-emerald-500/20 font-bold rounded-xs px-0.5 transition-colors duration-100"
                  >
                    {token.char}
                  </span>
                );
              }

              if (token.status === 'mismatch') {
                return (
                  <span
                    key={idx}
                    data-status="mismatch"
                    className="text-rose-400 bg-rose-500/30 font-bold rounded-xs px-0.5 underline decoration-rose-500 decoration-2 transition-colors duration-100"
                    title={`Mismatch: expected '${token.char}', typed '${token.typedChar}'`}
                  >
                    {token.char}
                  </span>
                );
              }

              if (token.status === 'current') {
                return (
                  <span
                    key={idx}
                    data-status="current"
                    className="text-amber-300 font-bold bg-amber-500/20 rounded-xs px-0.5 border-b-2 border-amber-400 animate-pulse"
                  >
                    {token.char}
                  </span>
                );
              }

              // Untyped character
              return (
                <span
                  key={idx}
                  data-status="untyped"
                  className="text-slate-500 transition-colors px-0.5"
                >
                  {token.char}
                </span>
              );
            })}

            {/* Excess characters typed beyond target */}
            {excessChars.length > 0 && (
              <span
                data-testid="excess-chars"
                className="text-rose-400 bg-rose-500/30 px-1 py-0.5 rounded font-mono font-bold line-through ml-1"
                title="Excess characters typed"
              >
                {excessChars.join('')}
              </span>
            )}
          </div>

          {/* Real-time Mismatch Guidance */}
          {firstMismatch && (
            <div
              data-testid="mismatch-warning"
              className="flex items-center gap-1.5 text-xs text-rose-400 font-medium px-1 animate-in fade-in duration-150"
            >
              <AlertOctagon className="w-3.5 h-3.5 shrink-0" />
              <span>
                Mismatch at character #{firstMismatch.index}: expected{' '}
                <strong className="font-mono text-emerald-300 bg-emerald-950/60 px-1 rounded">
                  '{firstMismatch.expected}'
                </strong>
                , but typed{' '}
                <strong className="font-mono text-rose-300 bg-rose-950/60 px-1 rounded">
                  '{firstMismatch.typed}'
                </strong>
                .
              </span>
            </div>
          )}
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <textarea
              ref={textareaRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type the exact pledge here (spaces are ignored)..."
              rows={3}
              autoFocus
              className={`w-full bg-slate-950 border rounded-2xl p-3.5 text-sm font-mono text-slate-100 placeholder-slate-500 transition resize-none outline-none ${
                isExactMatch
                  ? 'border-emerald-500/70 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500'
                  : mismatchCount > 0
                  ? 'border-rose-500/70 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
                  : 'border-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500'
              }`}
            />

            {/* Verification Status Bar */}
            <div className="flex items-center justify-between text-xs px-1">
              {typedNonSpaceChars.length === 0 ? (
                <span className="text-slate-500">
                  Type the pledge above to match characters (green = match, red = mismatch).
                </span>
              ) : isExactMatch ? (
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  All {totalTargetNonSpace} characters matched! Ready to submit.
                </span>
              ) : mismatchCount > 0 ? (
                <span className="text-rose-400 font-medium flex items-center gap-1">
                  <AlertOctagon className="w-3.5 h-3.5" />
                  {mismatchCount} mismatched character{mismatchCount > 1 ? 's' : ''}. Correct the red letters.
                </span>
              ) : excessChars.length > 0 ? (
                <span className="text-rose-400 font-medium flex items-center gap-1">
                  <AlertOctagon className="w-3.5 h-3.5" />
                  {excessChars.length} excess character{excessChars.length > 1 ? 's' : ''} at the end.
                </span>
              ) : (
                <span className="text-amber-400 font-medium flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5" />
                  {matchCount} / {totalTargetNonSpace} matched so far. Keep going!
                </span>
              )}

              <span className="text-slate-400 font-mono text-[11px] shrink-0 ml-2">
                {matchCount} / {totalTargetNonSpace} chars
              </span>
            </div>
          </div>

          {/* Action Button: Strictly labeled 'Apology to Self' */}
          <button
            type="submit"
            disabled={!isExactMatch}
            className={`w-full py-3.5 px-6 rounded-2xl text-sm font-bold tracking-wide uppercase transition flex items-center justify-center gap-2 cursor-pointer shadow-lg ${
              isExactMatch
                ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-green-600 text-white hover:brightness-110 active:scale-[0.99] border border-emerald-400/40 shadow-emerald-900/30'
                : 'bg-slate-800 text-slate-500 border border-slate-700/60 cursor-not-allowed opacity-60'
            }`}
          >
            <Flame className="w-4 h-4" />
            <span>Apology to Self</span>
          </button>
        </form>
      </div>
    </div>
  );
};
