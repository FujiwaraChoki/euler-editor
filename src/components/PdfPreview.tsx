import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Configure the PDF.js worker from local node_modules
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

interface PdfPreviewProps {
  pdfBase64: string | null;
  errors: string[];
  isCompiling: boolean;
  className?: string;
}

const PdfPreview: React.FC<PdfPreviewProps> = ({
  pdfBase64,
  errors,
  isCompiling: _isCompiling,
  className,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const [numPages, setNumPages] = useState<number>(0);

  // Double-buffered PDF state: currentPdf is displayed, nextPdf is loading
  const [currentPdf, setCurrentPdf] = useState<string | null>(null);
  const [nextPdf, setNextPdf] = useState<string | null>(null);

  // Track container width with ResizeObserver
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width } = entry.contentRect;
        setContainerWidth(width);
      }
    });

    observer.observe(container);
    // Set initial width
    setContainerWidth(container.clientWidth);

    return () => {
      observer.disconnect();
    };
  }, []);

  // When a new pdfBase64 comes in, set it as nextPdf for loading
  useEffect(() => {
    if (pdfBase64 && pdfBase64 !== currentPdf) {
      setNextPdf(pdfBase64);
    }
  }, [pdfBase64]); // eslint-disable-line react-hooks/exhaustive-deps

  // When the next PDF loads successfully, swap it to current
  const handleNextPdfLoadSuccess = useCallback(
    ({ numPages: pages }: { numPages: number }) => {
      setCurrentPdf(nextPdf);
      setNextPdf(null);
      setNumPages(pages);
    },
    [nextPdf]
  );

  const handleCurrentPdfLoadSuccess = useCallback(
    ({ numPages: pages }: { numPages: number }) => {
      setNumPages(pages);
    },
    []
  );

  // Convert base64 to a data object for react-pdf
  const currentPdfData = useMemo(() => {
    if (!currentPdf) return null;
    return { data: Uint8Array.from(atob(currentPdf), (c) => c.charCodeAt(0)) };
  }, [currentPdf]);

  const nextPdfData = useMemo(() => {
    if (!nextPdf) return null;
    return { data: Uint8Array.from(atob(nextPdf), (c) => c.charCodeAt(0)) };
  }, [nextPdf]);

  // Page width: use container width with some padding
  const pageWidth = Math.max(containerWidth - 48, 200);

  // Empty state
  if (!currentPdf && !nextPdf && errors.length === 0) {
    return (
      <div
        ref={containerRef}
        className={className}
        style={{
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg-primary)",
          color: "var(--text-muted)",
          fontFamily: "var(--font-mono)",
          fontSize: "13px",
          userSelect: "none",
        }}
      >
        Write some LaTeX to see a preview
      </div>
    );
  }

  // Error state (no PDF at all, only errors)
  if (!currentPdf && !nextPdf && errors.length > 0) {
    return (
      <div
        ref={containerRef}
        className={className}
        style={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "var(--bg-primary)",
          padding: "24px",
          overflow: "auto",
        }}
      >
        <div
          style={{
            color: "var(--error)",
            fontFamily: "var(--font-mono)",
            fontSize: "12px",
            lineHeight: "1.6",
          }}
        >
          <div
            style={{
              marginBottom: "12px",
              fontWeight: 500,
              fontSize: "13px",
            }}
          >
            Compilation Errors
          </div>
          {errors.map((err, i) => (
            <div
              key={i}
              style={{
                padding: "8px 12px",
                background: "var(--bg-tertiary)",
                borderRadius: "4px",
                marginBottom: "6px",
                borderLeft: "2px solid var(--error)",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {err}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        height: "100%",
        overflow: "auto",
        background: "var(--bg-primary)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "24px 0",
      }}
    >
      {/* Display current PDF */}
      {currentPdfData && (
        <Document
          file={currentPdfData}
          onLoadSuccess={handleCurrentPdfLoadSuccess}
          loading={null}
          error={null}
        >
          {Array.from({ length: numPages }, (_, i) => (
            <div
              key={`page-${i + 1}`}
              style={{
                marginBottom: "16px",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.3)",
                borderRadius: "2px",
                overflow: "hidden",
              }}
            >
              <Page
                pageNumber={i + 1}
                width={pageWidth}
                renderTextLayer={true}
                renderAnnotationLayer={true}
              />
            </div>
          ))}
        </Document>
      )}

      {/* Hidden next PDF loading in background for double-buffering */}
      {nextPdfData && (
        <div style={{ position: "absolute", left: -9999, top: -9999, visibility: "hidden" }}>
          <Document
            file={nextPdfData}
            onLoadSuccess={handleNextPdfLoadSuccess}
            loading={null}
            error={null}
          >
            <Page pageNumber={1} width={100} renderTextLayer={false} renderAnnotationLayer={false} />
          </Document>
        </div>
      )}

      {/* Show errors below the PDF if there are any */}
      {errors.length > 0 && (
        <div
          style={{
            width: "100%",
            maxWidth: pageWidth + 48,
            padding: "16px 24px",
          }}
        >
          <div
            style={{
              color: "var(--error)",
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              lineHeight: "1.5",
            }}
          >
            {errors.map((err, i) => (
              <div
                key={i}
                style={{
                  padding: "6px 10px",
                  background: "var(--bg-tertiary)",
                  borderRadius: "4px",
                  marginBottom: "4px",
                  borderLeft: "2px solid var(--error)",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {err}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PdfPreview;
