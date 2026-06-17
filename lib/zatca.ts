/**
 * ZATCA Tag-Length-Value (TLV) Base64 Encoder
 * Used to generate Saudi Arabia VAT compliant QR codes.
 */
export function generateZatcaString(
  sellerName: string,
  vatNumber: string,
  timestamp: string,
  invoiceTotal: string,
  vatTotal: string
): string {
  const encoder = new TextEncoder();
  
  const encodeTLV = (tag: number, value: string): Uint8Array => {
    const valueBytes = encoder.encode(value);
    const length = valueBytes.length;
    const tlv = new Uint8Array(2 + length);
    tlv[0] = tag;
    tlv[1] = length;
    tlv.set(valueBytes, 2);
    return tlv;
  };

  try {
    const p1 = encodeTLV(1, sellerName || 'Laundry App');
    const p2 = encodeTLV(2, vatNumber || '000000000000000');
    const p3 = encodeTLV(3, timestamp || new Date().toISOString());
    const p4 = encodeTLV(4, invoiceTotal || '0.00');
    const p5 = encodeTLV(5, vatTotal || '0.00');

    const totalLength = p1.length + p2.length + p3.length + p4.length + p5.length;
    const combined = new Uint8Array(totalLength);
    
    let offset = 0;
    for (const part of [p1, p2, p3, p4, p5]) {
      combined.set(part, offset);
      offset += part.length;
    }

    // Convert binary array to base64 string
    let binary = '';
    const len = combined.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(combined[i]);
    }
    return btoa(binary);
  } catch (error) {
    console.error('Failed to generate ZATCA TLV string:', error);
    return '';
  }
}
