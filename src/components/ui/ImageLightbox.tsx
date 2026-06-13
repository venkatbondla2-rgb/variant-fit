"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { X, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

interface ImageLightboxProps {
  src: string;
  alt?: string;
  onClose: () => void;
}

export function ImageLightbox({ src, alt = "Image", onClose }: ImageLightboxProps) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const posStart = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  // Scroll to zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setScale((prev) => {
      const next = prev + (e.deltaY < 0 ? 0.3 : -0.3);
      return Math.max(0.5, Math.min(5, next));
    });
  }, []);

  // Mouse drag
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (scale <= 1) return;
    e.preventDefault();
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
    posStart.current = { ...position };
  }, [scale, position]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setPosition({ x: posStart.current.x + dx, y: posStart.current.y + dy });
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Touch events for mobile pinch-to-zoom
  const touchStartDist = useRef(0);
  const touchStartScale = useRef(1);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      touchStartDist.current = Math.sqrt(dx * dx + dy * dy);
      touchStartScale.current = scale;
    } else if (e.touches.length === 1 && scale > 1) {
      dragStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      posStart.current = { ...position };
      setIsDragging(true);
    }
  }, [scale, position]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const newScale = touchStartScale.current * (dist / touchStartDist.current);
      setScale(Math.max(0.5, Math.min(5, newScale)));
    } else if (e.touches.length === 1 && isDragging) {
      const dx = e.touches[0].clientX - dragStart.current.x;
      const dy = e.touches[0].clientY - dragStart.current.y;
      setPosition({ x: posStart.current.x + dx, y: posStart.current.y + dy });
    }
  }, [isDragging]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  const resetZoom = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const zoomIn = () => setScale((prev) => Math.min(5, prev + 0.5));
  const zoomOut = () => {
    setScale((prev) => {
      const next = Math.max(0.5, prev - 0.5);
      if (next <= 1) setPosition({ x: 0, y: 0 });
      return next;
    });
  };

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/90 backdrop-blur-md"
        onClick={onClose}
        style={{ animation: "scale-fade-in 0.2s ease-out" }}
      />

      {/* Controls */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2" style={{ animation: "fade-in-up 0.3s ease-out 0.1s both" }}>
        <button onClick={zoomOut} className="w-10 h-10 rounded-full glass-card flex items-center justify-center text-white hover:text-brand transition-colors" title="Zoom Out">
          <ZoomOut className="w-5 h-5" />
        </button>
        <span className="text-white text-xs font-bold min-w-[40px] text-center">{Math.round(scale * 100)}%</span>
        <button onClick={zoomIn} className="w-10 h-10 rounded-full glass-card flex items-center justify-center text-white hover:text-brand transition-colors" title="Zoom In">
          <ZoomIn className="w-5 h-5" />
        </button>
        <button onClick={resetZoom} className="w-10 h-10 rounded-full glass-card flex items-center justify-center text-white hover:text-brand transition-colors" title="Reset">
          <RotateCcw className="w-5 h-5" />
        </button>
        <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors ml-2" title="Close">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Zoom hint */}
      {scale === 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 text-zinc-400 text-xs flex items-center gap-2 glass-card px-4 py-2 rounded-full" style={{ animation: "fade-in-up 0.3s ease-out 0.2s both" }}>
          <ZoomIn className="w-3 h-3" /> Scroll or pinch to zoom
        </div>
      )}

      {/* Image */}
      <div
        ref={containerRef}
        className="relative z-[1] max-w-[90vw] max-h-[85vh] overflow-hidden select-none"
        style={{ cursor: scale > 1 ? (isDragging ? "grabbing" : "grab") : "zoom-in" }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={(e) => {
          if (scale === 1) {
            e.stopPropagation();
            zoomIn();
          }
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg pointer-events-none"
          style={{
            transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
            transition: isDragging ? "none" : "transform 0.2s ease-out",
            animation: "scale-fade-in 0.3s ease-out",
          }}
          draggable={false}
        />
      </div>
    </div>
  );
}
