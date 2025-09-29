import * as XLSX from 'xlsx';
import type { Attendee } from '@/components/EventDashboard';

interface ExcelExportOptions {
  includeQRImages: boolean;
  qrImageSize: number;
  includeMetadata: boolean;
  selectedAttendees?: string[];
}

export interface AttendeeWithQR extends Attendee {
  qrImageData?: string;
}

export const exportAttendeesToExcel = async (
  attendees: AttendeeWithQR[],
  qrImages: Record<string, string>,
  options: ExcelExportOptions = {
    includeQRImages: true,
    qrImageSize: 100,
    includeMetadata: true
  }
): Promise<void> => {
  try {
    // Filter attendees if specific ones are selected
    const filteredAttendees = options.selectedAttendees 
      ? attendees.filter(a => options.selectedAttendees!.includes(a.id))
      : attendees;

    // Create a new workbook
    const workbook = XLSX.utils.book_new();

    // Create main data sheet
    const mainSheetData = await createMainSheetData(filteredAttendees, qrImages, options);
    const mainSheet = XLSX.utils.aoa_to_sheet(mainSheetData);
    
    // Add styling and formatting to main sheet
    formatMainSheet(mainSheet, filteredAttendees.length);
    
    XLSX.utils.book_append_sheet(workbook, mainSheet, 'Attendee QR Codes');

    // Create QR codes only sheet if images are included
    if (options.includeQRImages) {
      const qrSheetData = createQROnlySheetData(filteredAttendees, qrImages);
      const qrSheet = XLSX.utils.aoa_to_sheet(qrSheetData);
      formatQRSheet(qrSheet, filteredAttendees.length);
      XLSX.utils.book_append_sheet(workbook, qrSheet, 'QR Codes Only');
    }

    // Create summary sheet if metadata is included
    if (options.includeMetadata) {
      const summaryData = createSummarySheetData(filteredAttendees, options);
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      formatSummarySheet(summarySheet);
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
    }

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `Attendee_QR_Codes_${timestamp}.xlsx`;

    // Write and download the file
    XLSX.writeFile(workbook, filename);

  } catch (error) {
    console.error('Error exporting to Excel:', error);
    throw new Error('Failed to export to Excel');
  }
};

const createMainSheetData = async (
  attendees: AttendeeWithQR[],
  qrImages: Record<string, string>,
  options: ExcelExportOptions
): Promise<any[][]> => {
  const headers = ['Name', 'Official Email ID', 'Company', 'QR Code Text', 'Registration Type'];
  if (options.includeQRImages) {
    headers.push('QR Code Image');
  }

  const data: any[][] = [headers];

  for (const attendee of attendees) {
    const row = [
      attendee.name,
      attendee.email,
      attendee.company || 'N/A',
      attendee.qrCode || 'N/A',
      attendee.registrationType || 'pre_registered'
    ];

    if (options.includeQRImages && qrImages[attendee.id]) {
      // For now, we'll include the base64 data URL
      // In a more advanced implementation, you could embed actual images
      row.push(qrImages[attendee.id]);
    }

    data.push(row);
  }

  return data;
};

const createQROnlySheetData = (
  attendees: AttendeeWithQR[],
  qrImages: Record<string, string>
): any[][] => {
  const headers = ['Name', 'QR Code Text', 'QR Code Image (Base64)'];
  const data: any[][] = [headers];

  attendees.forEach(attendee => {
    if (qrImages[attendee.id]) {
      data.push([
        attendee.name,
        attendee.qrCode || 'N/A',
        qrImages[attendee.id]
      ]);
    }
  });

  return data;
};

