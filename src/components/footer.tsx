import Link from 'next/link';

export function Footer() {
  return (
    <footer className="bg-card text-card-foreground p-8 border-t border-border">
      <div className="container mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <h3 className="text-xl font-bold mb-4">LotoHub</h3>
          <p className="text-sm text-muted-foreground">&copy; {new Date().getFullYear()} LotoHub. Todos os direitos reservados.</p>
        </div>
        <div>
          <h4 className="font-semibold mb-4">Links Rápidos</h4>
          <ul className="space-y-2 text-sm">
            <li><Link href="/" className="hover:underline text-muted-foreground">Início</Link></li>
            <li><Link href="/loterias" className="hover:underline text-muted-foreground">Loterias</Link></li>
            <li><Link href="/resultados" className="hover:underline text-muted-foreground">Resultados</Link></li>
            <li><Link href="/premiados" className="hover:underline text-muted-foreground">Premiados</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold mb-4">Suporte</h4>
          <ul className="space-y-2 text-sm">
            <li><Link href="/cotacoes" className="hover:underline text-muted-foreground">Cotações</Link></li>
            <li><Link href="https://wa.me/17997637890?text=Ol%C3%A1%2C%20preciso%20de%20ajuda!" target='_blank' rel='noopener noreferrer' className="hover:underline text-muted-foreground">WhatsApp</Link></li>
          </ul>
        </div>
      </div>
      <div className="text-center text-xs text-muted-foreground/80 mt-8 border-t border-border pt-4">
        <p>Este é um site de entretenimento. Jogue com responsabilidade.</p>
        <p>Proibido para menores de 18 anos.</p>
      </div>
    </footer>
  );
}
