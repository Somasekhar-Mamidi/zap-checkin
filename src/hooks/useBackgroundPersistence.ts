import { useState, useEffect, useCallback } from 'react';
import type { QRCompositionOptions } from '@/lib/qr-canvas';

const STORAGE_KEY = 'qr-background-data';
const OPTIONS_KEY = 'qr-background-options';

interface BackgroundData {
  file: string; // base64 encoded file
  name: string;
  type: string;
  size: number;
}

export const useBackgroundPersistence = () => {
  const [backgroundFile, setBackgroundFile] = useState<File | null>(null);
  const [backgroundPreview, setBackgroundPreview] = useState<string | null>(null);
  const [qrOptions, setQrOptions] = useState<QRCompositionOptions>({
    qrSize: 200,
    qrOpacity: 1,
    position: 'center',
    backgroundOpacity: 1,
    logoEnabled: true,
    logoSize: 0.2,
  });

  // Load background from localStorage on mount
  useEffect(() => {
    try {
      const savedBackground = localStorage.getItem(STORAGE_KEY);
      const savedOptions = localStorage.getItem(OPTIONS_KEY);
      
      if (savedBackground) {
        const backgroundData: BackgroundData = JSON.parse(savedBackground);
        
        // Convert base64 back to File
        fetch(backgroundData.file)
          .then(res => res.blob())
          .then(blob => {
            const file = new File([blob], backgroundData.name, { type: backgroundData.type });
            setBackgroundFile(file);
            setBackgroundPreview(backgroundData.file);
          });
      }
      
      if (savedOptions) {
        setQrOptions(JSON.parse(savedOptions));
      }
    } catch (error) {
      console.error('Error loading background from storage:', error);
    }
  }, []);

  const saveBackground = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      const backgroundData: BackgroundData = {
        file: base64,
        name: file.name,
        type: file.type,
        size: file.size
      };
      
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(backgroundData));
        setBackgroundFile(file);
        setBackgroundPreview(base64);
      } catch (error) {
        console.error('Error saving background:', error);
      }
    };
    reader.readAsDataURL(file);
  }, []);

  const removeBackground = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setBackgroundFile(null);
    setBackgroundPreview(null);
  }, []);

  const updateQrOptions = useCallback((newOptions: Partial<QRCompositionOptions>) => {
    const updatedOptions = { ...qrOptions, ...newOptions };
    setQrOptions(updatedOptions);
    localStorage.setItem(OPTIONS_KEY, JSON.stringify(updatedOptions));
  }, [qrOptions]);

  return {
    backgroundFile,
    backgroundPreview,
    qrOptions,
    saveBackground,
    removeBackground,
    updateQrOptions,
  };
};