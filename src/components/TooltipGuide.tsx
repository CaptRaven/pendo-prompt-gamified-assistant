import React, { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

type GuidePlacement = "top" | "bottom" | "right";

export type GuideStep = {
  id: string;
  title: string;
  description: string;
  targetRef: React.RefObject<HTMLElement | null>;
  preferredPlacement?: GuidePlacement;
  ctaLabel?: string;
};

type TooltipGuideProps = {
  steps: GuideStep[];
  currentStep: number;
  isOpen: boolean;
  onNext: () => void;
  onSkip: () => void;
  onComplete: () => void;
};

type RectState = {
  top: number;
  left: number;
  width: number;
  height: number;
};

const TOOLTIP_WIDTH = 320;
const VIEWPORT_PADDING = 16;
const SPOTLIGHT_PADDING = 10;
const DEFAULT_TOOLTIP_HEIGHT = 240;

const getPlacement = (
  rect: RectState,
  preferredPlacement: GuidePlacement | undefined,
  viewportWidth: number,
  viewportHeight: number
): GuidePlacement => {
  const spaceRight = viewportWidth - (rect.left + rect.width);
  const spaceTop = rect.top;
  const spaceBottom = viewportHeight - (rect.top + rect.height);

  if (viewportWidth < 768) {
    return spaceBottom >= 180 ? "bottom" : "top";
  }

  if (preferredPlacement === "right" && spaceRight >= TOOLTIP_WIDTH + 32) {
    return "right";
  }

  if (preferredPlacement === "top" && spaceTop >= 180) {
    return "top";
  }

  if (preferredPlacement === "bottom" && spaceBottom >= 180) {
    return "bottom";
  }

  if (spaceRight >= TOOLTIP_WIDTH + 32) {
    return "right";
  }

  if (spaceBottom >= spaceTop) {
    return "bottom";
  }

  return "top";
};

const getTooltipPosition = (
  rect: RectState,
  placement: GuidePlacement,
  viewportWidth: number,
  viewportHeight: number,
  tooltipHeight: number
) => {
  const maxTop = viewportHeight - tooltipHeight - VIEWPORT_PADDING;
  const maxLeft = viewportWidth - TOOLTIP_WIDTH - VIEWPORT_PADDING;
  const centeredLeft = Math.min(
    Math.max(rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2, VIEWPORT_PADDING),
    maxLeft
  );

  if (placement === "right") {
    return {
      top: Math.min(
        Math.max(rect.top + rect.height / 2 - tooltipHeight / 2, VIEWPORT_PADDING),
        Math.max(VIEWPORT_PADDING, maxTop)
      ),
      left: Math.min(rect.left + rect.width + 20, maxLeft),
      transform: "translateY(0%)",
    };
  }

  if (placement === "top") {
    return {
      top: Math.min(
        Math.max(rect.top - tooltipHeight - 18, VIEWPORT_PADDING),
        Math.max(VIEWPORT_PADDING, maxTop)
      ),
      left: centeredLeft,
      transform: "translateY(0%)",
    };
  }

  return {
    top: Math.min(
      Math.max(rect.top + rect.height + 18, VIEWPORT_PADDING),
      Math.max(VIEWPORT_PADDING, maxTop)
    ),
    left: centeredLeft,
    transform: "translateY(0%)",
  };
};

const getArrowStyle = (placement: GuidePlacement): React.CSSProperties => {
  if (placement === "right") {
    return {
      position: "absolute",
      left: -8,
      top: "50%",
      width: 16,
      height: 16,
      transform: "translateY(-50%) rotate(45deg)",
      background: "#ffffff",
      borderLeft: "1px solid rgba(203, 213, 225, 0.7)",
      borderBottom: "1px solid rgba(203, 213, 225, 0.7)",
    };
  }

  if (placement === "top") {
    return {
      position: "absolute",
      left: "50%",
      bottom: -8,
      width: 16,
      height: 16,
      transform: "translateX(-50%) rotate(45deg)",
      background: "#ffffff",
      borderRight: "1px solid rgba(203, 213, 225, 0.7)",
      borderBottom: "1px solid rgba(203, 213, 225, 0.7)",
    };
  }

  return {
    position: "absolute",
    left: "50%",
    top: -8,
    width: 16,
    height: 16,
    transform: "translateX(-50%) rotate(45deg)",
    background: "#ffffff",
    borderTop: "1px solid rgba(203, 213, 225, 0.7)",
    borderLeft: "1px solid rgba(203, 213, 225, 0.7)",
  };
};

const TooltipGuide: React.FC<TooltipGuideProps> = ({
  steps,
  currentStep,
  isOpen,
  onNext,
  onSkip,
  onComplete,
}) => {
  const activeStep = steps[currentStep];
  const [rect, setRect] = useState<RectState | null>(null);
  const [tooltipHeight, setTooltipHeight] = useState(DEFAULT_TOOLTIP_HEIGHT);
  const [viewport, setViewport] = useState({
    width: typeof window !== "undefined" ? window.innerWidth : 1440,
    height: typeof window !== "undefined" ? window.innerHeight : 900,
  });

  useLayoutEffect(() => {
    if (!isOpen || !activeStep?.targetRef.current) return;

    const update = () => {
      const node = activeStep.targetRef.current;
      if (!node) return;
      const nextRect = node.getBoundingClientRect();
      setRect({
        top: nextRect.top,
        left: nextRect.left,
        width: nextRect.width,
        height: nextRect.height,
      });
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    update();

    const resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(activeStep.targetRef.current);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [activeStep, isOpen]);

  useLayoutEffect(() => {
    if (!isOpen) return;
    const tooltipNode = document.getElementById("tooltip-guide-card");
    if (!tooltipNode) return;

    const updateHeight = () => {
      setTooltipHeight(tooltipNode.getBoundingClientRect().height || DEFAULT_TOOLTIP_HEIGHT);
    };

    updateHeight();

    const resizeObserver = new ResizeObserver(updateHeight);
    resizeObserver.observe(tooltipNode);

    return () => {
      resizeObserver.disconnect();
    };
  }, [activeStep?.id, isOpen]);

  useEffect(() => {
    if (!isOpen || !activeStep?.targetRef.current) return;
    activeStep.targetRef.current.scrollIntoView({
      behavior: "smooth",
      block: "center",
      inline: "nearest",
    });
  }, [activeStep, isOpen]);

  const placement = useMemo(() => {
    if (!rect) return "bottom";
    return getPlacement(
      rect,
      activeStep?.preferredPlacement,
      viewport.width,
      viewport.height
    );
  }, [activeStep?.preferredPlacement, rect, viewport.height, viewport.width]);

  const tooltipPosition = useMemo(() => {
    if (!rect) return null;
    return getTooltipPosition(
      rect,
      placement,
      viewport.width,
      viewport.height,
      tooltipHeight
    );
  }, [placement, rect, tooltipHeight, viewport.height, viewport.width]);

  if (!isOpen || !activeStep || !rect || !tooltipPosition) return null;

  const isLastStep = currentStep === steps.length - 1;
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <AnimatePresence>
      <motion.div
        key={activeStep.id}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 60,
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(15, 23, 42, 0.62)",
          }}
        />

        <motion.div
          layout
          transition={{ type: "spring", stiffness: 240, damping: 28 }}
          style={{
            position: "absolute",
            top: rect.top - SPOTLIGHT_PADDING,
            left: rect.left - SPOTLIGHT_PADDING,
            width: rect.width + SPOTLIGHT_PADDING * 2,
            height: rect.height + SPOTLIGHT_PADDING * 2,
            borderRadius: 24,
            background: "transparent",
            boxShadow:
              "0 0 0 9999px rgba(15, 23, 42, 0.62), 0 0 0 2px rgba(255,255,255,0.96), 0 0 0 8px rgba(59,130,246,0.26), 0 0 30px rgba(59,130,246,0.45)",
          }}
        />

        <motion.div
          layout
          initial={{
            opacity: 0,
            y: placement === "top" ? 8 : placement === "bottom" ? -8 : 0,
            x: placement === "right" ? -8 : 0,
          }}
          animate={{ opacity: 1, y: 0, x: 0 }}
          exit={{
            opacity: 0,
            y: placement === "top" ? 8 : placement === "bottom" ? -8 : 0,
            x: placement === "right" ? -8 : 0,
          }}
          transition={{ duration: 0.24, ease: "easeOut" }}
          style={{
            position: "absolute",
            width: Math.min(TOOLTIP_WIDTH, viewport.width - VIEWPORT_PADDING * 2),
            top: tooltipPosition.top,
            left: tooltipPosition.left,
            transform: tooltipPosition.transform,
            pointerEvents: "auto",
          }}
        >
          <div
            id="tooltip-guide-card"
            style={{
              position: "relative",
              borderRadius: 24,
              background: "#ffffff",
              border: "1px solid rgba(226, 232, 240, 0.95)",
              boxShadow: "0 22px 60px rgba(15, 23, 42, 0.28)",
              padding: 20,
              maxHeight: `calc(100vh - ${VIEWPORT_PADDING * 2}px)`,
              overflowY: "auto",
            }}
          >
            <div style={getArrowStyle(placement)} />

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                marginBottom: 14,
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "#64748b",
                }}
              >
                Step {currentStep + 1} of {steps.length}
              </div>
              <button
                type="button"
                onClick={onSkip}
                style={{
                  border: 0,
                  background: "transparent",
                  padding: 0,
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#64748b",
                }}
              >
                Skip
              </button>
            </div>

            <div
              style={{
                height: 6,
                borderRadius: 999,
                overflow: "hidden",
                background: "rgba(226, 232, 240, 0.8)",
                marginBottom: 16,
              }}
            >
              <motion.div
                animate={{ width: `${progress}%` }}
                transition={{ type: "spring", stiffness: 140, damping: 22 }}
                style={{
                  height: "100%",
                  borderRadius: 999,
                  background: "linear-gradient(90deg, #2563eb, #38bdf8)",
                }}
              />
            </div>

            <div
              style={{
                fontSize: 16,
                fontWeight: 700,
                letterSpacing: "-0.02em",
                color: "#0f172a",
                marginBottom: 8,
              }}
            >
              {activeStep.title}
            </div>

            <div
              style={{
                fontSize: 14,
                lineHeight: 1.65,
                color: "#475569",
                marginBottom: 20,
              }}
            >
              {activeStep.description}
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                onClick={isLastStep ? onComplete : onNext}
                style={{
                  border: 0,
                  borderRadius: 14,
                  padding: "11px 16px",
                  background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
                  color: "#ffffff",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {isLastStep ? "Got it" : activeStep.ctaLabel ?? "Next"}
              </button>

              {!isLastStep && (
                <button
                  type="button"
                  onClick={onSkip}
                  style={{
                    border: 0,
                    background: "transparent",
                    padding: "11px 4px",
                    color: "#64748b",
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Skip
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default TooltipGuide;
