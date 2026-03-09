// src/lib/pdfGenerator.ts
import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

export const generateReservationPDF = async (formData: any) => {
  try {
    // 1. โหลดไฟล์ PDF ต้นฉบับ และ ฟอนต์ภาษาไทย จากโฟลเดอร์ public
    // (ตรวจสอบให้แน่ใจว่าตั้งชื่อไฟล์ตรงกับในโฟลเดอร์ public ของคุณ)
    const existingPdfBytes = await fetch('/meeting-form-template.pdf').then(res => res.arrayBuffer());
    const fontBytes = await fetch('/THSarabunNew.ttf').then(res => res.arrayBuffer());

    // 2. สร้างเอกสาร PDF ใหม่จากต้นฉบับ
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    
    // 3. ติดตั้ง fontkit และฝังฟอนต์ภาษาไทย
    pdfDoc.registerFontkit(fontkit);
    const customFont = await pdfDoc.embedFont(fontBytes);

    // 4. เข้าถึงหน้าแรกของ PDF
    const pages = pdfDoc.getPages();
    const firstPage = pages[0];

    // ฟังก์ชันช่วยวาดตัวอักษร (เพื่อความลดรูปของโค้ด)
    const drawText = (text: string, x: number, y: number, size = 14) => {
      firstPage.drawText(text, {
        x,
        y,
        size,
        font: customFont,
        color: rgb(0, 0, 0), // สีดำ
      });
    };
    
    // ---------------------------------------------------------
    // 5. วางตำแหน่งข้อความ (แกน X จากซ้าย, แกน Y จากล่างขึ้นบน)
    // ---------------------------------------------------------

    // ตัวอย่างการวางตำแหน่ง (สมมติพิกัด)
    drawText(formData.department || '', 115, 664); // สำนัก/กอง
    // drawText(formData.topic || '', 50, 633);      // โครงการ/เรื่อง
    
    // --- ระบบตัดคำภาษาไทยแบบเป็นคำๆ สำหรับ ชื่อโครงการ/เรื่อง ---
    const topicText = formData.topic || '';
    const maxChars = 45;   // จำนวนตัวอักษรสูงสุดต่อ 1 บรรทัด
    const lineHeight = 14; // ระยะห่างระหว่างบรรทัด
    let currentY = 633;    // จุด Y เริ่มต้นของบรรทัดแรก

    // 1. เรียกใช้พจนานุกรมตัดคำภาษาไทย
    const segmenter = new (Intl as any).Segmenter('th-TH', { granularity: 'word' });
    const segments = segmenter.segment(topicText);

    let currentLine = '';

    // 2. วนลูปเช็กทีละคำ
    for (const { segment } of segments) {
      if (currentLine.length + segment.length > maxChars) {
        drawText(currentLine, 50, currentY); // X = 50 วาดบรรทัดปัจจุบัน
        currentY -= lineHeight;              // ขยับ Y ลงมาบรรทัดใหม่
        currentLine = segment;               // เอาคำที่ล้นไปตั้งต้นเป็นบรรทัดใหม่
      } else {
        currentLine += segment;
      }
    }

    // 3. วาดข้อความที่เหลือในบรรทัดสุดท้าย (ถ้ามี)
    if (currentLine.trim().length > 0) {
      drawText(currentLine, 50, currentY);   // X = 50
    }
    // ----------------------------------------------------

    // วัน เดือน ปี ปัจจุบัน (วันที่พิมพ์แบบฟอร์ม)
    {
      const now = new Date();
      const nowDay = now.getDate().toString();
      const nowMonthNames = ['', 'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
                              'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
      const nowMonth = nowMonthNames[now.getMonth() + 1];
      const nowYear = (now.getFullYear() + 543).toString();
      drawText(nowDay, 155, 719);
      drawText(nowMonth, 198, 719);
      drawText(nowYear, 260, 719);
    }
    


    // จัดการวันที่ (สมมติว่า formData.date เป็น 'yyyy-mm-dd')
    if (formData.date) {
        const [year, month, day] = formData.date.split('-');
        const thaiYear = (parseInt(year) + 543).toString();
        const thaiMonths = ['', 'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
                            'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
        const thaiMonth = thaiMonths[parseInt(month)] ?? month;
        // คำนวณตำแหน่ง X ของปี พ.ศ. ตามความกว้างของชื่อเดือน
        const monthWidths: Record<string, number> = {
          'มกราคม': 27, 'กุมภาพันธ์': 32, 'มีนาคม': 26,
          'เมษายน': 27, 'พฤษภาคม': 33, 'มิถุนายน': 28,
          'กรกฎาคม': 32, 'สิงหาคม': 27, 'กันยายน': 28,
          'ตุลาคม': 26, 'พฤศจิกายน': 37, 'ธันวาคม': 27,
        };
        const yearX = 80 + (monthWidths[thaiMonth] || 27) + 8;
        drawText(day, 65, 573);           // วันที่
        drawText(thaiMonth, 80, 573);     // เดือน (ภาษาไทย)
        drawText(thaiYear, yearX, 573);   // พ.ศ.
    }

    drawText(`${formData.startTime}`, 170, 573); // เวลาจอง
    drawText(`${formData.endTime} `, 242, 573);  // เวลาสิ้นสุด (อาจจะต้องปรับตำแหน่งให้ห่างจากเวลาจองนิดนึง)  
    // ทำเครื่องหมายเลือกห้องประชุม (ใช้ตัวอักษร 'X' หรือ '/')
    if (formData.room === 'ธรรมปัญญา') drawText('X', 17, 542);
    else if (formData.room === 'ธรรมรับอรุณ') drawText('X', 17, 527);
    else if (formData.room === 'ยอแสงธรรม') drawText('X', 17, 512);
    else if (formData.room === 'นครธรรม') drawText('X', 17, 497);
    else if (formData.room === 'รุ่งอรุณ') drawText('X', 17, 484);

    // จำนวนผู้เข้าร่วม ต่อท้ายห้องประชุม
    if (formData.participants) {
      const participantText = `ผู้เข้าร่วม ${formData.participants} คน`;
      const roomParticipantY: Record<string, number> = {
        'ธรรมปัญญา': 540,
        'ธรรมรับอรุณ': 525,
        'ยอแสงธรรม': 510,
        'นครธรรม': 495,
        'รุ่งอรุณ': 480,
      };
      const pY = roomParticipantY[formData.room];
      if (pY) drawText(participantText, 210, pY);
    }
    
    // ... (สามารถเพิ่มเงื่อนไขห้องอื่นๆ ได้)

    // อุปกรณ์ที่ต้องการ (ทำเครื่องหมาย X)
    const equipmentList = formData.equipment || [];
    if (equipmentList.includes('เครื่องเสียง พร้อม Microphone')) drawText('X', 17, 453);
    if (equipmentList.includes('เครื่องฉาย Projector')) drawText('X', 17, 438);
    if (equipmentList.includes('โทรทัศน์แอลอีดี TV LED')) drawText('X', 17, 422);
    if (equipmentList.includes('อุปกรณ์ต่อพ่วง')) drawText('X', 17, 407);
    if (equipmentList.includes('ระบบอินเตอร์เน็ต')) drawText('X', 17, 392);
    if (equipmentList.includes('ระบบประชุมวีดิทัศน์ทางไกล VCS')) drawText('X', 17, 376);

    // ข้อมูลผู้จอง
    drawText(formData.bookerName || '', 90, 362); // ผู้ประสานงาน/ผู้จอง
    drawText(formData.bookerPosition || '', 70, 347); // ตำแหน่ง
    drawText(formData.bookerPhone || '', 115, 331); // เบอร์โทรศัพท์

    // 6. บันทึกและสร้างเป็นไฟล์เพื่อเปิด
    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
    const pdfUrl = URL.createObjectURL(blob);

    // เปิด PDF ในแท็บใหม่ให้ผู้ใช้กด Print ได้เลย
    window.open(pdfUrl, '_blank');

  } catch (error) {
    console.error('Error generating PDF:', error);
    alert('ไม่สามารถสร้างไฟล์ PDF ได้ โปรดตรวจสอบว่ามีไฟล์ในโฟลเดอร์ public ครบถ้วน');
  }
};