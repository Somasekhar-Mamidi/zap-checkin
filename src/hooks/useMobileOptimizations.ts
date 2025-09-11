import { useEffect, useState } from 'react';

export const useMobileOptimizations = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const requestFullscreen = () => {
    const element = document.documentElement;
    if (element.requestFullscreen) {
      element.requestFullscreen();
      setIsFullscreen(true);
    }
  };

  const exitFullscreen = () => {
    if (document.exitFullscreen) {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const vibrate = (pattern: number | number[] = 100) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  };

  const enableTorch = async (track: MediaStreamTrack) => {
    try {
      const capabilities = track.getCapabilities() as any;
      if (capabilities.torch) {
        await track.applyConstraints({
          advanced: [{ torch: true } as any]
        });
        return true;
      }
    } catch (error) {
      console.warn('Torch not supported or failed to enable:', error);
    }
    return false;
  };

  const disableTorch = async (track: MediaStreamTrack) => {
    try {
      await track.applyConstraints({
        advanced: [{ torch: false } as any]
      });
    } catch (error) {
      console.warn('Failed to disable torch:', error);
    }
  };

  return {
    isMobile,
    isFullscreen,
    requestFullscreen,
    exitFullscreen,
    vibrate,
    enableTorch,
    disableTorch
  };
};