export default function EmConstrucao({ titulo }: { titulo: string }) {
  return (
    <div>
      <h1 className="font-display text-3xl font-bold text-navy">{titulo}</h1>
      <div className="mt-6 rounded-2xl border border-dashed border-navy/20 bg-white/60 p-10 text-center">
        <p className="text-sm text-navy/50">Essa tela ainda está em construção.</p>
      </div>
    </div>
  );
}
