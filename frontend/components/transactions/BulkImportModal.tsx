"use client";

import React, { useState, useEffect, useMemo } from "react";
import { X, Upload, CheckCircle, AlertCircle, FileSpreadsheet, ArrowRight, ArrowLeft, RefreshCw, Check } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "../../lib/api";
import { useAccounts } from "../../hooks/useAccounts";
import { useCategories } from "../../hooks/useCategories";
import { ACCOUNT_TYPES } from "../../lib/constants";
import type { AccountType } from "../../lib/constants";
import { CreateTransactionDto } from "../../types/transaction";

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Step = "upload" | "map" | "preview" | "submitting" | "success";
type AmountMode = "single" | "separate";
type DateFormat = "YYYY-MM-DD" | "DD-MM-YYYY" | "MM/DD/YYYY" | "DD/MM/YYYY" | "DD-MMM-YYYY";

interface ParsedRow {
  id: string;
  originalRow: Record<string, string>;
  txn_date: string; // YYYY-MM-DD
  amount_cents: number;
  type: "expense" | "income";
  category: string;
  description: string;
  isValid: boolean;
  errorMessage?: string;
  enabled: boolean;
}

export default function BulkImportModal({ isOpen, onClose }: BulkImportModalProps) {
  const queryClient = useQueryClient();
  const { data: accounts = [] } = useAccounts();
  const { categories } = useCategories();

  // Wizard Step
  const [step, setStep] = useState<Step>("upload");

  // Step 1: Account & File
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);

  // Step 2: Mapping configuration
  const [dateHeader, setDateHeader] = useState<string>("");
  const [dateFormat, setDateFormat] = useState<DateFormat>("DD-MM-YYYY");
  const [descHeader, setDescHeader] = useState<string>("");
  const [amountMode, setAmountMode] = useState<AmountMode>("single");
  const [singleAmountHeader, setSingleAmountHeader] = useState<string>("");
  const [singleExpenseSign, setSingleExpenseSign] = useState<"negative" | "positive">("negative");
  const [debitHeader, setDebitHeader] = useState<string>("");
  const [creditHeader, setCreditHeader] = useState<string>("");
  const [categoryHeader, setCategoryHeader] = useState<string>("");
  const [defaultCategory, setDefaultCategory] = useState<string>("Other");

  // Step 3: Parsed rows state
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [importSummary, setImportSummary] = useState<{ count: number } | null>(null);

  // Reset modal on open
  useEffect(() => {
    if (isOpen) {
      setStep("upload");
      setSelectedAccountId(accounts[0]?.id || "");
      setFile(null);
      setCsvHeaders([]);
      setRawRows([]);
      setDateHeader("");
      setDateFormat("DD-MM-YYYY");
      setDescHeader("");
      setAmountMode("single");
      setSingleAmountHeader("");
      setSingleExpenseSign("negative");
      setDebitHeader("");
      setCreditHeader("");
      setCategoryHeader("");
      setDefaultCategory("Other");
      setParsedRows([]);
      setError(null);
      setSubmitting(false);
      setImportSummary(null);
    }
  }, [isOpen, accounts]);

  // Helper to split CSV line safely handling quotes
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim().replace(/^"|"$/g, ''));
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current.trim().replace(/^"|"$/g, ''));
    return result;
  };

  // Handle CSV file selection & reading
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    processFile(selectedFile);
  };

  const processFile = (selectedFile: File) => {
    setFile(selectedFile);
    setError(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      if (!text) {
        setError("File appears to be empty.");
        return;
      }

      const lines = text.split(/\r\n|\n/).filter((line) => line.trim().length > 0);
      if (lines.length < 2) {
        setError("CSV must contain a header row and at least one data row.");
        return;
      }

      const headers = parseCSVLine(lines[0]);
      setCsvHeaders(headers);

      // Auto-suggest header mappings
      const lowerHeaders = headers.map((h) => h.toLowerCase());
      
      const foundDate = headers[lowerHeaders.findIndex((h) => h.includes("date") || h.includes("txn"))] || headers[0] || "";
      const foundDesc = headers[lowerHeaders.findIndex((h) => h.includes("desc") || h.includes("narration") || h.includes("remark") || h.includes("particular"))] || headers[1] || "";
      const foundAmount = headers[lowerHeaders.findIndex((h) => h.includes("amount") || h.includes("val"))] || "";
      const foundDebit = headers[lowerHeaders.findIndex((h) => h.includes("debit") || h.includes("dr"))] || "";
      const foundCredit = headers[lowerHeaders.findIndex((h) => h.includes("credit") || h.includes("cr"))] || "";
      const foundCat = headers[lowerHeaders.findIndex((h) => h.includes("cat"))] || "";

      setDateHeader(foundDate);
      setDescHeader(foundDesc);
      if (foundDebit && foundCredit) {
        setAmountMode("separate");
        setDebitHeader(foundDebit);
        setCreditHeader(foundCredit);
      } else if (foundAmount) {
        setAmountMode("single");
        setSingleAmountHeader(foundAmount);
      } else {
        setSingleAmountHeader(headers[2] || "");
      }
      setCategoryHeader(foundCat);

      const rows: Record<string, string>[] = [];
      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        if (values.length === headers.length || values.some(v => v.trim() !== "")) {
          const rowObj: Record<string, string> = {};
          headers.forEach((h, idx) => {
            rowObj[h] = values[idx] || "";
          });
          rows.push(rowObj);
        }
      }
      setRawRows(rows);
    };

    reader.readAsText(selectedFile);
  };

  // Helper date parser
  const parseDateToISO = (val: string, format: DateFormat): string => {
    if (!val) return "";
    const clean = val.trim().replace(/[/.]/g, "-");
    const parts = clean.split("-");

    if (parts.length !== 3) return "";

    let y = "";
    let m = "";
    let d = "";

    const monthsMap: Record<string, string> = {
      jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
      jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12"
    };

    if (format === "YYYY-MM-DD") {
      y = parts[0];
      m = parts[1].padStart(2, "0");
      d = parts[2].padStart(2, "0");
    } else if (format === "DD-MM-YYYY") {
      d = parts[0].padStart(2, "0");
      m = parts[1].padStart(2, "0");
      y = parts[2];
    } else if (format === "MM/DD/YYYY") {
      m = parts[0].padStart(2, "0");
      d = parts[1].padStart(2, "0");
      y = parts[2];
    } else if (format === "DD/MM/YYYY") {
      d = parts[0].padStart(2, "0");
      m = parts[1].padStart(2, "0");
      y = parts[2];
    } else if (format === "DD-MMM-YYYY") {
      d = parts[0].padStart(2, "0");
      const monthStr = parts[1].toLowerCase().slice(0, 3);
      m = monthsMap[monthStr] || "01";
      y = parts[2];
    }

    if (y.length === 2) y = "20" + y;

    const iso = `${y}-${m}-${d}`;
    return isNaN(Date.parse(iso)) ? "" : iso;
  };

  // Process mapping and build Preview rows
  const handleProceedToPreview = () => {
    if (!dateHeader) {
      setError("Please select a Date column.");
      return;
    }

    setError(null);
    const parsed: ParsedRow[] = [];

    rawRows.forEach((row, idx) => {
      let isValid = true;
      let errorMsg = "";

      // 1. Date
      const dateVal = row[dateHeader] || "";
      const isoDate = parseDateToISO(dateVal, dateFormat);
      if (!isoDate) {
        isValid = false;
        errorMsg = `Invalid date '${dateVal}' for format ${dateFormat}`;
      }

      // 2. Amount & Type
      let amountCents = 0;
      let type: "expense" | "income" = "expense";

      if (amountMode === "single") {
        const rawAmt = (row[singleAmountHeader] || "").replace(/[^0-9.-]/g, "");
        const numAmt = parseFloat(rawAmt);
        if (isNaN(numAmt) || numAmt === 0) {
          isValid = false;
          errorMsg = errorMsg || `Invalid amount '${row[singleAmountHeader]}'`;
        } else {
          amountCents = Math.round(Math.abs(numAmt) * 100);
          if (numAmt < 0) {
            type = singleExpenseSign === "negative" ? "expense" : "income";
          } else {
            type = singleExpenseSign === "negative" ? "income" : "expense";
          }
        }
      } else {
        const debitVal = (row[debitHeader] || "").replace(/[^0-9.-]/g, "");
        const creditVal = (row[creditHeader] || "").replace(/[^0-9.-]/g, "");
        const debitNum = Math.abs(parseFloat(debitVal) || 0);
        const creditNum = Math.abs(parseFloat(creditVal) || 0);

        if (debitNum > 0) {
          type = "expense";
          amountCents = Math.round(debitNum * 100);
        } else if (creditNum > 0) {
          type = "income";
          amountCents = Math.round(creditNum * 100);
        } else {
          isValid = false;
          errorMsg = errorMsg || "No valid debit or credit amount found";
        }
      }

      // 3. Category & Description
      const category = categoryHeader && row[categoryHeader] ? row[categoryHeader].trim() : defaultCategory;
      const description = descHeader && row[descHeader] ? row[descHeader].trim() : "Imported Statement Txn";

      parsed.push({
        id: `row-${idx}`,
        originalRow: row,
        txn_date: isoDate || new Date().toISOString().split("T")[0],
        amount_cents: amountCents,
        type,
        category: category || defaultCategory,
        description: description || "Imported Statement Txn",
        isValid,
        errorMessage: errorMsg,
        enabled: isValid,
      });
    });

    setParsedRows(parsed);
    setStep("preview");
  };

  const toggleRowEnabled = (id: string) => {
    setParsedRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r))
    );
  };

  const toggleAllRows = (checked: boolean) => {
    setParsedRows((prev) =>
      prev.map((r) => (r.isValid ? { ...r, enabled: checked } : r))
    );
  };

  const validRowsCount = useMemo(() => parsedRows.filter((r) => r.isValid).length, [parsedRows]);
  const enabledRows = useMemo(() => parsedRows.filter((r) => r.enabled && r.isValid), [parsedRows]);

  const handleImportSubmit = async () => {
    if (enabledRows.length === 0) {
      setError("No valid rows selected for import.");
      return;
    }

    if (!selectedAccountId) {
      setError("Please select a target account.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const dtos: CreateTransactionDto[] = enabledRows.map((r) => ({
        account_id: selectedAccountId,
        type: r.type,
        amount_cents: r.amount_cents,
        category: r.category,
        description: r.description,
        txn_date: r.txn_date,
      }));

      const res = await api.transactions.batchCreate({ items: dtos });

      if (res.error) {
        throw new Error(res.error.message);
      }

      setImportSummary({ count: res.data?.imported_count || dtos.length });
      setStep("success");

      // Invalidate queries to refresh balance & transaction lists app-wide
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["budget"] });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to import batch transactions.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-surface border border-border rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/80 bg-surface-raised/40">
          <div className="flex items-center gap-2.5">
            <FileSpreadsheet className="h-5 w-5 text-accent" />
            <h2 className="font-semibold text-text-primary text-lg">Bulk Statement Importer</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-text-muted hover:text-text-primary hover:bg-surface-raised rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-danger/10 border border-danger/20 text-danger rounded-lg text-sm">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: Upload & Account */}
          {step === "upload" && (
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                  1. Select Target Account
                </label>
                <select
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-surface-raised border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-accent cursor-pointer"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({ACCOUNT_TYPES[acc.type as AccountType] || acc.type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                  2. Upload Bank Statement (.CSV)
                </label>
                <div className="border-2 border-dashed border-border/80 hover:border-accent/60 rounded-xl p-8 text-center transition-all bg-surface-raised/30 flex flex-col items-center justify-center gap-3">
                  <Upload className="h-10 w-10 text-accent/80 animate-pulse" />
                  <div>
                    <p className="text-sm font-semibold text-text-primary">
                      {file ? file.name : "Click or drop your CSV bank statement here"}
                    </p>
                    <p className="text-xs text-text-muted mt-1">Supports standard bank export files</p>
                  </div>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="absolute opacity-0 cursor-pointer w-full h-36"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Map Columns */}
          {step === "map" && (
            <div className="space-y-6">
              <div className="text-xs font-mono text-text-secondary bg-surface-raised/60 p-3 rounded-lg border border-border/50">
                Found <strong>{csvHeaders.length}</strong> headers and <strong>{rawRows.length}</strong> transaction rows in <span className="text-accent">{file?.name}</span>.
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Date Header */}
                <div>
                  <label className="block text-xs font-medium text-text-muted uppercase tracking-wider mb-1.5">
                    Date Column *
                  </label>
                  <select
                    value={dateHeader}
                    onChange={(e) => setDateHeader(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-raised border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                  >
                    <option value="">Select Date Column</option>
                    {csvHeaders.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                {/* Date Format */}
                <div>
                  <label className="block text-xs font-medium text-text-muted uppercase tracking-wider mb-1.5">
                    Date Format *
                  </label>
                  <select
                    value={dateFormat}
                    onChange={(e) => setDateFormat(e.target.value as DateFormat)}
                    className="w-full px-3 py-2 bg-surface-raised border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                  >
                    <option value="DD-MM-YYYY">DD-MM-YYYY (e.g. 15-07-2026)</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD (e.g. 2026-07-15)</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY (e.g. 07/15/2026)</option>
                    <option value="DD/MM/YYYY">DD/MM/YYYY (e.g. 15/07/2026)</option>
                    <option value="DD-MMM-YYYY">DD-MMM-YYYY (e.g. 15-Jul-2026)</option>
                  </select>
                </div>

                {/* Description Header */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-text-muted uppercase tracking-wider mb-1.5">
                    Description / Narration Column
                  </label>
                  <select
                    value={descHeader}
                    onChange={(e) => setDescHeader(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-raised border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                  >
                    <option value="">Select Description Column</option>
                    {csvHeaders.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                {/* Amount Mode Selector */}
                <div className="md:col-span-2 border-t border-border/50 pt-4">
                  <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                    Amount Layout
                  </label>
                  <div className="flex gap-4 mb-3">
                    <label className="flex items-center gap-2 text-xs text-text-primary cursor-pointer">
                      <input
                        type="radio"
                        name="amountMode"
                        checked={amountMode === "single"}
                        onChange={() => setAmountMode("single")}
                        className="text-accent focus:ring-accent"
                      />
                      Single Amount Column
                    </label>
                    <label className="flex items-center gap-2 text-xs text-text-primary cursor-pointer">
                      <input
                        type="radio"
                        name="amountMode"
                        checked={amountMode === "separate"}
                        onChange={() => setAmountMode("separate")}
                        className="text-accent focus:ring-accent"
                      />
                      Separate Debit & Credit Columns
                    </label>
                  </div>

                  {amountMode === "single" ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-text-muted mb-1">Amount Column *</label>
                        <select
                          value={singleAmountHeader}
                          onChange={(e) => setSingleAmountHeader(e.target.value)}
                          className="w-full px-3 py-2 bg-surface-raised border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                        >
                          <option value="">Select Amount Column</option>
                          {csvHeaders.map((h) => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-text-muted mb-1">Negative Values are *</label>
                        <select
                          value={singleExpenseSign}
                          onChange={(e) => setSingleExpenseSign(e.target.value as "negative" | "positive")}
                          className="w-full px-3 py-2 bg-surface-raised border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                        >
                          <option value="negative">Expenses (Debit)</option>
                          <option value="positive">Income (Credit)</option>
                        </select>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-text-muted mb-1">Debit Column (Expenses)</label>
                        <select
                          value={debitHeader}
                          onChange={(e) => setDebitHeader(e.target.value)}
                          className="w-full px-3 py-2 bg-surface-raised border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                        >
                          <option value="">Select Debit Column</option>
                          {csvHeaders.map((h) => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-text-muted mb-1">Credit Column (Income)</label>
                        <select
                          value={creditHeader}
                          onChange={(e) => setCreditHeader(e.target.value)}
                          className="w-full px-3 py-2 bg-surface-raised border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                        >
                          <option value="">Select Credit Column</option>
                          {csvHeaders.map((h) => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                {/* Category Mapping */}
                <div className="md:col-span-2 border-t border-border/50 pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-text-muted uppercase tracking-wider mb-1">
                      Category Column (Optional)
                    </label>
                    <select
                      value={categoryHeader}
                      onChange={(e) => setCategoryHeader(e.target.value)}
                      className="w-full px-3 py-2 bg-surface-raised border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                    >
                      <option value="">None (Use Default Category)</option>
                      {csvHeaders.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-muted uppercase tracking-wider mb-1">
                      Default Category Fallback
                    </label>
                    <select
                      value={defaultCategory}
                      onChange={(e) => setDefaultCategory(e.target.value)}
                      className="w-full px-3 py-2 bg-surface-raised border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                    >
                      {categories.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Preview & Validation Table */}
          {step === "preview" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs font-mono bg-surface-raised/60 p-3 rounded-lg border border-border/50">
                <span>
                  Ready to import <strong className="text-accent">{enabledRows.length}</strong> of {validRowsCount} valid rows.
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => toggleAllRows(true)}
                    className="text-accent hover:underline"
                  >
                    Select All Valid
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleAllRows(false)}
                    className="text-text-muted hover:underline"
                  >
                    Deselect All
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto border border-border rounded-lg max-h-72">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-raised text-text-muted sticky top-0 border-b border-border font-mono uppercase">
                    <tr>
                      <th className="p-2.5 w-10 text-center">Include</th>
                      <th className="p-2.5">Date</th>
                      <th className="p-2.5">Type</th>
                      <th className="p-2.5">Amount (₹)</th>
                      <th className="p-2.5">Category</th>
                      <th className="p-2.5">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50 text-text-primary font-mono">
                    {parsedRows.map((r) => (
                      <tr
                        key={r.id}
                        className={`${!r.isValid ? "bg-danger/10 opacity-70" : r.enabled ? "bg-surface" : "bg-surface-raised/30 opacity-60"}`}
                      >
                        <td className="p-2.5 text-center">
                          <input
                            type="checkbox"
                            disabled={!r.isValid}
                            checked={r.enabled}
                            onChange={() => toggleRowEnabled(r.id)}
                            className="rounded border-border text-accent focus:ring-accent"
                          />
                        </td>
                        <td className="p-2.5 whitespace-nowrap">{r.txn_date}</td>
                        <td className="p-2.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                              r.type === "expense"
                                ? "bg-danger/15 text-danger border border-danger/30"
                                : "bg-success/15 text-success border border-success/30"
                            }`}
                          >
                            {r.type}
                          </span>
                        </td>
                        <td className="p-2.5 font-semibold">
                          ₹{(r.amount_cents / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-2.5 truncate max-w-[120px]">{r.category}</td>
                        <td className="p-2.5 truncate max-w-[180px]" title={r.description}>
                          {r.description}
                          {!r.isValid && (
                            <span className="block text-[10px] text-danger font-sans">{r.errorMessage}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* STEP 4: Success */}
          {step === "success" && (
            <div className="py-8 text-center space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-success/15 text-success rounded-full border border-success/30">
                <Check className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold text-text-primary">Statement Imported Successfully!</h3>
              <p className="text-sm text-text-secondary max-w-md mx-auto">
                Batch loaded <strong>{importSummary?.count}</strong> transactions into your account. Balances and spending metrics have been updated.
              </p>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border/80 bg-surface-raised/40">
          {step === "upload" && (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary rounded-lg border border-border"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!file || rawRows.length === 0}
                onClick={() => setStep("map")}
                className="flex items-center gap-1.5 px-5 py-2 bg-accent hover:bg-accent/90 disabled:opacity-50 text-text-primary font-semibold text-sm rounded-lg"
              >
                Next: Map Columns <ArrowRight className="h-4 w-4" />
              </button>
            </>
          )}

          {step === "map" && (
            <>
              <button
                type="button"
                onClick={() => setStep("upload")}
                className="flex items-center gap-1.5 px-4 py-2 text-sm text-text-secondary hover:text-text-primary rounded-lg border border-border"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
              <button
                type="button"
                onClick={handleProceedToPreview}
                className="flex items-center gap-1.5 px-5 py-2 bg-accent hover:bg-accent/90 text-text-primary font-semibold text-sm rounded-lg"
              >
                Preview Transactions <ArrowRight className="h-4 w-4" />
              </button>
            </>
          )}

          {step === "preview" && (
            <>
              <button
                type="button"
                onClick={() => setStep("map")}
                className="flex items-center gap-1.5 px-4 py-2 text-sm text-text-secondary hover:text-text-primary rounded-lg border border-border"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
              <button
                type="button"
                disabled={submitting || enabledRows.length === 0}
                onClick={handleImportSubmit}
                className="flex items-center gap-2 px-5 py-2 bg-accent hover:bg-accent/90 disabled:opacity-50 text-text-primary font-semibold text-sm rounded-lg shadow-lg shadow-accent/20"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" /> Importing...
                  </>
                ) : (
                  <>
                    Import {enabledRows.length} Transactions <CheckCircle className="h-4 w-4" />
                  </>
                )}
              </button>
            </>
          )}

          {step === "success" && (
            <div className="w-full flex justify-center">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 bg-accent hover:bg-accent/90 text-text-primary font-semibold text-sm rounded-lg shadow-lg shadow-accent/20"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
