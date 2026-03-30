import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import TooltipGuide, { type GuideStep } from "./src/components/TooltipGuide";

type Suggestion = {
  id: string;
  label: string;
  apply: (input: string) => string;
};

type ImprovePromptResponse = {
  improved_prompt: string;
};

const cardStyle: React.CSSProperties = {
  position: "relative",
  overflow: "hidden",
  borderRadius: 28,
  border: "1px solid rgba(148, 163, 184, 0.18)",
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(248,250,252,0.88) 100%)",
  boxShadow:
    "0 18px 60px rgba(15, 23, 42, 0.14), inset 0 1px 0 rgba(255,255,255,0.5)",
  backdropFilter: "blur(16px)",
};

const chipBase: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  borderRadius: 999,
  padding: "8px 14px",
  fontSize: 13,
  fontWeight: 600,
  letterSpacing: "-0.01em",
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

const hasErrorDetail = (value: unknown): value is { detail?: string } => {
  return typeof value === "object" && value !== null && "detail" in value;
};

const getScoreBreakdown = (prompt: string) => {
  const text = prompt.trim();
  if (!text) {
    return {
      score: 1,
      lengthScore: 0,
      contextScore: 0,
      formatScore: 0,
      hasContext: false,
      hasFormat: false,
      isVague: true,
    };
  }

  const words = text.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  const contextPatterns = [
    /\bfor\b/i,
    /\bbecause\b/i,
    /\baudience\b/i,
    /\bgoal\b/i,
    /\bcontext\b/i,
    /\bbackground\b/i,
    /\btone\b/i,
    /\buse case\b/i,
    /\btarget\b/i,
    /\bmy\b/i,
    /\bour\b/i,
    /\bcompany\b/i,
    /\bproduct\b/i,
  ];

  const formatPatterns = [
    /\blist\b/i,
    /\btable\b/i,
    /\bbullets?\b/i,
    /\bjson\b/i,
    /\bmarkdown\b/i,
    /\bsteps?\b/i,
    /\bsections?\b/i,
    /\bparagraphs?\b/i,
    /\bformat\b/i,
    /\bheadline\b/i,
  ];

  const hasContext =
    contextPatterns.some((pattern) => pattern.test(text)) || text.includes(":");
  const hasFormat = formatPatterns.some((pattern) => pattern.test(text));

  let lengthScore = 0;
  if (wordCount >= 8) lengthScore = 2;
  if (wordCount >= 16) lengthScore = 3;
  if (wordCount >= 28) lengthScore = 4;

  const contextScore = hasContext ? 3 : 0;
  const formatScore = hasFormat ? 3 : 0;
  const score = Math.min(10, Math.max(1, lengthScore + contextScore + formatScore));
  const isVague = wordCount < 8 || !hasContext || !hasFormat;

  return {
    score,
    lengthScore,
    contextScore,
    formatScore,
    hasContext,
    hasFormat,
    isVague,
  };
};

const getLevelMeta = (score: number) => {
  if (score <= 4) {
    return {
      label: "Needs Detail",
      accent: "#f97316",
      soft: "rgba(249, 115, 22, 0.12)",
    };
  }

  if (score <= 7) {
    return {
      label: "Good Shape",
      accent: "#2563eb",
      soft: "rgba(37, 99, 235, 0.12)",
    };
  }

  return {
    label: "Ready to Use",
    accent: "#059669",
    soft: "rgba(5, 150, 105, 0.12)",
  };
};

