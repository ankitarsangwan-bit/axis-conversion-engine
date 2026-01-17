import { Download } from 'lucide-react';

interface ExportButtonProps {
  data: any[];
  filename: string;
  label?: string;
}

export function ExportButton({ data, filename, label = 'Export CSV' }: ExportButtonProps) {
  const handleExport = () => {
    if (!data || data.length === 0) return;
    
    // Get headers from first object
    const headers = Object.keys(data[0]);
    
    // Build CSV content
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const cell = row[header];
          // Handle strings with commas by wrapping in quotes
          if (typeof cell === 'string' && cell.includes(',')) {
            return `"${cell}"`;
          }
          return cell ?? '';
        }).join(',')
      )
    ].join('\n');
    
    // Create and download blob
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <button onClick={handleExport} className="export-btn">
      <Download className="h-3 w-3" />
      {label}
    </button>
  );
}
