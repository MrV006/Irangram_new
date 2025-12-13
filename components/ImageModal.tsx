
import React, { useState, useEffect, useRef } from 'react';
import { X, Download, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ImageModalProps {
  images: { url: string; id: string }[];
  initialImageId: string;
  onClose: () => void;
}

const ImageModal: React.FC<ImageModalProps> = ({ images, initialImageId, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [scale, setScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const index = images.findIndex(img => img.id === initialImageId);
    if (index !== -1) setCurrentIndex(index);
  }, [initialImageId, images]);

  // Reset scale on image change
  useEffect(() => {
      setScale(1);
  }, [currentIndex]);

  const handleNext = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (currentIndex < images.length - 1) {
          setCurrentIndex(prev => prev + 1);
      } else {
          setCurrentIndex(0); // Loop
      }
  };

  const handlePrev = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (currentIndex > 0) {
          setCurrentIndex(prev => prev - 1);
      } else {
          setCurrentIndex(images.length - 1); // Loop
      }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') handleNext({ stopPropagation: () => {} } as any);
      if (e.key === 'ArrowLeft') handlePrev({ stopPropagation: () => {} } as any);
      if (e.key === 'Escape') onClose();
  };

  useEffect(() => {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex]); // Add dependency to capture latest index

  const zoomIn = (e?: React.MouseEvent) => { e?.stopPropagation(); setScale(prev => Math.min(prev + 0.5, 4)); };
  const zoomOut = (e?: React.MouseEvent) => { e?.stopPropagation(); setScale(prev => Math.max(prev - 0.5, 1)); };
  const resetZoom = (e?: React.MouseEvent) => { e?.stopPropagation(); setScale(1); };

  const currentImage = images[currentIndex];

  if (!currentImage) return null;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[150] bg-black/95 flex items-center justify-center backdrop-blur-sm overflow-hidden" 
      onClick={onClose}
    >
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-50 bg-gradient-to-b from-black/60 to-transparent pointer-events-none">
          <div className="flex gap-3 pointer-events-auto">
              <a 
                href={currentImage.url} 
                download 
                onClick={(e) => e.stopPropagation()}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors backdrop-blur-md"
                title="دانلود"
              >
                <Download size={20} />
              </a>
              <button 
                onClick={resetZoom}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors backdrop-blur-md"
                title="بازنشانی زوم"
              >
                <RotateCcw size={20} />
              </button>
          </div>

          <button 
            onClick={onClose} 
            className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors backdrop-blur-md pointer-events-auto"
          >
            <X size={24} />
          </button>
      </div>

      {/* Navigation Buttons */}
      {images.length > 1 && (
          <>
            <button 
                onClick={handlePrev}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-50 backdrop-blur-md pointer-events-auto"
            >
                <ChevronLeft size={32} />
            </button>
            <button 
                onClick={handleNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-50 backdrop-blur-md pointer-events-auto"
            >
                <ChevronRight size={32} />
            </button>
          </>
      )}

      {/* Zoom Controls (Bottom) */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 z-50 pointer-events-none">
          <div className="bg-black/50 backdrop-blur-md rounded-full px-4 py-2 flex items-center gap-4 text-white pointer-events-auto border border-white/10">
              <button onClick={zoomOut} disabled={scale <= 1} className="hover:text-telegram-primary disabled:opacity-50"><ZoomOut size={20}/></button>
              <span className="text-xs font-mono w-12 text-center">{Math.round(scale * 100)}%</span>
              <button onClick={zoomIn} disabled={scale >= 4} className="hover:text-telegram-primary disabled:opacity-50"><ZoomIn size={20}/></button>
          </div>
          <div className="bg-black/50 px-4 py-2 rounded-full text-white text-xs font-mono backdrop-blur-md border border-white/10">
              {currentIndex + 1} / {images.length}
          </div>
      </div>

      {/* Image Container */}
      <div 
        className="w-full h-full flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing"
        ref={containerRef}
        onClick={(e) => e.stopPropagation()}
      >
        <AnimatePresence mode="wait">
            <motion.img 
              key={currentImage.id}
              src={currentImage.url} 
              alt="Full view" 
              
              // Animation for slide change
              initial={{ opacity: 0, x: 50 }}
              animate={{ 
                  opacity: 1, 
                  x: 0, 
                  scale: scale,
                  transition: { duration: 0.2 } 
              }}
              exit={{ opacity: 0, x: -50 }}
              
              // Drag functionality
              drag
              dragConstraints={containerRef}
              dragElastic={0.1}
              // Reset position on drag end if not zoomed in, else strict movement
              dragSnapToOrigin={scale === 1}
              
              className="max-w-full max-h-full object-contain select-none shadow-2xl"
              style={{ touchAction: 'none' }}
              onDoubleClick={(e) => {
                  e.stopPropagation();
                  setScale(prev => prev === 1 ? 2.5 : 1);
              }}
            />
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default ImageModal;
