export const handlePdfUpload = (file: File, userId: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async () => {
      try {
        const base64pdf = (reader.result as string).split(",")[1];

        const res = await fetch("/api/uploadPdf", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: userId,
            base64pdf,
          }),
        });

        const data = await res.json();
        console.log("Upload result:", data);
        resolve(data);  
      } catch (error) {
        reject(error); 
      }
    };

    reader.onerror = () => {
      reject(new Error("File reading failed"));
    };

    reader.readAsDataURL(file);
  });
};
