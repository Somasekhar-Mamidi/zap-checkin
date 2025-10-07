import ExcelJS from 'exceljs';
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
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Event QR Generator';
    workbook.lastModifiedBy = 'Event QR Generator';
    workbook.created = new Date();
    workbook.modified = new Date();

    // Create main data sheet
    await createMainSheet(workbook, filteredAttendees, qrImages, options);

    // Create QR codes only sheet if images are included
    if (options.includeQRImages) {
      await createQROnlySheet(workbook, filteredAttendees, qrImages, options);
    }

    // Create summary sheet if metadata is included
    if (options.includeMetadata) {
      createSummarySheet(workbook, filteredAttendees, options);
    }

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `Attendee_QR_Codes_${timestamp}.xlsx`;

    // Write and download the file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    
    // Clean up
    URL.revokeObjectURL(link.href);

  } catch (error) {
    console.error('Error exporting to Excel:', error);
    throw new Error('Failed to export to Excel');
  }
};

const createMainSheet = async (
  workbook: ExcelJS.Workbook,
  attendees: AttendeeWithQR[],
  qrImages: Record<string, string>,
  options: ExcelExportOptions
): Promise<void> => {
  const worksheet = workbook.addWorksheet('Attendee QR Codes');

  // Set up headers
  const headers = ['Name', 'Email ID', 'Company', 'QR Code'];

  // Add headers
  worksheet.addRow(headers);

  // Style headers
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '366092' } };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height = 30;

  // Set column widths
  worksheet.getColumn(1).width = 30; // Name
  worksheet.getColumn(2).width = 40; // Email
  worksheet.getColumn(3).width = 25; // Company
  worksheet.getColumn(4).width = 18; // QR Code

  // Add data rows with QR images
  for (let i = 0; i < attendees.length; i++) {
    const attendee = attendees[i];
    const rowNumber = i + 2; // +2 because Excel is 1-indexed and we have a header
    
    // Add text data
    const row = worksheet.addRow([
      attendee.name,
      attendee.email,
      attendee.company || 'N/A',
      '' // QR Code column (image will be placed here)
    ]);

    // Style the row
    row.alignment = { vertical: 'middle', horizontal: 'left' };
    row.height = 120; // Fixed height for QR code cell
    
    // Center align the QR code column
    const qrCell = worksheet.getCell(rowNumber, 4);
    qrCell.alignment = { vertical: 'middle', horizontal: 'center' };

    // Add QR code image if available
    if (options.includeQRImages && qrImages[attendee.id]) {
      try {
        // Convert base64 to Uint8Array (browser-compatible)
        const base64Data = qrImages[attendee.id].split(',')[1];
        const binaryString = atob(base64Data);
        const imageBuffer = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          imageBuffer[i] = binaryString.charCodeAt(i);
        }
        
        // Add image to workbook
        const imageId = workbook.addImage({
          buffer: imageBuffer,
          extension: 'png',
        });

        // Add image to worksheet - positioned in column 4 (0-indexed = 3)
        worksheet.addImage(imageId, {
          tl: { col: 3, row: rowNumber - 1 }, // Column 4, perfectly aligned
          ext: { width: 110, height: 110 } // Fixed size to fit in 120px cell
        });
      } catch (error) {
        console.warn(`Failed to add QR image for ${attendee.name}:`, error);
      }
    }
  }

  // Add borders to all cells
  const totalRows = attendees.length + 1;
  const totalCols = 4; // Name, Email ID, Company, QR Code
  
  for (let row = 1; row <= totalRows; row++) {
    for (let col = 1; col <= totalCols; col++) {
      const cell = worksheet.getCell(row, col);
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    }
  }
};

const createQROnlySheet = async (
  workbook: ExcelJS.Workbook,
  attendees: AttendeeWithQR[],
  qrImages: Record<string, string>,
  options: ExcelExportOptions
): Promise<void> => {
  const worksheet = workbook.addWorksheet('QR Codes Only');

  // Set up headers
  const headers = ['Name', 'Company', 'QR Code Text', 'QR Code Image'];
  worksheet.addRow(headers);

  // Style headers
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '366092' } };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height = 30;

  // Set column widths for larger QR images
  worksheet.getColumn(1).width = 25; // Name
  worksheet.getColumn(2).width = 25; // Company
  worksheet.getColumn(3).width = 20; // QR Code Text
  worksheet.getColumn(4).width = 20; // QR Code Image

  // Add data rows with larger QR images
  for (let i = 0; i < attendees.length; i++) {
    const attendee = attendees[i];
    const rowNumber = i + 2;
    
    if (qrImages[attendee.id]) {
      // Add text data
      const row = worksheet.addRow([
        attendee.name,
        attendee.company || 'N/A',
        attendee.qrCode || 'N/A',
        '' // Empty cell for QR image
      ]);

      // Style the row
      row.alignment = { vertical: 'middle', horizontal: 'left' };
      row.height = 120; // Larger height for bigger QR codes

      try {
        // Convert base64 to Uint8Array (browser-compatible)
        const base64Data = qrImages[attendee.id].split(',')[1];
        const binaryString = atob(base64Data);
        const imageBuffer = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          imageBuffer[i] = binaryString.charCodeAt(i);
        }
        
        // Add image to workbook
        const imageId = workbook.addImage({
          buffer: imageBuffer,
          extension: 'png',
        });

        // Add larger image to worksheet
        worksheet.addImage(imageId, {
          tl: { col: 3, row: rowNumber - 1 }, // Top-left position (0-indexed)
          ext: { width: 100, height: 100 } // Larger size for QR-only sheet
        });
      } catch (error) {
        console.warn(`Failed to add QR image for ${attendee.name}:`, error);
      }
    }
  }

  // Add borders
  const totalRows = attendees.filter(a => qrImages[a.id]).length + 1;
  const totalCols = 4;
  
  for (let row = 1; row <= totalRows; row++) {
    for (let col = 1; col <= totalCols; col++) {
      const cell = worksheet.getCell(row, col);
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    }
  }
};

const createSummarySheet = (
  workbook: ExcelJS.Workbook,
  attendees: AttendeeWithQR[],
  options: ExcelExportOptions
): void => {
  const worksheet = workbook.addWorksheet('Summary');

  const totalAttendees = attendees.length;
  const preRegistered = attendees.filter(a => a.registrationType === 'pre_registered').length;
  const walkIns = attendees.filter(a => a.registrationType === 'walk_in').length;
  const withQRCodes = attendees.filter(a => a.qrCode).length;
  const checkedIn = attendees.filter(a => a.checkedIn).length;

  // Add summary data
  const summaryData = [
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

  summaryData.forEach(row => {
    worksheet.addRow(row);
  });

  // Style the title
  const titleCell = worksheet.getCell('A1');
  titleCell.font = { bold: true, size: 16, color: { argb: '366092' } };

  // Style section headers
  [3, 10, 17, 21].forEach(rowNum => {
    const cell = worksheet.getCell(rowNum, 1);
    cell.font = { bold: true, color: { argb: '366092' } };
  });

  // Set column widths
  worksheet.getColumn(1).width = 30;
  worksheet.getColumn(2).width = 20;
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