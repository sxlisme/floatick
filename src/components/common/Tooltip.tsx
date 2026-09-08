import React, { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

type TooltipTriggerProps = {
  "aria-describedby"?: string;
  "aria-label"?: string;
  onBlur?: React.FocusEventHandler<HTMLElement>;
  onClick?: React.MouseEventHandler<HTMLElement>;
  onFocus?: React.FocusEventHandler<HTMLElement>;
  onMouseEnter?: React.MouseEventHandler<HTMLElement>;
  onMouseLeave?: React.MouseEventHandler<HTMLElement>;
  title?: string;
};

interface TooltipProps {
  children: React.ReactElement<TooltipTriggerProps>;
  content: React.ReactNode;
  delay?: number;
}

interface TooltipPosition {
  left: number;
  side: "top" | "bottom";
  top: number;
}

export const Tooltip: React.FC<TooltipProps> = ({
  children,
  content,
  delay = 320,
}) => {
  const tooltipId = useId();
  const triggerRef = useRef<HTMLElement | null>(null);
  const timerRef = useRef<number | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState<TooltipPosition | null>(null);

  const clearTimer = () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const updatePosition = () => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const side = rect.top >= 42 ? "top" : "bottom";
    setPosition({
      left: Math.min(window.innerWidth - 68, Math.max(68, rect.left + rect.width / 2)),
      side,
      top: side === "top" ? rect.top - 8 : rect.bottom + 8,
    });
  };

  const show = (trigger: HTMLElement, immediate = false) => {
    clearTimer();
    triggerRef.current = trigger;
    updatePosition();
    timerRef.current = window.setTimeout(() => {
      updatePosition();
      setIsVisible(true);
      timerRef.current = null;
    }, immediate ? 0 : delay);
  };

  const hide = () => {
    clearTimer();
    setIsVisible(false);
  };

  useEffect(() => {
    if (!isVisible) return;

    const handleViewportChange = () => updatePosition();
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);
    return () => {
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [isVisible]);

  useEffect(() => () => clearTimer(), []);

  const childProps = children.props;
  const trigger = React.cloneElement(children, {
    "aria-describedby": isVisible ? tooltipId : undefined,
    "aria-label":
      childProps["aria-label"] ??
      (typeof content === "string" ? content : undefined),
    onBlur: (event) => {
      childProps.onBlur?.(event);
      hide();
    },
    onClick: (event) => {
      childProps.onClick?.(event);
      hide();
    },
    onFocus: (event) => {
      childProps.onFocus?.(event);
      show(event.currentTarget, true);
    },
    onMouseEnter: (event) => {
      childProps.onMouseEnter?.(event);
      show(event.currentTarget);
    },
    onMouseLeave: (event) => {
      childProps.onMouseLeave?.(event);
      hide();
    },
    title: undefined,
  });

  return (
    <>
      {trigger}
      {isVisible && position && typeof document !== "undefined"
        ? createPortal(
            <div
              id={tooltipId}
              role="tooltip"
              className="floatick-tooltip"
              data-side={position.side}
              style={{ left: position.left, top: position.top }}
            >
              {content}
            </div>,
            document.body
          )
        : null}
    </>
  );
};
