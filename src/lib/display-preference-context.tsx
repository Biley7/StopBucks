"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import type { CurrencyCode, DisplayUnitMode } from "@/domain/types";
import { formatMinorUnits } from "@/domain/currency";

interface DisplayPreferenceContextValue {
  displayMode: DisplayUnitMode;
  setDisplayMode: (mode: DisplayUnitMode) => void;
  formatAmount: (
    minorUnits: number,
    currency?: CurrencyCode,
    hourlyRateMinor?: number
  ) => string;
}

const STORAGE_KEY = "stopbucks_display_unit_mode";

const DisplayPreferenceContext =
  createContext<DisplayPreferenceContextValue | null>(null);

export function DisplayPreferenceProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [displayMode, setDisplayModeState] =
    useState<DisplayUnitMode>("currency");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as DisplayUnitMode | null;
      if (
        saved === "currency" ||
        saved === "work_hours" ||
        saved === "compounded_4yr"
      ) {
        setDisplayModeState(saved);
      }
    } catch {
      // Safe fallback if localStorage is disabled
    }
  }, []);

  const setDisplayMode = (mode: DisplayUnitMode) => {
    setDisplayModeState(mode);
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // Safe fallback
    }
  };

  const formatAmount = (
    minorUnits: number,
    currency: CurrencyCode = "INR",
    hourlyRateMinor?: number
  ): string => {
    return formatMinorUnits(
      minorUnits,
      currency,
      displayMode,
      hourlyRateMinor
    );
  };

  return (
    <DisplayPreferenceContext.Provider
      value={{
        displayMode,
        setDisplayMode,
        formatAmount,
      }}
    >
      {children}
    </DisplayPreferenceContext.Provider>
  );
}

export function useDisplayPreference(): DisplayPreferenceContextValue {
  const context = useContext(DisplayPreferenceContext);
  if (!context) {
    throw new Error(
      "useDisplayPreference must be used within a DisplayPreferenceProvider"
    );
  }
  return context;
}

