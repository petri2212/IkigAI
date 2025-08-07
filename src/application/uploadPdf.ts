export const handlePdfUpload = async (file: File, userId: string) => {
  const reader = new FileReader();

  reader.onload = async () => {
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
  };

  reader.readAsDataURL(file);
};