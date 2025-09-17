// Simple Canvas utility for QR code background composition
export interface QRCompositionOptions {
  background?: File | string;
  qrSize: number;
  qrOpacity: number;
  position: 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  backgroundOpacity: number;
  logoEnabled?: boolean;
  logoSize?: number;
}

export const loadImageFromFile = (file: File): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    
    img.src = url;
  });
};

export const loadImageFromDataURL = (dataURL: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image from data URL'));
    
    img.src = dataURL;
  });
};

export const embedLogoInQR = async (
  qrDataURL: string,
  logoPath: string = '/assets/juspay-logo.png',
  logoSize: number = 0.2
): Promise<string> => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Canvas context not available');
  }

  // Load QR code image
  const qrImage = await loadImageFromDataURL(qrDataURL);
  
  // Set canvas dimensions to QR code size
  canvas.width = qrImage.width;
  canvas.height = qrImage.height;
  
  // Draw QR code
  ctx.drawImage(qrImage, 0, 0);
  
  try {
    // Load logo
    const logoImage = new Image();
    await new Promise((resolve, reject) => {
      logoImage.onload = resolve;
      logoImage.onerror = reject;
      logoImage.src = logoPath;
    });
    
    // Calculate logo dimensions (percentage of QR size)
    const logoWidth = canvas.width * logoSize;
    const logoHeight = (logoImage.height / logoImage.width) * logoWidth;
    
    // Calculate center position
    const logoX = (canvas.width - logoWidth) / 2;
    const logoY = (canvas.height - logoHeight) / 2;
    
    // Create white circular background for better logo visibility
    const radius = Math.max(logoWidth, logoHeight) * 0.6;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, radius, 0, 2 * Math.PI);
    ctx.fill();
    
    // Add subtle border around white background
    ctx.strokeStyle = '#E5E7EB';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Draw logo
    ctx.drawImage(logoImage, logoX, logoY, logoWidth, logoHeight);
    
  } catch (error) {
    console.warn('Failed to load logo, proceeding without it:', error);
    // Logo loading failed, but we continue with just the QR code
  }
  
  return canvas.toDataURL('image/png', 1.0);
};

export const composeQRWithBackground = async (
  qrDataURL: string,
  options: QRCompositionOptions
): Promise<string> => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Canvas context not available');
  }

  // Load QR code image
  const qrImage = await loadImageFromDataURL(qrDataURL);
  
  let backgroundImage: HTMLImageElement | null = null;
  
  // Load background if provided
  if (options.background) {
    if (options.background instanceof File) {
      backgroundImage = await loadImageFromFile(options.background);
    } else if (typeof options.background === 'string') {
      backgroundImage = await loadImageFromDataURL(options.background);
    }
  }

  // Set canvas dimensions based on background or default
  if (backgroundImage) {
    canvas.width = backgroundImage.width;
    canvas.height = backgroundImage.height;
  } else {
    // Default canvas size if no background
    canvas.width = 400;
    canvas.height = 400;
    // Fill with white background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // Draw background image if provided
  if (backgroundImage) {
    ctx.globalAlpha = options.backgroundOpacity;
    ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 1; // Reset alpha
  }

  // Calculate QR position
  const qrWidth = options.qrSize;
  const qrHeight = options.qrSize;
  
  let qrX: number;
  let qrY: number;

  switch (options.position) {
    case 'center':
      qrX = (canvas.width - qrWidth) / 2;
      qrY = (canvas.height - qrHeight) / 2;
      break;
    case 'top-left':
      qrX = 20;
      qrY = 20;
      break;
    case 'top-right':
      qrX = canvas.width - qrWidth - 20;
      qrY = 20;
      break;
    case 'bottom-left':
      qrX = 20;
      qrY = canvas.height - qrHeight - 20;
      break;
    case 'bottom-right':
      qrX = canvas.width - qrWidth - 20;
      qrY = canvas.height - qrHeight - 20;
      break;
    default:
      qrX = (canvas.width - qrWidth) / 2;
      qrY = (canvas.height - qrHeight) / 2;
  }

  // Draw QR code with opacity
  ctx.globalAlpha = options.qrOpacity;
  ctx.drawImage(qrImage, qrX, qrY, qrWidth, qrHeight);
  ctx.globalAlpha = 1; // Reset alpha

  return canvas.toDataURL('image/png', 1.0);
};