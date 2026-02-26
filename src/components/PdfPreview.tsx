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
  zoom?: number;
  onHoverChange?: (hovered: boolean) => void;
  onFocusChange?: (focused: boolean) => void;
}

const PdfPreview: React.FC<PdfPreviewProps> = ({
  pdfBase64,
  errors,
  isCompiling: _isCompiling,
  className,
  zoom = 1,
  onHoverChange,
  onFocusChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [controlsVisible, setControlsVisible] = useState(false);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Double-buffered PDF state: currentPdf is displayed, nextPdf is loading
  const [currentPdf, setCurrentPdf] = useState<string | null>(null);
  const [nextPdf, setNextPdf] = useState<string | null>(null);

  const handleMouseEnter = useCallback(() => {
    onHoverChange?.(true);
  }, [onHoverChange]);

  const handleMouseLeave = useCallback(() => {
    onHoverChange?.(false);
  }, [onHoverChange]);

  const handleFocusCapture = useCallback(() => {
    onFocusChange?.(true);
  }, [onFocusChange]);

  const handleBlurCapture = useCallback((event: React.FocusEvent<HTMLDivElement>) => {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
      return;
    }
    onFocusChange?.(false);
  }, [onFocusChange]);

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
      setControlsVisible(true);
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

  useEffect(() => {
    return () => {
      onHoverChange?.(false);
      onFocusChange?.(false);
    };
  }, [onFocusChange, onHoverChange]);

  // Track which page is most visible via IntersectionObserver
  useEffect(() => {
    const container = containerRef.current;
    if (!container || numPages === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        let maxRatio = 0;
        let mostVisible = currentPage;
        for (const entry of entries) {
          const pageNum = Number(entry.target.getAttribute("data-page"));
          if (entry.intersectionRatio > maxRatio) {
            maxRatio = entry.intersectionRatio;
            mostVisible = pageNum;
          }
        }
        if (maxRatio > 0) setCurrentPage(mostVisible);
      },
      { root: container, threshold: [0, 0.25, 0.5, 0.75, 1] }
    );

    for (const [, el] of pageRefs.current) {
      observer.observe(el);
    }

    return () => observer.disconnect();
  }, [numPages, currentPdf]); // eslint-disable-line react-hooks/exhaustive-deps

  const scrollToPage = useCallback((page: number) => {
    const el = pageRefs.current.get(page);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  const goToPrevPage = useCallback(() => {
    if (currentPage > 1) scrollToPage(currentPage - 1);
  }, [currentPage, scrollToPage]);

  const goToNextPage = useCallback(() => {
    if (currentPage < numPages) scrollToPage(currentPage + 1);
  }, [currentPage, numPages, scrollToPage]);

  // Show controls on scroll/mouse move, hide after idle
  const showControls = useCallback(() => {
    setControlsVisible(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => setControlsVisible(false), 2000);
  }, []);

  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, []);

  const interactionProps = {
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
    onFocusCapture: handleFocusCapture,
    onBlurCapture: handleBlurCapture,
    tabIndex: 0,
  };

  // Page width with zoom support
  const basePageWidth = Math.max(containerWidth - 48, 200);
  const pageWidth = Math.max(Math.round(basePageWidth * zoom), 120);

  // Empty state
  if (!currentPdf && !nextPdf && errors.length === 0) {
    return (
      <div
        ref={containerRef}
        className={className}
        {...interactionProps}
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
          outline: "none",
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
        {...interactionProps}
        style={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "var(--bg-primary)",
          padding: "24px",
          overflow: "auto",
          outline: "none",
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
      {...interactionProps}
      onScroll={showControls}
      onMouseMove={showControls}
      style={{
        height: "100%",
        overflow: "auto",
        background: "var(--bg-primary)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "24px 0",
        outline: "none",
        position: "relative",
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
              data-page={i + 1}
              ref={(el) => {
                if (el) pageRefs.current.set(i + 1, el);
                else pageRefs.current.delete(i + 1);
              }}
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

      {/* Floating page controls */}
      {numPages > 1 && (
        <div
          style={{
            position: "sticky",
            bottom: 16,
            display: "flex",
            alignItems: "center",
            gap: "2px",
            padding: "4px",
            borderRadius: "12px",
            background: "rgba(255, 255, 255, 0.72)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            border: "1px solid rgba(0, 0, 0, 0.08)",
            boxShadow: "0 2px 12px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.06)",
            userSelect: "none",
            opacity: controlsVisible ? 1 : 0,
            transition: "opacity 0.25s ease",
            pointerEvents: controlsVisible ? "auto" : "none",
            fontFamily: "var(--font-mono)",
            fontSize: "12px",
            zIndex: 10,
          }}
          onMouseEnter={() => {
            if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
            setControlsVisible(true);
          }}
          onMouseLeave={showControls}
        >
          {/* Previous page */}
          <button
            onClick={goToPrevPage}
            disabled={currentPage <= 1}
            title="Previous page"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 28,
              height: 28,
              borderRadius: "8px",
              border: "none",
              background: "transparent",
              color: currentPage <= 1 ? "#c0c0c0" : "#555",
              cursor: currentPage <= 1 ? "default" : "pointer",
              transition: "background 0.15s ease, color 0.15s ease",
            }}
            onMouseEnter={(e) => {
              if (currentPage > 1) {
                e.currentTarget.style.background = "rgba(0,0,0,0.06)";
                e.currentTarget.style.color = "#222";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = currentPage <= 1 ? "#c0c0c0" : "#555";
            }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {/* Page indicator */}
          <span
            title={`Page ${currentPage} of ${numPages}`}
            style={{
              padding: "0 8px",
              color: "#222",
              fontVariantNumeric: "tabular-nums",
              minWidth: "40px",
              textAlign: "center",
              letterSpacing: "0.02em",
            }}
          >
            {currentPage}<span style={{ color: "#999", margin: "0 3px" }}>/</span>{numPages}
          </span>

          {/* Next page */}
          <button
            onClick={goToNextPage}
            disabled={currentPage >= numPages}
            title="Next page"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 28,
              height: 28,
              borderRadius: "8px",
              border: "none",
              background: "transparent",
              color: currentPage >= numPages ? "#c0c0c0" : "#555",
              cursor: currentPage >= numPages ? "default" : "pointer",
              transition: "background 0.15s ease, color 0.15s ease",
            }}
            onMouseEnter={(e) => {
              if (currentPage < numPages) {
                e.currentTarget.style.background = "rgba(0,0,0,0.06)";
                e.currentTarget.style.color = "#222";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = currentPage >= numPages ? "#c0c0c0" : "#555";
            }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M6 3L11 8L6 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};

export default PdfPreview;
