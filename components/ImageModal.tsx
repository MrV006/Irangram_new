
import React, { useState, useEffect } from 'react';
import { X, Download, ChevronLeft, ChevronRight } from 'lucide-react';

interface ImageModalProps {
  images: { url: string; id: string }[];
  initialImageId: string;
  onClose: () => void;
}

const ImageModal: React.FC<ImageModalProps> = ({ images, initialImageId, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const index = images.findIndex(img => img.id === initialImageId);
    if (index !== -1) setCurrentIndex(index);
  }, [initialImageId, images]);

  const handleNext = (e: React.MouseEvent) => {
      e.stopPropagation();
      setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const handlePrev = (e: React.MouseEvent) => {
      e.stopPropagation();
      setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setCurrentIndex((prev) => (prev + 1) % images.length);
      if (e.key === 'ArrowLeft') setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
      if (e.key === 'Escape') onClose();
  };

  useEffect(() => {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const currentImage = images[currentIndex];

  if (!currentImage) return null;

  return (
    <div 
      className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center animate-fade-in backdrop-blur-sm" 
      onClick={onClose}
    >
      <button 
        onClick={onClose} 
        className="absolute top-4 right-4 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-50 backdrop-blur-md"
      >
        <X size={24} />
      </button>
      
      <a 
        href={currentImage.url} 
        download 
        onClick={(e) => e.stopPropagation()}
        className="absolute top-4 left-4 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-50 backdrop-blur-md"
        title="دانلود تصویر"
      >
        <Download size={24} />
      </a>

      {/* Navigation Buttons */}
      {images.length > 1 && (
          <>
            <button 
                onClick={handlePrev}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-50 backdrop-blur-md"
            >
                <ChevronLeft size={32} />
            </button>
            <button 
                onClick={handleNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-50 backdrop-blur-md"
            >
                <ChevronRight size={32} />
            </button>
          </>
      )}

      {/* Counter */}
      {images.length > 1 && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/50 px-4 py-1 rounded-full text-white text-sm font-mono backdrop-blur-md">
              {currentIndex + 1} / {images.length}
          </div>
      )}

      <div className="w-full h-full p-4 flex items-center justify-center">
        <img 
          key={currentImage.id} // Key ensures animation/refresh on change
          src={currentImage.url} 
          alt="Full view" 
          className="max-w-full max-h-full object-contain select-none shadow-2xl rounded-md animate-fade-in"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    </div>
  );
};

export default ImageModal;
