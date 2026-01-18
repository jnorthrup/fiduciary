/**
 * Overlay Interaction Component
 *
 * Teach Mode overlay with hover delay, close behavior, and keyboard navigation.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { calculateOverlayPosition } from './overlay-positioning';
import { TeachModeOverlayContent, TeachModeContent } from './overlay-content';

export interface TeachModeOverlayProps {
  visible: boolean;
  onVisibleChange: (visible: boolean) => void;
  content?: TeachModeContent;
  delay?: number;
  closeDelay?: number;
  children?: React.ReactNode;
}

const DEFAULT_DELAY = 300;
const DEFAULT_CLOSE_DELAY = 150;

export function TeachModeOverlay({
  visible,
  onVisibleChange,
  content,
  delay = DEFAULT_DELAY,
  closeDelay = DEFAULT_CLOSE_DELAY,
  children,
}: TeachModeOverlayProps) {
  const triggerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = React.useState<{ x: number; y: number; width?: number }>({ x: 0, y: 0 });
  const showTimeoutRef = useRef<number>();
  const hideTimeoutRef = useRef<number>();
  const triggerElementRef = useRef<HTMLElement>();

  // Close on click outside
  useEffect(() => {
    if (!visible) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        overlayRef.current &&
        !overlayRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        onVisibleChange(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [visible, onVisibleChange]);

  // Handle close with focus return
  const handleClose = useCallback(() => {
    onVisibleChange(false);
    // Return focus to trigger after a brief delay to allow render
    setTimeout(() => {
      triggerElementRef.current?.focus();
    }, 0);
  }, [onVisibleChange]);

  // Handle ESC key and Focus Trap
  useEffect(() => {
    if (!visible) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleClose();
      }

      if (event.key === 'Tab' && overlayRef.current) {
        const focusableElements = overlayRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

        if (event.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus();
            event.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus();
            event.preventDefault();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [visible, handleClose]);

  // Handle mouse enter on trigger
  const handleMouseEnter = useCallback(() => {
    if (visible) return;

    clearTimeout(hideTimeoutRef.current);
    showTimeoutRef.current = window.setTimeout(() => {
      onVisibleChange(true);
    }, delay);
  }, [visible, onVisibleChange, delay]);

  // Handle mouse leave from trigger
  const handleMouseLeave = useCallback(() => {
    clearTimeout(showTimeoutRef.current);

    if (visible) {
      hideTimeoutRef.current = window.setTimeout(() => {
        onVisibleChange(false);
      }, closeDelay);
    }
  }, [visible, onVisibleChange, closeDelay]);

  // Calculate position when visible
  useEffect(() => {
    if (visible && triggerRef.current && overlayRef.current) {
      const trigger = triggerRef.current;
      const overlay = overlayRef.current;

      // Store trigger element for focus return
      triggerElementRef.current = document.activeElement as HTMLElement;

      const pos = calculateOverlayPosition(
        {
          x: trigger.offsetLeft,
          y: trigger.offsetTop,
          width: trigger.offsetWidth,
          height: trigger.offsetHeight,
        },
        {
          width: overlay.offsetWidth,
          height: overlay.offsetHeight,
        },
        {
          width: window.innerWidth,
          height: window.innerHeight,
        }
      );

      setPosition(pos);
    }
  }, [visible]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      clearTimeout(showTimeoutRef.current);
      clearTimeout(hideTimeoutRef.current);
    };
  }, []);

  return (
    <>
      <div
        ref={triggerRef}
        data-testid="overlay-trigger"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {children}
      </div>

      {visible && (
        <div
          ref={overlayRef}
          className="teach-mode-overlay absolute z-50 bg-white border border-gray-200 rounded-lg shadow-lg max-w-md"
          style={{
            left: `${position.x}px`,
            top: `${position.y}px`,
            width: position.width ? `${position.width}px` : undefined,
          }}
          role="dialog"
          aria-modal="false"
          aria-live="polite"
        >
          <button
            onClick={handleClose}
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
            aria-label="Close"
            autoFocus
          >
            ✕
          </button>

          {content && <TeachModeOverlayContent content={content} />}
        </div>
      )}
    </>
  );
}
