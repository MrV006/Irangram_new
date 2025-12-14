
import React, { useRef } from 'react';
import { CONFIG } from '../config';
import { Megaphone, ExternalLink, X } from 'lucide-react';
import { AdSettings } from '../types';

interface AdBannerProps {
  slotId: string;
  format?: 'rectangle' | 'banner' | 'horizontal';
  className?: string;
  onClose?: () => void;
  adSettings?: AdSettings | null;
}

const AdBanner: React.FC<AdBannerProps> = ({ slotId, format = 'banner', className = '', onClose, adSettings }) => {
  const adRef = useRef<HTMLDivElement>(null);

  // Fallback to static config if no dynamic settings provided
  const settings = adSettings || {
      enabled: CONFIG.ADS.ENABLED,
      useMock: CONFIG.ADS.USE_MOCK,
      customAd: undefined
  };

  if (!settings.enabled) return null;

  // 1. Custom Ad Render (Highest Priority)
  if (settings.customAd?.isActive && settings.customAd.imageUrl) {
      return (
          <div className={`relative overflow-hidden rounded-xl group transition-all cursor-pointer ${className}`} onClick={() => window.open(settings.customAd!.linkUrl, '_blank')}>
              <img src={settings.customAd.imageUrl} className="w-full h-full object-cover" alt="Advertisement" />
              
              <div className="absolute top-1 left-1 bg-black/50 text-white text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider backdrop-blur-sm">
                  Sponsored
              </div>
              
              {settings.customAd.title && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 pt-6 text-white text-xs font-bold">
                      {settings.customAd.title}
                  </div>
              )}

              {onClose && (
                <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="absolute top-1 right-1 p-1 bg-black/30 hover:bg-black/50 rounded-full text-white backdrop-blur-sm">
                    <X size={12} />
                </button>
              )}
          </div>
      );
  }

  // 2. Mock Ad Component (For visual testing or fallback)
  if (settings.useMock) {
    return (
      <div className={`relative overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center text-center p-3 select-none group transition-all ${format === 'rectangle' ? 'h-64 w-full rounded-xl' : 'h-16 w-full'} ${className}`}>
        
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5 dark:opacity-10 bg-[radial-gradient(#3390ec_1px,transparent_1px)] [background-size:16px_16px]"></div>
        
        {/* Label */}
        <div className="absolute top-1 left-1 bg-gray-200 dark:bg-gray-700 text-[9px] px-1 rounded text-gray-500 font-bold uppercase tracking-wider">
          Sponsored
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

  // 3. Real Ad Container (Script Injection)
  // Ensure strict compliance with Yektanet Anti-Adblock rules:
  // - No "ad", "banner", "advertise" in class names.
  // - ID must match slot ID exactly.
  // - No display:none on container initially.
  
  return (
    <div 
        className={`bg-transparent ${className}`}
        style={{ minHeight: format === 'banner' ? '60px' : (format === 'rectangle' ? '250px' : 'auto') }}
    >
        {/* The specific ID here allows Yektanet script to find and inject iframe/content */}
        <div id={slotId} ref={adRef}></div>
    </div>
  );
};

export default AdBanner;
