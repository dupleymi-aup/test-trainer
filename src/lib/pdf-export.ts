import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export async function exportElementToPdf(elementId: string, title: string): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) return;

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: "#ffffff",
  });

  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF("p", "mm", "a4");

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 10;
  const contentWidth = pageWidth - margin * 2;
  const imgWidth = contentWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  // Header
  pdf.setFontSize(16);
  pdf.text(title, margin, 15);
  pdf.setFontSize(8);
  pdf.text(`Дата: ${new Date().toLocaleDateString("ru-RU")}`, pageWidth - margin - 40, 15);
  pdf.line(margin, 18, pageWidth - margin, 18);

  let heightLeft = imgHeight;
  let position = 22;

  pdf.addImage(imgData, "PNG", margin, position, imgWidth, imgHeight);
  heightLeft -= pageHeight - position - margin;

  while (heightLeft > 0) {
    position = heightLeft - imgHeight + margin;
    pdf.addPage();
    pdf.addImage(imgData, "PNG", margin, position, imgWidth, imgHeight);
    heightLeft -= pageHeight - margin * 2;
  }

  pdf.save(`${title.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`);
}
