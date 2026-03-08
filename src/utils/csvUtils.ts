/**
 * @fileOverview Utilitário para geração e download de arquivos CSV.
 */

export function downloadCSV(filename: string, data: any[], headers: string[]) {
  if (data.length === 0) return;

  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const val = row[header] ?? '';
        // Escapar vírgulas e aspas
        const stringVal = String(val).replace(/"/g, '""');
        return `"${stringVal}"`;
      }).join(',')
    )
  ].join('\n');

  const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
