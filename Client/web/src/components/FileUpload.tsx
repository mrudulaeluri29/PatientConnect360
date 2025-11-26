import { useState, useRef } from "react";
import "./FileUpload.css";

interface FileUploadProps {
  onFileSelect: (file: File | null) => void;
  accept?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
}

export default function FileUpload({
  onFileSelect,
  accept = "image/*,.pdf",
  label = "Upload File",
  error,
  disabled = false,
}: FileUploadProps) {
  const [fileName, setFileName] = useState<string>("");
  const [fileSize, setFileSize] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      setFileName(file.name);
      setFileSize(file.size);
      onFileSelect(file);
    } else {
      setFileName("");
      setFileSize(0);
      onFileSelect(null);
    }
  };

  const handleRemove = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setFileName("");
    setFileSize(0);
    onFileSelect(null);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  return (
    <div className="file-upload">
      <label className="file-upload-label">{label}</label>
      <div className="file-upload-container">
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileChange}
          disabled={disabled}
          className="file-input"
          id="file-upload-input"
        />
        <label
          htmlFor="file-upload-input"
          className={`file-upload-button ${disabled ? "disabled" : ""} ${error ? "error" : ""}`}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="17 8 12 3 7 8"></polyline>
            <line x1="12" y1="3" x2="12" y2="15"></line>
          </svg>
          <span>Choose File</span>
        </label>
        {fileName && (
          <div className="file-info">
            <span className="file-name">{fileName}</span>
            <span className="file-size">({formatFileSize(fileSize)})</span>
            <button
              type="button"
              className="file-remove"
              onClick={handleRemove}
              disabled={disabled}
            >
              ×
            </button>
          </div>
        )}
        {!fileName && (
          <span className="file-placeholder">No file chosen</span>
        )}
      </div>
      {error && <span className="file-error">{error}</span>}
    </div>
  );
}

