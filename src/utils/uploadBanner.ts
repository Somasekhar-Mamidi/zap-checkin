import { supabase } from "@/integrations/supabase/client";

export const uploadBannerToStorage = async () => {
  try {
    // Convert the banner image to base64
    const response = await fetch('/assets/email-banner.png');
    const blob = await response.blob();
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Data = reader.result as string;
          
          // Call the upload-banner edge function
          const { data, error } = await supabase.functions.invoke('upload-banner', {
            body: { imageData: base64Data }
          });

          if (error) {
            console.error('Error uploading banner:', error);
            reject(error);
          } else {
            console.log('Banner uploaded successfully:', data);
            resolve(data);
          }
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error preparing banner for upload:', error);
    throw error;
  }
};