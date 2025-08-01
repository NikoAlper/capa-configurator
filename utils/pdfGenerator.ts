import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { db } from "../src/lib/firebase";
import { collection, getDocs } from "firebase/firestore";

interface TechnicalSpec {
  name: string;
  value: string;
  id?: string;
}

interface Part {
  name: string;
  price: number;
}

interface OrderData {
  model: string;
  description: string;
  technicalSpecs: TechnicalSpec[];
  customerName?: string;
  orderDate?: string;
  priceList?: Part[];
}

// Parçaların fiyat haritasını getir (name bazlı)
async function getPartPricesMap() {
  const snapshot = await getDocs(collection(db, "parts"));
  const priceMap: Record<string, number> = {};
  snapshot.docs.forEach((docSnap) => {
    const data = docSnap.data();
    priceMap[data.name] = data.price || 0;
  });
  return priceMap;
}

// Bayinin iskonto oranını getir
async function getDealerDiscount(dealerUsername: string): Promise<number> {
  try {
    const snapshot = await getDocs(collection(db, "dealers"));
    const dealerDoc = snapshot.docs.find(
      (docSnap) =>
        (docSnap.data().username || "").toLowerCase() ===
        dealerUsername.toLowerCase()
    );
    return dealerDoc ? dealerDoc.data().discountRate || 0 : 0;
  } catch (err) {
    console.error("İskonto oranı alınamadı:", err);
    return 0;
  }
}

export async function generateOrderPDF(
  order: OrderData,
  includePriceList = false
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);
  const page = pdfDoc.addPage([600, 800]);
  const { height } = page.getSize();

  const fontBytes = await fetch("/fonts/DejaVuSans.ttf").then((res) =>
    res.arrayBuffer()
  );
  const customFont = await pdfDoc.embedFont(fontBytes);

  let y = height - 40;
  const margin = 50;
  const safeText = (val: any) =>
    val !== undefined && val !== null ? String(val) : "";

  // Başlık
  page.drawText("Sipariş Özeti", {
    x: margin,
    y,
    size: 20,
    font: customFont,
    color: rgb(0, 0, 0),
  });
  y -= 30;

  // Müşteri/Bayi Adı
  page.drawText(
    `Müşteri/Bayi: ${safeText(order.customerName) || "Bilinmiyor"}`,
    { x: margin, y, size: 12, font: customFont }
  );
  y -= 20;

  // Sipariş Tarihi
  const orderDate =
    safeText(order.orderDate) || new Date().toLocaleDateString("tr-TR");
  page.drawText(`Sipariş Tarihi: ${orderDate}`, {
    x: margin,
    y,
    size: 12,
    font: customFont,
  });
  y -= 30;

  // Model
  page.drawText(`Model: ${safeText(order.model)}`, {
    x: margin,
    y,
    size: 14,
    font: customFont,
  });
  y -= 20;

  const wrapText = (text: string, maxWidth: number) => {
    const words = safeText(text).split(" ");
    const lines: string[] = [];
    let currentLine = "";
    for (const word of words) {
      const testLine = currentLine + word + " ";
      if (customFont.widthOfTextAtSize(testLine, 12) > maxWidth) {
        lines.push(currentLine);
        currentLine = word + " ";
      } else {
        currentLine = testLine;
      }
    }
    lines.push(currentLine);
    return lines;
  };

  const descriptionLines = wrapText(order.description || "", 480);
  descriptionLines.forEach((line) => {
    page.drawText(line.trim(), { x: margin + 10, y, size: 12, font: customFont });
    y -= 15;
  });

  // Teknik Özellikler
  y -= 30;
  page.drawText("Teknik Özellikler:", {
    x: margin,
    y,
    size: 14,
    font: customFont,
  });
  y -= 20;

  const tableWidth = 500;
  const col1Width = 250;
  const rowHeight = 20;

  page.drawRectangle({
    x: margin,
    y: y - rowHeight,
    width: tableWidth,
    height: rowHeight,
    color: rgb(0.9, 0.9, 0.9),
  });
  page.drawText("Özellik", { x: margin + 10, y: y - 15, size: 12, font: customFont });
  page.drawText("Değer", {
    x: margin + col1Width + 10,
    y: y - 15,
    size: 12,
    font: customFont,
  });
  y -= rowHeight + 5;

  order.technicalSpecs.forEach((spec) => {
    page.drawRectangle({
      x: margin,
      y: y - rowHeight + 5,
      width: tableWidth,
      height: rowHeight,
      color: rgb(1, 1, 1),
      borderColor: rgb(0.8, 0.8, 0.8),
      borderWidth: 1,
    });
    page.drawText(safeText(spec.name), {
      x: margin + 10,
      y: y - 10,
      size: 11,
      font: customFont,
    });
    page.drawText(safeText(spec.value), {
      x: margin + col1Width + 10,
      y: y - 10,
      size: 11,
      font: customFont,
    });
    y -= rowHeight;
  });

  // Fiyat Listesi (Sadece bayi için)
  if (includePriceList) {
    const priceMap = await getPartPricesMap();
    const dealerUsername = localStorage.getItem("dealer_username") || "";
    const discountRate = dealerUsername
      ? await getDealerDiscount(dealerUsername)
      : 0;

    let totalPrice = 0;

    y -= 40;
    page.drawText("Seçilen Parçaların Fiyatları:", {
      x: margin,
      y,
      size: 14,
      font: customFont,
      color: rgb(0.2, 0.2, 0.8),
    });
    y -= 20;

    page.drawRectangle({
      x: margin,
      y: y - rowHeight,
      width: tableWidth,
      height: rowHeight,
      color: rgb(0.9, 0.9, 0.9),
    });
    page.drawText("Parça", { x: margin + 10, y: y - 15, size: 12, font: customFont });
    page.drawText("Fiyat", {
      x: margin + col1Width + 10,
      y: y - 15,
      size: 12,
      font: customFont,
    });
    y -= rowHeight + 5;

    order.technicalSpecs.forEach((spec) => {
      let price = priceMap[spec.value] || 0; // Ana parçalar için name ile eşleştir

      // Eğer extra ürünse ve fiyat bilgisi value içinde parantezli olarak varsa, onu kullan
      const match = spec.value.match(/\(₺([\d.,]+)\)/);
      if (match) {
        price = parseFloat(match[1].replace(",", "."));
      } else if (discountRate > 0) {
        price = price - price * (discountRate / 100);
      }
      totalPrice += price;

      page.drawRectangle({
        x: margin,
        y: y - rowHeight + 5,
        width: tableWidth,
        height: rowHeight,
        color: rgb(1, 1, 1),
        borderColor: rgb(0.8, 0.8, 0.8),
        borderWidth: 1,
      });
      page.drawText(spec.value, {
        x: margin + 10,
        y: y - 10,
        size: 11,
        font: customFont,
      });
      page.drawText(`${price.toFixed(2)} TL`, {
        x: margin + col1Width + 10,
        y: y - 10,
        size: 11,
        font: customFont,
      });
      y -= rowHeight;
    });

    // Toplam Fiyat
    y -= 20;
    page.drawText(`Toplam Fiyat: ${totalPrice.toFixed(2)} TL`, {
      x: margin,
      y,
      size: 14,
      font: customFont,
    });
    y -= 15;
    page.drawText("(Ekstra ürünler dahil)", {
      x: margin,
      y,
      size: 10,
      font: customFont,
      color: rgb(0.3, 0.3, 0.3),
    });
  }

  return await pdfDoc.save();
}

export function downloadPDF(pdfBytes: Uint8Array, fileName: string) {
  const blob = new Blob([pdfBytes], { type: "application/pdf" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
