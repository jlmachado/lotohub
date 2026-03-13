/**
 * @fileOverview Utilitário para geração e download de arquivos CSV.
 */

export function downloadCSV(filename: string, data: any[], headers: string[]): boolean {
  if (!data || data.length === 0) return false;

  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const val = row[header] ?? '';
        // Escapar vírgulas e aspas para manter a integridade do CSV
        const stringVal = String(val).replace(/"/g, '""');
        return `"${stringVal}"`;
      }).join(',')
    )
  ].join('\n');

  try {
    // Adiciona o BOM (Byte Order Mark) para garantir suporte a acentuação no Excel
    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Revogar a URL após um pequeno delay para garantir que o download iniciou
      setTimeout(() => URL.revokeObjectURL(url), 100);
      return true;
    }
    
    URL.revokeObjectURL(url);
    return false;
  } catch (error) {
    console.error('[CSV Utils] Erro ao gerar download:', error);
    return false;
  }
}
