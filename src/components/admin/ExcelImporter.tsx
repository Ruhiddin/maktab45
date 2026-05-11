import React, { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Download, X, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';
import { apiJson } from '../../lib/apiClient';
import { normalizeImportErrorMessage } from '../../lib/clientErrors';
import { useToast } from '../toast/ToastProvider';

export interface ColumnDef {
  key: string;
  label: string;
  required: boolean;
}

export interface ExcelImporterProps {
  title: string;
  description?: string;
  expectedColumns: ColumnDef[];
  onImport: (data: any[]) => Promise<void>;
  onDownloadTemplate: () => void;
  parseKind: 'students' | 'teachers';
  isOpen: boolean;
  onClose: () => void;
}

function isSpreadsheetFile(file: File) {
  const lowerName = file.name.toLowerCase();
  return lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls');
}

async function prepareUploadFile(file: File) {
  if (!isSpreadsheetFile(file)) {
    return file;
  }

  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error('The spreadsheet does not contain any sheets.');
  }

  const firstSheet = workbook.Sheets[firstSheetName];
  const csv = XLSX.utils.sheet_to_csv(firstSheet, {
    FS: ',',
    RS: '\n',
    blankrows: false,
  });

  if (!csv.trim()) {
    throw new Error('The spreadsheet is empty. Add at least one data row and try again.');
  }

  const csvName = file.name.replace(/\.(xlsx|xls)$/i, '.csv');
  return new File([csv], csvName, { type: 'text/csv;charset=utf-8;' });
}

export default function ExcelImporter({
  title,
  description,
  expectedColumns,
  onImport,
  onDownloadTemplate,
  parseKind,
  isOpen,
  onClose
}: ExcelImporterProps) {
  const { showToast } = useToast();
  const [parsedData, setParsedData] = useState<any[] | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsProcessing(true);
    setError(null);

    try {
      const token = window.localStorage.getItem('admin_token');
      if (!token) {
        throw new Error('Missing admin session. Please sign in again.');
      }

      const uploadFile = await prepareUploadFile(file);
      const formData = new FormData();
      formData.append('file', uploadFile);

      const result = await apiJson<{ rows: any[] }>('adminImportParse', {
        method: 'POST',
        token,
        body: formData,
        searchParams: { kind: parseKind },
        fallbackError: 'Failed to parse import file.',
      });

      const data = Array.isArray(result?.rows) ? result.rows : null;
      if (!data) {
        throw new Error('Parsed spreadsheet response was invalid.');
      }

      setParsedData(data);
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : 'Unknown parsing error.';
      setError(`Failed to parse import file. ${message}`);
      setParsedData(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    
    // We can simulate an input change event
    if (fileInputRef.current) {
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      fileInputRef.current.files = dataTransfer.files;
      
      const event = { target: { files: dataTransfer.files } } as unknown as React.ChangeEvent<HTMLInputElement>;
      handleFileUpload(event);
    }
  };

  const handleConfirmImport = async () => {
    if (!parsedData || parsedData.length === 0) return;
    setIsImporting(true);
    try {
      await onImport(parsedData);
      // Let the parent component close it if successful
    } catch (err: any) {
      const message = normalizeImportErrorMessage(err.message || 'Import failed.');
      setError(message);
      showToast({
        type: 'error',
        title: 'Import failed',
        message,
      });
    } finally {
      setIsImporting(false);
    }
  };

  const resetState = () => {
    setParsedData(null);
    setFileName('');
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-gray-900/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="excel-importer-title"
        aria-describedby="excel-importer-description"
        className="bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 w-full max-w-4xl h-[92vh] sm:h-auto sm:max-h-[90vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 p-4 sm:p-6 border-b border-gray-100 dark:border-gray-800">
          <div className="min-w-0">
            <h2 id="excel-importer-title" className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">{title}</h2>
            {description && <p id="excel-importer-description" className="text-sm text-gray-500 dark:text-gray-400 mt-1">{description}</p>}
          </div>
          <button
            onClick={() => { resetState(); onClose(); }}
            aria-label="Close import dialog"
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 flex-1 overflow-y-auto">
          {!parsedData && !isProcessing && (
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl p-6 sm:p-12 flex flex-col items-center justify-center text-center hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-4">
                <Upload className="w-8 h-8 text-blue-500 dark:text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Click or drag file to upload</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mb-6">
                Supported formats: .xlsx, .xls, .csv. Excel files are converted automatically before upload. Keep the first header row unchanged.
              </p>

              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                aria-label="Upload spreadsheet file"
                accept=".csv,text/csv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                onChange={handleFileUpload}
              />

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDownloadTemplate();
                }}
                className="flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
              >
                <Download className="w-4 h-4" />
                Download Template
              </button>
            </div>
          )}

          {isProcessing && (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-4" />
              <p className="text-gray-600 dark:text-gray-400">Processing file...</p>
            </div>
          )}

          {error && (
            <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-red-800 dark:text-red-300">Import Error</h4>
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">{error}</p>
              </div>
              {parsedData && (
                <button onClick={resetState} className="text-sm text-red-600 hover:underline">
                  Try Again
                </button>
              )}
            </div>
          )}

          {parsedData && !isProcessing && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <FileSpreadsheet className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">{fileName}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{parsedData.length} rows detected</p>
                  </div>
                </div>
                <button
                  onClick={resetState}
                  aria-label="Remove uploaded file"
                  className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  title="Remove file"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {isImporting && (
                <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20 px-4 py-3 flex items-center gap-3">
                  <div className="w-5 h-5 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-200">Import in progress</p>
                    <p className="text-xs text-blue-700 dark:text-blue-300">Please wait while the spreadsheet rows are being validated and saved.</p>
                  </div>
                </div>
              )}

              <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                <div className="max-h-96 overflow-auto">
                  <table className="w-full text-sm text-left whitespace-nowrap">
                    <thead className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 sticky top-0 z-10 shadow-sm">
                      <tr>
                        <th className="px-4 py-3 font-medium">Status</th>
                        {expectedColumns.map((col) => (
                          <th key={col.key} className="px-4 py-3 font-medium">
                            {col.label} {col.required && <span className="text-red-500">*</span>}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {parsedData.slice(0, 100).map((row, idx) => {
                        // Simple row validation
                        const missingCols = expectedColumns
                          .filter(c => c.required)
                          .filter(c => !row[c.key] || String(row[c.key]).trim() === '');
                        
                        const isValid = missingCols.length === 0;

                        return (
                          <tr key={idx} className="bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                            <td className="px-4 py-3">
                              {isValid ? (
                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                              ) : (
                                <AlertCircle className="w-4 h-4 text-amber-500" title={`Missing: ${missingCols.map(c=>c.key).join(', ')}`} />
                              )}
                            </td>
                            {expectedColumns.map((col) => (
                              <td key={col.key} className="px-4 py-3 text-gray-900 dark:text-gray-300">
                                {String(row[col.key] || '')}
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {parsedData.length > 100 && (
                  <div className="p-3 text-center text-xs text-gray-500 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                    Showing first 100 rows.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
          <button
            onClick={() => { resetState(); onClose(); }}
            disabled={isImporting}
            className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirmImport}
            disabled={!parsedData || isImporting || parsedData.length === 0}
            className="w-full sm:w-auto px-6 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {isImporting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Importing...
              </>
            ) : (
              'Confirm Import'
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
