import ExcelJS from 'exceljs';

interface Attendee {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  registrationType?: string;
  checkedIn: boolean;
  checkedInAt?: Date;
  qrCode?: string;
}

interface CheckinInstance {
  id: string;
  attendee_id: string;
  checkin_number: number;
  guest_type: string;
  checked_in_at: string;
  qr_code: string;
}

export const exportReportsToExcel = async (
  attendees: Attendee[],
  checkinInstances: CheckinInstance[]
) => {
  const workbook = new ExcelJS.Workbook();
  
  // Create sheets
  const attendeesSheet = workbook.addWorksheet('Attendees');
  const checkinsSheet = workbook.addWorksheet('Check-in Instances');
  const summarySheet = workbook.addWorksheet('Summary Statistics');

  // ============= ATTENDEES SHEET =============
  attendeesSheet.columns = [
    { header: 'Name', key: 'name', width: 25 },
    { header: 'Email', key: 'email', width: 30 },
    { header: 'Phone', key: 'phone', width: 15 },
    { header: 'Company', key: 'company', width: 25 },
    { header: 'Registration Type', key: 'registrationType', width: 18 },
    { header: 'Status', key: 'status', width: 15 },
    { header: 'QR Code', key: 'qrCode', width: 20 },
    { header: 'Check-In Time', key: 'checkInTime', width: 20 },
  ];

  // Style header row
  attendeesSheet.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E40AF' }, // Corporate blue
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };
  });

  // Add data rows
  attendees.forEach((attendee, index) => {
    const row = attendeesSheet.addRow({
      name: attendee.name,
      email: attendee.email,
      phone: attendee.phone || '',
      company: attendee.company || '',
      registrationType: (attendee.registrationType || 'pre_registered') === 'pre_registered' ? 'Pre-registered' : 'Walk-in',
      status: attendee.checkedIn ? 'Checked In' : 'Registered',
      qrCode: attendee.qrCode || '',
      checkInTime: attendee.checkedInAt ? attendee.checkedInAt.toLocaleString() : '',
    });

    // Alternating row colors
    if (index % 2 === 0) {
      row.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF3F4F6' },
        };
      });
    }

    // Add borders
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });

    // Color code status
    const statusCell = row.getCell('status');
    if (attendee.checkedIn) {
      statusCell.font = { color: { argb: 'FF16A34A' }, bold: true };
    } else {
      statusCell.font = { color: { argb: 'FFEA580C' } };
    }
  });

  // Enable auto-filter
  attendeesSheet.autoFilter = {
    from: 'A1',
    to: `H${attendees.length + 1}`,
  };

  // ============= CHECK-IN INSTANCES SHEET =============
  checkinsSheet.columns = [
    { header: 'Original Attendee', key: 'attendeeName', width: 25 },
    { header: 'Email', key: 'email', width: 30 },
    { header: 'Company', key: 'company', width: 25 },
    { header: 'Guest Type', key: 'guestType', width: 15 },
    { header: 'Check-in #', key: 'checkinNumber', width: 12 },
    { header: 'QR Code', key: 'qrCode', width: 20 },
    { header: 'Check-In Time', key: 'checkInTime', width: 20 },
  ];

  // Style header row
  checkinsSheet.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E40AF' },
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };
  });

  // Sort check-ins by time (newest first)
  const sortedCheckins = [...checkinInstances].sort(
    (a, b) => new Date(b.checked_in_at).getTime() - new Date(a.checked_in_at).getTime()
  );

  // Add data rows
  sortedCheckins.forEach((instance, index) => {
    const attendee = attendees.find(a => a.id === instance.attendee_id);
    const guestTypeDisplay = instance.guest_type
      .replace('_', ' ')
      .replace(/\b\w/g, l => l.toUpperCase());

    const row = checkinsSheet.addRow({
      attendeeName: attendee?.name || 'Unknown',
      email: attendee?.email || 'Unknown',
      company: attendee?.company || 'N/A',
      guestType: guestTypeDisplay,
      checkinNumber: instance.checkin_number,
      qrCode: instance.qr_code,
      checkInTime: new Date(instance.checked_in_at).toLocaleString(),
    });

    // Alternating row colors
    if (index % 2 === 0) {
      row.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF3F4F6' },
        };
      });
    }

    // Add borders
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });

    // Color code guest types
    const guestTypeCell = row.getCell('guestType');
    if (instance.guest_type === 'original') {
      guestTypeCell.font = { color: { argb: 'FF16A34A' }, bold: true };
      guestTypeCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD1FAE5' },
      };
    } else if (instance.guest_type === 'plus_one') {
      guestTypeCell.font = { color: { argb: 'FF2563EB' }, bold: true };
      guestTypeCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFDBEAFE' },
      };
    } else if (instance.guest_type === 'plus_two') {
      guestTypeCell.font = { color: { argb: 'FF9333EA' }, bold: true };
      guestTypeCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF3E8FF' },
      };
    } else {
      guestTypeCell.font = { color: { argb: 'FFD97706' }, bold: true };
      guestTypeCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFEF3C7' },
      };
    }
  });

  // Enable auto-filter
  checkinsSheet.autoFilter = {
    from: 'A1',
    to: `G${checkinInstances.length + 1}`,
  };

  // ============= SUMMARY STATISTICS SHEET =============
  // Calculate statistics
  const stats = {
    total: attendees.length,
    checkedIn: attendees.filter(a => a.checkedIn).length,
    pending: attendees.filter(a => !a.checkedIn).length,
    checkInRate: attendees.length > 0 ? Math.round((attendees.filter(a => a.checkedIn).length / attendees.length) * 100) : 0,
    
    preRegistered: attendees.filter(a => (a.registrationType || 'pre_registered') === 'pre_registered').length,
    preRegisteredCheckedIn: attendees.filter(a => (a.registrationType || 'pre_registered') === 'pre_registered' && a.checkedIn).length,
    preRegisteredRate: (() => {
      const total = attendees.filter(a => (a.registrationType || 'pre_registered') === 'pre_registered').length;
      const checkedIn = attendees.filter(a => (a.registrationType || 'pre_registered') === 'pre_registered' && a.checkedIn).length;
      return total > 0 ? Math.round((checkedIn / total) * 100) : 0;
    })(),
    
    walkIn: attendees.filter(a => a.registrationType === 'walk_in').length,
    walkInCheckedIn: attendees.filter(a => a.registrationType === 'walk_in' && a.checkedIn).length,
    walkInRate: (() => {
      const total = attendees.filter(a => a.registrationType === 'walk_in').length;
      const checkedIn = attendees.filter(a => a.registrationType === 'walk_in' && a.checkedIn).length;
      return total > 0 ? Math.round((checkedIn / total) * 100) : 0;
    })(),
    
    totalCheckIns: checkinInstances.length,
    originalGuests: checkinInstances.filter(i => i.guest_type === 'original').length,
    plusOneGuests: checkinInstances.filter(i => i.guest_type === 'plus_one').length,
    plusTwoGuests: checkinInstances.filter(i => i.guest_type === 'plus_two').length,
    plusThreeGuests: checkinInstances.filter(i => i.guest_type === 'plus_three').length,
    totalPlusGuests: checkinInstances.filter(i => i.guest_type !== 'original').length,
    averageGuestsPerQR: checkinInstances.length > 0 ? 
      Math.round((checkinInstances.length / new Set(checkinInstances.map(i => i.qr_code)).size) * 10) / 10 : 0,
    uniqueQRsWithPlusGuests: new Set(checkinInstances.filter(i => i.guest_type !== 'original').map(i => i.qr_code)).size
  };

  summarySheet.columns = [
    { width: 35 },
    { width: 25 },
  ];

  let currentRow = 1;

  // Helper function to add section header
  const addSectionHeader = (title: string) => {
    const row = summarySheet.getRow(currentRow);
    row.getCell(1).value = title;
    row.getCell(1).font = { bold: true, size: 14, color: { argb: 'FF1E40AF' } };
    row.getCell(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFDBEAFE' },
    };
    row.getCell(1).border = {
      top: { style: 'medium' },
      left: { style: 'medium' },
      bottom: { style: 'medium' },
      right: { style: 'medium' },
    };
    summarySheet.mergeCells(currentRow, 1, currentRow, 2);
    currentRow++;
  };

  // Helper function to add data row
  const addDataRow = (label: string, value: string | number, highlight = false) => {
    const row = summarySheet.getRow(currentRow);
    row.getCell(1).value = label;
    row.getCell(2).value = value;
    
    row.getCell(1).font = { bold: true };
    row.getCell(2).font = highlight ? { bold: true, color: { argb: 'FF1E40AF' }, size: 12 } : {};
    
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });
    
    if (highlight) {
      row.getCell(2).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFEF3C7' },
      };
    }
    
    currentRow++;
  };

  // Event Overview Section
  addSectionHeader('📊 EVENT OVERVIEW');
  addDataRow('Total Registered Attendees', stats.total, true);
  addDataRow('Total Check-ins (All Guests)', stats.totalCheckIns, true);
  addDataRow('Overall Attendance Rate', `${stats.checkInRate}%`, true);
  currentRow++;

  // Registration Type Breakdown
  addSectionHeader('📋 REGISTRATION TYPE BREAKDOWN');
  addDataRow('Pre-registered Attendees', stats.preRegistered);
  addDataRow('Pre-registered Checked In', `${stats.preRegisteredCheckedIn} (${stats.preRegisteredRate}%)`);
  addDataRow('Walk-in Attendees', stats.walkIn);
  addDataRow('Walk-in Checked In', `${stats.walkInCheckedIn} (${stats.walkInRate}%)`);
  currentRow++;

  // Plus Guest Analytics
  addSectionHeader('👥 PLUS GUEST ANALYTICS');
  addDataRow('Total Plus Guests', stats.totalPlusGuests, true);
  addDataRow('Plus One (+1) Guests', stats.plusOneGuests);
  addDataRow('Plus Two (+2) Guests', stats.plusTwoGuests);
  addDataRow('Plus Three (+3) Guests', stats.plusThreeGuests);
  addDataRow('Average Guests per QR Code', stats.averageGuestsPerQR);
  addDataRow('QR Codes with Plus Guests', stats.uniqueQRsWithPlusGuests);
  addDataRow('QR Sharing Rate', `${stats.total > 0 ? Math.round((stats.uniqueQRsWithPlusGuests / stats.total) * 100) : 0}%`);
  currentRow++;

  // Check-in Status
  addSectionHeader('✅ CHECK-IN STATUS');
  addDataRow('Checked In', stats.checkedIn);
  addDataRow('Pending', stats.pending);
  addDataRow('Check-in Rate', `${stats.checkInRate}%`, true);

  // Generate and download the file
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Event_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
  link.click();
  window.URL.revokeObjectURL(url);
};
