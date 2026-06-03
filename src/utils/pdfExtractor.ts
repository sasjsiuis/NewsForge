/**
 * Utility to dynamically load PDF.js from highly reliable CDN and extract text page-by-page.
 * Also provides TXT file reader functionality for a complete document parsing utility.
 */

const PDFJS_CDN = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js";
const WORKER_CDN = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js";

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load PDF engine dependency: ${src}`));
    document.head.appendChild(script);
  });
}

export async function extractTextFromPdf(
  file: File,
  onProgress?: (msg: string) => void
): Promise<string> {
  if (onProgress) onProgress("এআই পিডিএফ রিডার লোড হচ্ছে...");
  
  // Load PDF.js from CDN
  await loadScript(PDFJS_CDN);
  
  const pdfjsLib = (window as any).pdfjsLib;
  if (!pdfjsLib) {
    throw new Error("পিডিএফ লাইব্রেরি সচল করা যায়নি।");
  }
  
  // Set worker location
  pdfjsLib.GlobalWorkerOptions.workerSrc = WORKER_CDN;
  
  if (onProgress) onProgress("পিডিএফ ফাইল লোড করা হচ্ছে...");
  const arrayBuffer = await file.arrayBuffer();
  
  // Parse document
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;
  
  let fullText = "";
  
  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    if (onProgress) onProgress(`পৃষ্ঠা বিশ্লেষণ করা হচ্ছে: ${pageNum}/${numPages}`);
    
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    
    let lastY = -1;
    let pageText = "";
    
    for (const item of textContent.items) {
      if ('str' in item) {
        const strVal = item.str;
        const y = item.transform ? item.transform[5] : 0;
        
        // Add new lines if we jump to a substantially different vertical position
        if (lastY !== -1 && Math.abs(y - lastY) > 10) {
          pageText += "\n";
        } else if (pageText && !pageText.endsWith(" ") && !pageText.endsWith("\n")) {
          pageText += " ";
        }
        
        pageText += strVal;
        lastY = y;
      }
    }
    
    fullText += pageText + "\n\n";
  }
  
  return fullText.trim();
}

export function extractTextFromTxt(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result;
      if (typeof result === 'string') {
        resolve(result);
      } else {
        reject(new Error("ফাইলটি পড়া যায়নি।"));
      }
    };
    reader.onerror = () => reject(new Error("ফাইলটি পড়ার সময়ে সমস্যা হয়েছে।"));
    reader.readAsText(file);
  });
}