const PromptGamifiedAssistant: React.FC = () => {
  const inputRef = useRef<HTMLDivElement>(null);
  const scoreRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const suggestionRef = useRef<HTMLDivElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  const breakdownRef = useRef<HTMLDivElement>(null);
  const [prompt, setPrompt] = useState(
    "Write a launch email for our new AI assistant. Audience: product managers. Keep it friendly and easy to scan."
  );
  const [comparison, setComparison] = useState<{ before: string; after: string } | null>(
    null
  );
  const [improvement, setImprovement] = useState<number | null>(null);
  const [isImproving, setIsImproving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const [currentGuideStep, setCurrentGuideStep] = useState(0);
  const previousScoreRef = useRef<number>(getScoreBreakdown(prompt).score);

  const analysis = useMemo(() => getScoreBreakdown(prompt), [prompt]);
  const level = useMemo(() => getLevelMeta(analysis.score), [analysis.score]);

  useEffect(() => {
    const previousScore = previousScoreRef.current;
    if (analysis.score > previousScore) {
      setImprovement(analysis.score - previousScore);
    }
    previousScoreRef.current = analysis.score;
  }, [analysis.score]);

  useEffect(() => {
    if (improvement === null) return;
    const timeout = window.setTimeout(() => setImprovement(null), 1800);
    return () => window.clearTimeout(timeout);
  }, [improvement]);

  const suggestions: Suggestion[] = useMemo(() => {
    const list: Suggestion[] = [];

    if (prompt.trim().split(/\s+/).filter(Boolean).length < 8) {
      list.push({
        id: "details",
        label: "Add more details",
        apply: (input) =>
          `${input.trim()} Include what you want, why it matters, and the most important details.`.trim(),
      });
    }

    if (!analysis.hasFormat) {
      list.push({
        id: "format",
        label: "Choose a format",
        apply: (input) =>
          `${input.trim()} Present it as a short list with a clear summary at the end.`.trim(),
      });
    }

    if (!/\baudience\b/i.test(prompt)) {
      list.push({
        id: "audience",
        label: "Say who it is for",
        apply: (input) =>
          `${input.trim()} Audience: busy people who want a clear and simple explanation.`.trim(),
      });
    }

    return list.slice(0, 3);
  }, [analysis.hasFormat, prompt]);

  const guideSteps: GuideStep[] = useMemo(
    () => [
      {
        id: "prompt-input",
        title: "Start with your request",
        description:
          "Describe what you want in plain language. A little extra detail helps the assistant give a better answer.",
        targetRef: inputRef,
        preferredPlacement: "right",
      },
      {
        id: "score-meter",
        title: "Watch the clarity meter",
        description:
          "This updates as you type and shows how clear and complete your request feels.",
        targetRef: scoreRef,
        preferredPlacement: "bottom",
      },
      {
        id: "improve-button",
        title: "Let the assistant polish it",
        description:
          "Use this when you want a cleaner, clearer version of your request before sending it on.",
        targetRef: buttonRef,
        preferredPlacement: "bottom",
      },
      {
        id: "suggestions",
        title: "Use simple suggestions",
        description:
          "These quick ideas help you add missing details without having to rewrite everything yourself.",
        targetRef: suggestionRef,
        preferredPlacement: "top",
      },
      {
        id: "comparison-output",
        title: "See the improved version",
        description:
          "You can compare your original wording with the improved version and choose what you like best.",
        targetRef: outputRef,
        preferredPlacement: "top",
      },
      {
        id: "breakdown-panel",
        title: "Understand what helps",
        description:
          "This panel quietly explains what usually makes a request easier for the assistant to understand.",
        targetRef: breakdownRef,
        preferredPlacement: "top",
        ctaLabel: "Got it",
      },
    ],
    []
  );

  const handleSuggestionClick = (suggestion: Suggestion) => {
    setPrompt((current) => suggestion.apply(current));
  };

  const handleNextGuideStep = () => {
    setCurrentGuideStep((current) => Math.min(current + 1, guideSteps.length - 1));
  };

  const handleCloseGuide = () => {
    setGuideOpen(false);
  };

  const handleImprovePrompt = async () => {
    const before = prompt.trim();
    if (!before || isImproving) return;

    setIsImproving(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`${API_BASE_URL}/improve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt: before }),
      });

      const data = (await response.json()) as unknown;

      if (
        !response.ok ||
        typeof data !== "object" ||
        data === null ||
        !("improved_prompt" in data)
      ) {
        throw new Error(
          hasErrorDetail(data) && typeof data.detail === "string"
            ? data.detail
            : "Unable to improve the prompt right now."
        );
      }

      setComparison({
        before,
        after: (data as ImprovePromptResponse).improved_prompt,
      });
      setPrompt((data as ImprovePromptResponse).improved_prompt);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to improve the prompt right now."
      );
    } finally {
      setIsImproving(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: 24,
        background:
          "radial-gradient(circle at top left, rgba(14,165,233,0.12), transparent 30%), radial-gradient(circle at top right, rgba(16,185,129,0.12), transparent 26%), linear-gradient(180deg, #f8fafc 0%, #fdfdfc 46%, #f8fafc 100%)",
        fontFamily:
          'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        color: "#0f172a",
      }}
    >
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          style={{
            ...cardStyle,
            padding: 28,
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(135deg, rgba(255,255,255,0.45), transparent 42%, rgba(37,99,235,0.06))",
              pointerEvents: "none",
            }}
          />

          <div
            className="prompt-coach-layout"
            style={{
              position: "relative",
              display: "grid",
              gridTemplateColumns: "minmax(0, 1.7fr) minmax(320px, 1fr)",
              gap: 24,
            }}
          >
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: 16,
                  flexWrap: "wrap",
                  marginBottom: 20,
                }}
              >
                <div>
                  <div
                    style={{
                      ...chipBase,
                      background: "rgba(15,23,42,0.06)",
                      color: "#334155",
                      width: "fit-content",
                      marginBottom: 14,
                    }}
                  >
                    Message Helper
                  </div>
                  <h1
                    style={{
                      margin: 0,
                      fontSize: "clamp(28px, 4vw, 40px)",
                      lineHeight: 1.08,
                      letterSpacing: "-0.04em",
                    }}
                  >
                    Turn a rough idea into a clearer request
                  </h1>
                  <p
                    style={{
                      margin: "14px 0 0",
                      maxWidth: 620,
                      fontSize: 17,
                      lineHeight: 1.65,
                      color: "#475569",
                    }}
                  >
                    Write what you need, tap one button, and get a cleaner version that is easier
                    for the assistant to understand.
                  </p>
                </div>

                <motion.div
                  layout
                  style={{
                    ...chipBase,
                    background: level.soft,
                    color: level.accent,
                    border: `1px solid ${level.soft}`,
                  }}
                >
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      background: level.accent,
                      boxShadow: `0 0 0 6px ${level.soft}`,
                    }}
                  />
                  {level.label}
                </motion.div>
              </div>

              <div
                ref={inputRef}
                style={{
                  ...cardStyle,
                  padding: 18,
                  borderRadius: 24,
                  background:
                    "linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(241,245,249,0.95) 100%)",
                }}
              >
                <label
                  htmlFor="prompt-editor"
                  style={{
                    display: "block",
                    fontSize: 14,
                    fontWeight: 700,
                    color: "#334155",
                    marginBottom: 10,
                  }}
                >
                  What would you like help with?
                </label>

                <textarea
                  className="prompt-editor"
                  id="prompt-editor"
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  placeholder="Example: Write a short welcome email for new customers. Keep it warm, simple, and easy to read."
                  style={{
                    width: "100%",
                    minHeight: 220,
                    resize: "vertical",
                    borderRadius: 20,
                    border: "1px solid rgba(148, 163, 184, 0.28)",
                    background: "rgba(255,255,255,0.95)",
                    padding: "18px 18px 20px",
                    fontSize: 15,
                    lineHeight: 1.7,
                    color: "#0f172a",
                    outline: "none",
                    boxShadow: "inset 0 1px 2px rgba(15, 23, 42, 0.03)",
                  }}
                />

                <div
                  ref={scoreRef}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 16,
                    flexWrap: "wrap",
                    marginTop: 16,
                  }}
                >
                  <div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "baseline",
                        gap: 10,
                        flexWrap: "wrap",
                      }}
                    >
                      <span
                        style={{
                          fontSize: 14,
                          color: "#64748b",
                          fontWeight: 600,
                        }}
                      >
                        Clarity Meter
                      </span>
                      <span
                        style={{
                          fontSize: 30,
                          lineHeight: 1,
                          fontWeight: 800,
                          letterSpacing: "-0.04em",
                        }}
                      >
                        {analysis.score}
                      </span>
                      <span
                        style={{
                          fontSize: 15,
                          color: "#94a3b8",
                          fontWeight: 700,
                        }}
                      >
                        / 10
                      </span>
                    </div>

                    <div
                      style={{
                        width: 260,
                        height: 10,
                        borderRadius: 999,
                        background: "rgba(148, 163, 184, 0.18)",
                        overflow: "hidden",
                        marginTop: 12,
                      }}
                    >
                      <motion.div
                        animate={{ width: `${analysis.score * 10}%` }}
                        transition={{ type: "spring", stiffness: 110, damping: 18 }}
                        style={{
                          height: "100%",
                          borderRadius: 999,
                          background: `linear-gradient(90deg, ${level.accent}, #0ea5e9)`,
                        }}
                      />
                    </div>
                  </div>

                  <button
                    ref={buttonRef}
                    type="button"
                    onClick={handleImprovePrompt}
                    disabled={isImproving || !prompt.trim()}
                    style={{
                      border: 0,
                      borderRadius: 18,
                      padding: "14px 18px",
                      fontSize: 15,
                      fontWeight: 700,
                      color: "#ffffff",
                      cursor: isImproving ? "wait" : "pointer",
                      opacity: isImproving || !prompt.trim() ? 0.7 : 1,
                      background: "linear-gradient(135deg, #2563eb 0%, #0f172a 100%)",
                      boxShadow: "0 12px 30px rgba(37, 99, 235, 0.28)",
                    }}
                  >
                    {isImproving ? "Improving..." : "Improve My Message"}
                  </button>
                </div>

                <AnimatePresence>
                  {errorMessage && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.22 }}
                      style={{
                        marginTop: 16,
                        borderRadius: 16,
                        border: "1px solid rgba(239, 68, 68, 0.16)",
                        background: "rgba(254, 242, 242, 0.9)",
                        padding: "12px 14px",
                        fontSize: 14,
                        lineHeight: 1.5,
                        color: "#b91c1c",
                      }}
                    >
                      {errorMessage}
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {improvement !== null && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.98 }}
                      transition={{ duration: 0.28 }}
                      style={{
                        ...chipBase,
                        marginTop: 16,
                        background: "rgba(5,150,105,0.12)",
                        color: "#047857",
                        width: "fit-content",
                      }}
                    >
                      +{improvement} improvement
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div
                ref={suggestionRef}
                style={{
                  marginTop: 18,
                }}
              >
                <AnimatePresence>
                  {suggestions.length > 0 && analysis.isVague && (
                    <motion.div
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.24 }}
                      style={{
                        ...cardStyle,
                        padding: 18,
                        borderRadius: 24,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: 12,
                          flexWrap: "wrap",
                          marginBottom: 14,
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontSize: 15,
                              fontWeight: 700,
                              color: "#0f172a",
                          }}
                        >
                          Quick ways to improve it
                        </div>
                        <div
                          style={{
                            fontSize: 14,
                            color: "#64748b",
                            marginTop: 4,
                          }}
                        >
                          Tap one to make your message clearer.
                        </div>
                      </div>
                      </div>

                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        {suggestions.map((suggestion) => (
                          <motion.button
                            key={suggestion.id}
                            whileHover={{ y: -2 }}
                            whileTap={{ scale: 0.98 }}
                            type="button"
                            onClick={() => handleSuggestionClick(suggestion)}
                            style={{
                              ...chipBase,
                              cursor: "pointer",
                              border: "1px solid rgba(37,99,235,0.16)",
                              background: "rgba(255,255,255,0.9)",
                              color: "#1e293b",
                            }}
                          >
                            {suggestion.label}
                          </motion.button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div
                ref={outputRef}
                style={{
                  marginTop: 18,
                  minHeight: comparison ? undefined : 92,
                }}
              >
                <AnimatePresence>
                  {comparison ? (
                    <motion.div
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.28 }}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                        gap: 16,
                      }}
                    >
                      <div style={{ ...cardStyle, padding: 18, borderRadius: 22 }}>
                        <div
                          style={{
                            ...chipBase,
                            background: "rgba(15,23,42,0.06)",
                            color: "#334155",
                            width: "fit-content",
                            marginBottom: 12,
                          }}
                        >
                          Before
                        </div>
                        <p
                          style={{
                            margin: 0,
                            whiteSpace: "pre-wrap",
                            fontSize: 14,
                            lineHeight: 1.7,
                            color: "#475569",
                          }}
                        >
                          {comparison.before}
                        </p>
                      </div>

                      <div style={{ ...cardStyle, padding: 18, borderRadius: 22 }}>
                        <div
                          style={{
                            ...chipBase,
                            background: "rgba(5,150,105,0.10)",
                            color: "#047857",
                            width: "fit-content",
                            marginBottom: 12,
                          }}
                        >
                          After
                        </div>
                        <p
                          style={{
                            margin: 0,
                            whiteSpace: "pre-wrap",
                            fontSize: 14,
                            lineHeight: 1.7,
                            color: "#0f172a",
                          }}
                        >
                          {comparison.after}
                        </p>
                      </div>
                    </motion.div>
                  ) : (
                    <div
                      style={{
                        ...cardStyle,
                        padding: 18,
                        borderRadius: 22,
                        display: "grid",
                        placeItems: "center",
                        color: "#64748b",
                        fontSize: 14,
                        lineHeight: 1.6,
                        textAlign: "center",
                        minHeight: 92,
                      }}
                    >
                      Your improved version will appear here after you click the button above.
                    </div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div style={{ display: "grid", gap: 16, alignContent: "start" }}>
              <div ref={breakdownRef} style={{ ...cardStyle, padding: 18 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                    marginBottom: 14,
                  }}
                >
                  <h2
                    style={{
                      margin: 0,
                      fontSize: 18,
                      lineHeight: 1.2,
                      letterSpacing: "-0.03em",
                    }}
                  >
                    What makes a request clearer
                  </h2>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#64748b",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                    }}
                  >
                    Live
                  </span>
                </div>

                  {[
                  { label: "Enough detail", value: analysis.lengthScore, total: 4 },
                  { label: "Helpful context", value: analysis.contextScore, total: 3 },
                  { label: "Clear format", value: analysis.formatScore, total: 3 },
                ].map((item) => (
                  <div key={item.label} style={{ marginBottom: 14 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 14,
                        color: "#475569",
                        marginBottom: 8,
                      }}
                    >
                      <span>{item.label}</span>
                      <span style={{ fontWeight: 700 }}>
                        {item.value}/{item.total}
                      </span>
                    </div>
                    <div
                      style={{
                        height: 10,
                        borderRadius: 999,
                        background: "rgba(148, 163, 184, 0.16)",
                        overflow: "hidden",
                      }}
                    >
                      <motion.div
                        animate={{ width: `${(item.value / item.total) * 100}%` }}
                        transition={{ type: "spring", stiffness: 110, damping: 18 }}
                        style={{
                          height: "100%",
                          borderRadius: 999,
                          background: "linear-gradient(90deg, #0ea5e9, #2563eb)",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ ...cardStyle, padding: 18 }}>
                <h2
                  style={{
                    margin: "0 0 14px",
                    fontSize: 18,
                    lineHeight: 1.2,
                    letterSpacing: "-0.03em",
                  }}
                >
                  Progress Guide
                </h2>

                {[
                  { label: "Needs Detail", range: "0-4", color: "#f97316" },
                  { label: "Good Shape", range: "5-7", color: "#2563eb" },
                  { label: "Ready to Use", range: "8-10", color: "#059669" },
                ].map((item) => (
                  <div
                    key={item.label}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                      padding: "12px 0",
                      borderTop: "1px solid rgba(148,163,184,0.12)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          background: item.color,
                        }}
                      />
                      <span style={{ fontSize: 14, fontWeight: 600 }}>{item.label}</span>
                    </div>
                    <span style={{ fontSize: 13, color: "#64748b", fontWeight: 700 }}>
                      {item.range}
                    </span>
                  </div>
                ))}
              </div>

              <div style={{ ...cardStyle, padding: 18 }}>
                <h2
                  style={{
                    margin: "0 0 12px",
                    fontSize: 18,
                    lineHeight: 1.2,
                    letterSpacing: "-0.03em",
                  }}
                >
                  Simple Tips
                </h2>
                <div
                  style={{
                    display: "grid",
                    gap: 10,
                    color: "#475569",
                    fontSize: 14,
                    lineHeight: 1.7,
                  }}
                >
                  <div>Say what you want as clearly as you can.</div>
                  <div>Add a little context so the assistant understands the situation.</div>
                  <div>If helpful, mention how you want the answer presented.</div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <style>{`
        @media (max-width: 980px) {
          .prompt-editor {
            min-height: 180px;
          }
        }

        @media (max-width: 960px) {
          .prompt-coach-layout {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      <TooltipGuide
        steps={guideSteps}
        currentStep={currentGuideStep}
        isOpen={guideOpen}
        onNext={handleNextGuideStep}
        onSkip={handleCloseGuide}
        onComplete={handleCloseGuide}
      />
    </div>
  );
};

export default PromptGamifiedAssistant;
