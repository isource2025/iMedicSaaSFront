export function isPdf(fileName: string, mimeType: string): boolean {
  return mimeType === 'application/pdf' || /\.pdf$/i.test(fileName);
}

export function isImage(fileName: string, mimeType: string): boolean {
  return mimeType.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|tiff?)$/i.test(fileName);
}

export function isDicom(fileName: string, mimeType: string): boolean {
  return (
    mimeType === 'application/dicom' ||
    /\.dcm$/i.test(fileName) ||
    /\.dicom$/i.test(fileName)
  );
}
