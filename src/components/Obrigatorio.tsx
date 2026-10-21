// Asterisco que marca um campo obrigatório. Use dentro de um <span> junto do texto do rótulo.
export default function Obrigatorio() {
  return (
    <span aria-hidden="true" title="Campo obrigatório" className="ml-0.5 text-danger">
      *
    </span>
  );
}
