export const WHATSAPP_SUPPORTED_IMAGE_MIME_TYPES: readonly string[] = [
  'image/jpeg',
  'image/png',
];

export const WHATSAPP_NORMALIZABLE_IMAGE_MIME_TYPES: readonly string[] = [
  ...WHATSAPP_SUPPORTED_IMAGE_MIME_TYPES,
  'image/webp',
  'image/heic',
  'image/heif',
  'image/avif',
  'image/bmp',
  'image/tiff',
];

export const WHATSAPP_SUPPORTED_VIDEO_MIME_TYPES: readonly string[] = [
  'video/mp4',
  'video/3gp',
  'video/quicktime',
];

export const WHATSAPP_SUPPORTED_DOCUMENT_MIME_TYPES: readonly string[] = [
  'application/pdf',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
];

export const CSV_MIME_TYPES: readonly string[] = [
  'text/csv',
  'application/csv',
  'text/comma-separated-values',
];

export const WHATSAPP_DOCUMENT_ACCEPT =
  '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain,text/csv';

export const WHATSAPP_SUPPORTED_FORMATS_LABEL =
  'JPEG, PNG, MP4, 3GP, MOV, PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, CSV (converted to XLSX)';

const EXTENSION_TO_MIME_TYPE: Record<string, string> = {
  pdf: 'application/pdf',
  txt: 'text/plain',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  csv: 'text/csv',
};

export function getFileExtension(fileName: string) {
  return fileName.split('.').pop()?.toLowerCase() || '';
}

export function isCsvFile(file: Pick<File, 'name' | 'type'>) {
  return getFileExtension(file.name) === 'csv' || CSV_MIME_TYPES.includes(file.type);
}

export function getSupportedMimeType(file: Pick<File, 'name' | 'type'>) {
  const extension = getFileExtension(file.name);
  if (file.type && file.type !== 'application/octet-stream') {
    return file.type;
  }

  return EXTENSION_TO_MIME_TYPE[extension] || file.type || '';
}

export function isSupportedWhatsAppDocument(file: Pick<File, 'name' | 'type'>) {
  const mimeType = getSupportedMimeType(file);
  return WHATSAPP_SUPPORTED_DOCUMENT_MIME_TYPES.includes(mimeType);
}
