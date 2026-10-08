"use client";

import React from "react";
import CalculatorTransactionDrawer from "./CalculatorTransactionDrawer";

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultType?: "expense" | "income";
}

export default function AddTransactionModal({
  isOpen,
  onClose,
  defaultType = "expense",
}: AddTransactionModalProps) {
  return (
    <CalculatorTransactionDrawer
      isOpen={isOpen}
      onClose={onClose}
      defaultType={defaultType}
    />
  );
}
