import { Order } from '../types';

export function downloadOrderReceiptAsJPG(order: Order) {
  const logoImg = new Image();
  logoImg.crossOrigin = 'anonymous';
  logoImg.src = '/logo.png';

  const renderReceipt = () => {
    const canvas = document.createElement('canvas');
    const width = 650;
    const items = order.items || [];
    const height = 620 + items.length * 40;

    canvas.width = width * 2;
    canvas.height = height * 2;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(2, 2);

    // Dark background with gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, '#0b071a');
    bgGrad.addColorStop(1, '#05030d');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Top accent bar
    ctx.fillStyle = '#212adc';
    ctx.fillRect(0, 0, width, 6);

    // Logo Image rendering
    if (logoImg.complete && logoImg.naturalWidth > 0) {
      ctx.drawImage(logoImg, width / 2 - 25, 20, 50, 50);
    }

    // Brand Header
    const headerY = logoImg.complete && logoImg.naturalWidth > 0 ? 90 : 45;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px Orbitron, Cairo, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Omen Store', width / 2, headerY);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px Cairo, sans-serif';
    ctx.fillText('متجر ملحقات الألعاب الفاخرة - فاتورة الشراء الرسمية', width / 2, headerY + 23);

    const dividerY = headerY + 40;
    // Divider line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(40, dividerY);
    ctx.lineTo(width - 40, dividerY);
    ctx.stroke();

    // Order Details Box
    const boxY = dividerY + 15;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.beginPath();
    ctx.roundRect(40, boxY, width - 80, 150, 12);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.stroke();

    // Order Info Row Helper
    const drawInfoRow = (label: string, value: string, yPos: number, isValueHighlight = false, isOrbitron = false) => {
      ctx.textAlign = 'right';
      ctx.font = 'bold 13px Cairo, sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(`${label}:`, width - 60, yPos);

      ctx.textAlign = 'left';
      if (isOrbitron) {
        ctx.font = 'bold 14px Orbitron, sans-serif';
      } else {
        ctx.font = 'bold 13px Cairo, sans-serif';
      }
      ctx.fillStyle = isValueHighlight ? '#38bdf8' : '#ffffff';
      ctx.fillText(value, 60, yPos);
    };

    // Draw Info Rows
    drawInfoRow('رقم الطلب', order.id, boxY + 30, true, true);
    drawInfoRow('اسم العميل', order.customerName, boxY + 60);
    drawInfoRow('رقم الهاتف', order.phone || 'غير محدد', boxY + 90);
    
    const addressText = `${order.governorate || order.city || ''} - ${order.address || ''}`;
    drawInfoRow('عنوان التسليم', addressText.substring(0, 45), boxY + 120);

    // Items Title
    const itemsTitleY = boxY + 180;
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px Cairo, sans-serif';
    ctx.fillText('تفاصيل الترسانة والمنتجات', width - 40, itemsTitleY);

    // Items Box
    let y = itemsTitleY + 15;
    const itemsBoxHeight = items.length * 40 + 20;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
    ctx.beginPath();
    ctx.roundRect(40, y, width - 80, itemsBoxHeight, 12);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.stroke();

    y += 28;
    items.forEach((item, index) => {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px Cairo, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`${index + 1}. ${item.productName}`, width - 60, y);

      ctx.textAlign = 'center';
      ctx.fillStyle = '#38bdf8';
      ctx.fillText(`العدد ${item.quantity}`, width / 2, y);

      ctx.textAlign = 'left';
      ctx.fillStyle = '#4ade80';
      ctx.font = 'bold 13px Cairo, sans-serif';
      ctx.fillText(`${(item.price * item.quantity).toLocaleString()} د.ع`, 60, y);

      y += 40;
    });

    // Grand Total Box
    y += 15;
    ctx.fillStyle = 'rgba(16, 185, 129, 0.08)';
    ctx.beginPath();
    ctx.roundRect(40, y, width - 80, 80, 12);
    ctx.fill();
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.3)';
    ctx.stroke();

    ctx.textAlign = 'right';
    ctx.fillStyle = '#94a3b8';
    ctx.font = '13px Cairo, sans-serif';
    ctx.fillText('أجور الشحن والمناقلة', width - 60, y + 30);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('5,000 د.ع', 60, y + 30);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px Cairo, sans-serif';
    ctx.fillText('الإجمالي النهائي (شامل التوصيل)', width - 60, y + 60);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#4ade80';
    ctx.font = 'bold 17px Orbitron, Cairo, sans-serif';
    ctx.fillText(`${order.totalAmount.toLocaleString()} د.ع`, 60, y + 60);

    // Footer Note
    ctx.textAlign = 'center';
    ctx.fillStyle = '#64748b';
    ctx.font = '11px Cairo, sans-serif';
    ctx.fillText('شكراً لثقتكم بمنتجات Omen Store - تم إصدار هذه الفاتورة تلقائياً', width / 2, height - 20);

    // Trigger JPG download
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    const downloadLink = document.createElement('a');
    downloadLink.download = `order-${order.id}.jpg`;
    downloadLink.href = dataUrl;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  let rendered = false;
  const safeRender = () => {
    if (!rendered) {
      rendered = true;
      renderReceipt();
    }
  };

  logoImg.onload = safeRender;
  logoImg.onerror = safeRender;
  if (logoImg.complete) safeRender();
}
