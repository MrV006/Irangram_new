
import React, { useEffect, useRef } from 'react';
import { CONFIG } from '../config';
import { Megaphone, ExternalLink, X } from 'lucide-react';

interface AdBannerProps {
  slotId: string;
  format?: 'rectangle' | 'banner' | 'horizontal';
  className?: string;
  onClose?: () => void;
}

const AdBanner: React.FC<AdBannerProps> = ({ slotId, format = 'banner', className = '', onClose }) => {
  const adRef = useRef<HTMLDivElement>(null);

  if (!CONFIG.ADS.ENABLED) return null;

  // Mock Ad Component (For visual testing)
  if (CONFIG.ADS.USE_MOCK) {
    return (
      <div className={`relative overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center text-center p-3 select-none group transition-all ${format === 'rectangle' ? 'h-64 w-full rounded-xl' : 'h-16 w-full'} ${className}`}>
        
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5 dark:opacity-10 bg-[radial-gradient(#3390ec_1px,transparent_1px)] [background-size:16px_16px]"></div>
        
        {/* Ad Label */}
        <div className="absolute top-1 left-1 bg-gray-200 dark:bg-gray-700 text-[9px] px-1 rounded text-gray-500 font-bold uppercase tracking-wider">
          تبلیغات
        </div>

        {onClose && (
            <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="absolute top-1 right-1 p-1 bg-black/10 hover:bg-black/20 dark:bg-white/10 dark:hover:bg-white/20 rounded-full text-gray-500 dark:text-gray-400">
                <X size={10} />
            </button>
        )}

        {/* Content */}
        <div className="z-10 flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                <Megaphone size={20} className="animate-pulse" />
            </div>
            <div className="text-right">
                <h4 className="text-xs font-bold text-gray-800 dark:text-gray-100">فضای تبلیغاتی شما</h4>
                <p className="text-[10px] text-gray-500 dark:text-gray-400">برای رزرو این جایگاه تماس بگیرید</p>
            </div>
            <a href="#" className="mr-auto p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-[10px] font-bold flex items-center gap-1">
                دیدن <ExternalLink size={10} />
            </a>
        </div>
      </div>
    );
  }

  // Real Ad Container (Place your ad script logic here)
  /*
    Example for Yektanet or AdSense:
    useEffect(() => {
        // Inject script here based on slotId
    }, []);
  */

  return (
    <div 
        id={slotId} 
        ref={adRef} 
        className={`bg-gray-50 dark:bg-black/20 flex items-center justify-center ${className}`}
        style={{ minHeight: format === 'banner' ? '60px' : '250px' }}
    >
        {/* Ad Network Script will inject content here */}
    </div>
  );
};

export default AdBanner;
