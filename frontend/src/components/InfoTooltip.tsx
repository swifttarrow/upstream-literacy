'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const HIDE_DELAY_MS = 150;

interface InfoTooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
}

export function InfoTooltip({ content, children }: InfoTooltipProps) {
  const triggerRef = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(false);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
  }, []);

  const scheduleHide = () => {
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    hideTimeoutRef.current = setTimeout(() => setVisible(false), HIDE_DELAY_MS);
  };

  const cancelHide = () => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  };

  const show = () => {
    cancelHide();
    setVisible(true);
  };

  const rect = typeof document !== 'undefined' && visible && triggerRef.current
    ? triggerRef.current.getBoundingClientRect()
    : null;

  return (
    <>
      <span
        ref={triggerRef}
        className="inline-flex cursor-help text-gray-400 hover:text-gray-600"
        onMouseEnter={show}
        onMouseLeave={scheduleHide}
        aria-label="More info"
      >
        {children}
      </span>
      {visible &&
        rect &&
        typeof document !== 'undefined' &&
        document.body &&
        createPortal(
          <div
            className="fixed z-[9999] w-52 rounded-md bg-gray-800 px-2 py-1.5 text-xs text-white shadow-lg"
            style={{
              left: rect.left,
              top: rect.bottom + 6,
            }}
            onMouseEnter={show}
            onMouseLeave={scheduleHide}
          >
            {content}
          </div>,
          document.body
        )}
    </>
  );
}
