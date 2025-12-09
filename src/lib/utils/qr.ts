import QRCode from 'qrcode'

export async function generateQRCodeDataUrl(text: string): Promise<string> {
  return await QRCode.toDataURL(text, {
    width: 256,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#ffffff'
    },
    errorCorrectionLevel: 'M'
  })
}