const createSummarySheetData = (
  attendees: AttendeeWithQR[],
  options: ExcelExportOptions
): any[][] => {
  const totalAttendees = attendees.length;
  const preRegistered = attendees.filter(a => a.registrationType === 'pre_registered').length;
  const walkIns = attendees.filter(a => a.registrationType === 'walk_in').length;
  const withQRCodes = attendees.filter(a => a.qrCode).length;
  const checkedIn = attendees.filter(a => a.checkedIn).length;

  return [
    ['Event QR Codes Summary'],
    [''],
    ['Export Details'],
    ['Export Date:', new Date().toLocaleString()],
    ['Export Options:'],
    ['- Include QR Images:', options.includeQRImages ? 'Yes' : 'No'],
    ['- QR Image Size:', `${options.qrImageSize}px`],
    ['- Include Metadata:', options.includeMetadata ? 'Yes' : 'No'],
    [''],
    ['Attendee Statistics'],
    ['Total Attendees:', totalAttendees],
    ['Pre-registered:', preRegistered],
    ['Walk-ins:', walkIns],
    ['With QR Codes:', withQRCodes],
    ['Already Checked In:', checkedIn],
    [''],
    ['Registration Types'],
    ['Pre-registered:', `${preRegistered} (${((preRegistered / totalAttendees) * 100).toFixed(1)}%)`],
    ['Walk-in:', `${walkIns} (${((walkIns / totalAttendees) * 100).toFixed(1)}%)`],
    [''],
    ['Check-in Status'],
    ['Checked In:', `${checkedIn} (${((checkedIn / totalAttendees) * 100).toFixed(1)}%)`],
    ['Pending:', `${totalAttendees - checkedIn} (${(((totalAttendees - checkedIn) / totalAttendees) * 100).toFixed(1)}%)`]
  ];
};

const formatMainSheet = (sheet: XLSX.WorkSheet, attendeeCount: number) => {
  // Set column widths
  const columnWidths = [
    { wch: 25 }, // Name
    { wch: 30 }, // Email
    { wch: 20 }, // Company
    { wch: 15 }, // QR Code Text
    { wch: 18 }, // Registration Type
    { wch: 20 }  // QR Code Image
  ];
  sheet['!cols'] = columnWidths;

  // Set row heights (make them taller for QR images)
  const rowHeights = [];
  rowHeights.push({ hpt: 25 }); // Header row
  for (let i = 0; i < attendeeCount; i++) {
    rowHeights.push({ hpt: 80 }); // Data rows - taller for QR images
  }
  sheet['!rows'] = rowHeights;
};

const formatQRSheet = (sheet: XLSX.WorkSheet, attendeeCount: number) => {
  // Set column widths for QR sheet
  const columnWidths = [
    { wch: 25 }, // Name
    { wch: 15 }, // QR Code Text
    { wch: 50 }  // QR Code Image (wider for base64)
  ];
  sheet['!cols'] = columnWidths;

  // Set row heights
  const rowHeights = [];
  rowHeights.push({ hpt: 25 }); // Header row
  for (let i = 0; i < attendeeCount; i++) {
    rowHeights.push({ hpt: 120 }); // Even taller for large QR images
  }
  sheet['!rows'] = rowHeights;
};

const formatSummarySheet = (sheet: XLSX.WorkSheet) => {
  // Set column widths for summary
  const columnWidths = [
    { wch: 30 }, // Description
    { wch: 20 }  // Value
  ];
  sheet['!cols'] = columnWidths;
};

// Utility function to convert base64 image to blob for advanced implementations
export const base64ToBlob = (base64: string, mimeType: string = 'image/png'): Blob => {
  const byteCharacters = atob(base64.split(',')[1]);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
};

// Function to create downloadable images from base64 for manual sharing
export const downloadQRImagesAsZip = async (
  attendees: AttendeeWithQR[],
  qrImages: Record<string, string>
): Promise<void> => {
  // This would require a zip library like JSZip
  // For now, we'll download individual images in sequence
  for (const attendee of attendees) {
    if (qrImages[attendee.id]) {
      const link = document.createElement('a');
      link.download = `QR_${attendee.name.replace(/\s+/g, '_')}.png`;
      link.href = qrImages[attendee.id];
      link.click();
      
      // Add small delay between downloads to prevent browser blocking
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
};