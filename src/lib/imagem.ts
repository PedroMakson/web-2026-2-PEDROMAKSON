export const TIPOS_ACEITOS = ["image/jpeg", "image/png", "image/webp"];
export const TAMANHO_MAXIMO_ORIGINAL = 10 * 1024 * 1024;

// Retorna a mensagem do problema, ou null se o arquivo pode ser enviado.
export function validarArquivo(arquivo: File): string | null {
  if (!TIPOS_ACEITOS.includes(arquivo.type)) {
    return "Formato não suportado: use uma imagem JPEG, PNG ou WebP.";
  }
  if (arquivo.size > TAMANHO_MAXIMO_ORIGINAL) {
    return "A imagem é muito grande (máximo de 10 MB).";
  }
  return null;
}

// Reduz a foto para caber num avatar (lado maior de até `maxLado` px) e converte para JPEG.
// Fotos de celular têm vários MB; a API aceita no máximo 3 MB, e um avatar não precisa de mais que isso.
export async function reduzirImagem(arquivo: Blob, maxLado = 512, qualidade = 0.85): Promise<Blob> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(arquivo);
  } catch {
    throw new Error("Não foi possível ler a imagem: o arquivo parece estar corrompido.");
  }

  const escala = Math.min(1, maxLado / Math.max(bitmap.width, bitmap.height));
  const largura = Math.max(1, Math.round(bitmap.width * escala));
  const altura = Math.max(1, Math.round(bitmap.height * escala));

  const canvas = document.createElement("canvas");
  canvas.width = largura;
  canvas.height = altura;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("Seu navegador não conseguiu preparar a imagem.");
  }
  // JPEG não tem transparência: fundo branco evita que PNGs transparentes fiquem pretos
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, largura, altura);
  ctx.drawImage(bitmap, 0, 0, largura, altura);
  bitmap.close();

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Não foi possível preparar a imagem."))),
      "image/jpeg",
      qualidade,
    );
  });
}
