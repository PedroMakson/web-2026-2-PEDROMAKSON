// Círculo do usuário: mostra a foto de perfil quando existe e, senão, as iniciais.
// `className` define tamanho, cores e fonte (as do círculo de iniciais).
export default function Avatar({
  url,
  iniciais,
  className = "",
}: {
  url: string | null;
  iniciais?: string;
  className?: string;
}) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full ${className}`}
    >
      {url ? (
        // no-referrer: o Google não carrega a foto dele quando o pedido traz o endereço do nosso site
        <img
          src={url}
          alt="Foto de perfil"
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover"
        />
      ) : (
        iniciais
      )}
    </div>
  );
}
