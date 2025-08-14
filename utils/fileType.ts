// utils/fileType.ts
export function getFileTypeIcon(filename: string | undefined): string {
  if (!filename) return '📁'; // Fallback if filename is undefined

  const extension = filename.split('.').pop()?.toLowerCase();

  switch (extension) {
    case 'pdf': return '📄';
    case 'doc':
    case 'docx': return '📝';
    case 'txt': return '📃';
    case 'xls':
    case 'xlsx': return '📊';
    case 'csv': return '📈';
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif': return '🖼️';
    default: return '📁';
  }
}
