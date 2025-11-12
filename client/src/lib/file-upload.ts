export async function uploadFiles(files: File[], type: 'image' | 'document'): Promise<string[]> {
  const formData = new FormData();
  files.forEach(file => formData.append('files', file));
  formData.append('type', type);

  const response = await fetch('/api/upload-multiple', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Upload failed');
  }

  const results = await response.json();
  return results.map((r: any) => r.url);
}

export function validateImageFiles(files: File[]): string | null {
  if (files.length > 5) return "Maximum 5 images allowed";
  
  const maxSize = 5 * 1024 * 1024;
  const oversized = files.find(f => f.size > maxSize);
  if (oversized) return `${oversized.name} exceeds 5MB limit`;

  const validTypes = ['image/png', 'image/jpeg', 'image/jpg'];
  const invalid = files.find(f => !validTypes.includes(f.type));
  if (invalid) return "Only PNG and JPG images are allowed";

  return null;
}

export function validateDocumentFiles(files: File[]): string | null {
  if (files.length > 3) return "Maximum 3 documents allowed";
  
  const maxSize = 10 * 1024 * 1024;
  const oversized = files.find(f => f.size > maxSize);
  if (oversized) return `${oversized.name} exceeds 10MB limit`;

  const validTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];
  const invalid = files.find(f => !validTypes.includes(f.type));
  if (invalid) return "Only PDF, DOC, and XLS documents are allowed";

  return null;
}
