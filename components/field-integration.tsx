/**
 * Field Integration
 *
 * Teach Mode field hover detection, mapping resolution, and conditional overlay display.
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { TeachModeOverlay } from './overlay-interaction';
import { TeachModeContent } from './overlay-content';

export interface FieldMapping {
  fieldId: string;
  label: string;
  description: string;
  taxonomyPath: string[];
  examples?: {
    valid: string[];
    invalid: string[];
  };
}

export interface TeachModeFieldContextValue {
  isHovered: boolean;
  handleMouseEnter: () => void;
  handleMouseLeave: () => void;
}

const TeachModeFieldContext = createContext<TeachModeFieldContextValue | null>(null);

export interface TeachModeFieldProviderProps {
  children: React.ReactNode;
  teachModeEnabled: boolean;
}

export function TeachModeFieldProvider({
  children,
  teachModeEnabled,
}: TeachModeFieldProviderProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [activeField, setActiveField] = useState<string | null>(null);

  const handleMouseEnter = useCallback(() => {
    if (teachModeEnabled) {
      setIsHovered(true);
    }
  }, [teachModeEnabled]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    setActiveField(null);
  }, []);

  return (
    <TeachModeFieldContext.Provider
      value={{ isHovered, handleMouseEnter, handleMouseLeave }}
    >
      {children}
    </TeachModeFieldContext.Provider>
  );
}

export function useTeachModeField(): TeachModeFieldContextValue {
  const context = useContext(TeachModeFieldContext);
  if (!context) {
    throw new Error('useTeachModeField must be used within TeachModeFieldProvider');
  }
  return context;
}

/**
 * Resolve field mapping for a given field.
 */
export function resolveFieldMapping(
  formId: string,
  fieldId: string,
  mappings: Record<string, FieldMapping>
): FieldMapping | null {
  const key = `${formId}.${fieldId}`;
  return mappings[key] || null;
}

/**
 * Convert field mapping to overlay content.
 */
export function mappingToContent(mapping: FieldMapping): TeachModeContent {
  return {
    paragraph: {
      content: mapping.description,
    },
    taxonomy: [
      { label: mapping.taxonomyPath[0], path: [mapping.taxonomyPath[0]] },
      {
        label: mapping.taxonomyPath[1],
        path: [mapping.taxonomyPath[0], mapping.taxonomyPath[1]],
      },
      {
        label: mapping.taxonomyPath[2],
        path: mapping.taxonomyPath,
      },
    ],
    examples: mapping.examples,
  };
}

export interface TeachModeFieldProps {
  formId: string;
  fieldId: string;
  teachModeEnabled: boolean;
  mappings: Record<string, FieldMapping>;
  children: React.ReactNode;
  delay?: number;
}

export function TeachModeField({
  formId,
  fieldId,
  teachModeEnabled,
  mappings,
  children,
  delay,
}: TeachModeFieldProps) {
  const [visible, setVisible] = useState(false);
  const [content, setContent] = useState<TeachModeContent | null>(null);

  const handleMouseEnter = useCallback(() => {
    if (!teachModeEnabled) return;

    const mapping = resolveFieldMapping(formId, fieldId, mappings);
    if (mapping) {
      setContent(mappingToContent(mapping));
      setVisible(true);
    }
  }, [teachModeEnabled, formId, fieldId, mappings]);

  const handleVisibleChange = useCallback((newVisible: boolean) => {
    setVisible(newVisible);
  }, []);

  // When Teach Mode is disabled, hide any visible overlay
  useEffect(() => {
    if (!teachModeEnabled && visible) {
      setVisible(false);
    }
  }, [teachModeEnabled, visible]);

  return (
    <TeachModeOverlay
      visible={visible}
      onVisibleChange={handleVisibleChange}
      content={content || undefined}
      delay={delay}
    >
      <div onMouseEnter={handleMouseEnter}>{children}</div>
    </TeachModeOverlay>
  );
}
