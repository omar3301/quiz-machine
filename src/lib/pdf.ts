// الدالة دي آمنة 100% على الآيفون وأي متصفح تاني
export async function extractTextFromPDF(pdf: any, startPage: number, endPage: number) {
  let fullText = "";

  // التأكد إن الصفحات في النطاق الصحيح
  const actualStart = Math.max(1, startPage);
  const actualEnd = Math.min(pdf.numPages, endPage);

  for (let i = actualStart; i <= actualEnd; i++) {
    try {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();

      // فحص صارم عشان الآيفون ميضربش إيرور
      if (textContent && textContent.items && Array.isArray(textContent.items)) {
        let pageText = "";
        
        // استخدام for loop عادي جداً بدل map و join
        for (let j = 0; j < textContent.items.length; j++) {
          const item = textContent.items[j];
          // نتأكد إن النص موجود فعلاً
          if (item && typeof item.str === "string") {
            pageText += item.str + " ";
          }
        }
        
        fullText += pageText + "\n";
      }
    } catch (err) {
      console.warn(`تخطينا الصفحة رقم ${i} بسبب مشكلة في قراءتها:`, err);
      // الكود هيكمل عادي للصفحة اللي بعدها بدل ما يعمل Crash للسايت كله
      continue; 
    }
  }

  return fullText.trim();
}