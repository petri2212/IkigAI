// tool for parsing pdf
export async function parsePdfBase64(cvBase64: string): Promise<string> {
  try {
    const PDFParser = (await import("pdf2json")).default;

    return new Promise<string>((resolve, reject) => {
      const pdfParser = new (PDFParser as any)();

      pdfParser.on("pdfParser_dataError", (errData: any) => {
        console.error("Errore parse PDF:", errData);
        resolve("");
      });

      pdfParser.on("pdfParser_dataReady", (pdfData: any) => {
        try {
          let text = "";
          if (pdfData.Pages && Array.isArray(pdfData.Pages)) {
            pdfData.Pages.forEach((page: any) => {
              if (page.Texts && Array.isArray(page.Texts)) {
                page.Texts.forEach((textItem: any) => {
                  if (textItem.R && Array.isArray(textItem.R)) {
                    textItem.R.forEach((textRun: any) => {
                      if (textRun.T) {
                        text += decodeURIComponent(textRun.T) + " ";
                      }
                    });
                  }
                });
              }
            });
          }
          resolve(text.slice(0, 3000));
        } catch (err) {
          console.error("Error in extracting content form pdf:", err);
          resolve("");
        }
      });

      const buffer = Buffer.from(cvBase64, "base64");
      pdfParser.parseBuffer(buffer);
    });
  } catch (err) {
    console.error("Error parse PDF:", err);
    return "";
  }
}