/**
 * Normaliza o caminho de imagem vindo da API.
 *
 * As views divergiam de duas formas: algumas usavam `imageUrl` cru (a API só manda
 * o nome do arquivo, ex. "gabi", sem pasta nem extensão) e outras prefixavam com
 * "../public/images/" na mão. Num roteador de histórico, "../" resolve conforme a
 * profundidade da URL atual — só "funciona" hoje porque todas as rotas têm no
 * máximo um nível, e "public/" nem existe no build de produção (o Vite copia o
 * conteúdo de public/ para a raiz do dist, não para dist/public/).
 *
 * Aqui: URL absoluta, data URI ou caminho de raiz passam intactos; caminho com
 * extensão ganha a barra inicial; nome puro (sem "/" nem extensão) vira
 * "/images/<nome>.png", que é onde os assets de produto realmente ficam.
 */
export function imageSrc(url) {
  if (!url) return "";
  if (/^(https?:)?\/\//.test(url) || url.startsWith("data:")) return url;
  if (url.startsWith("/")) return url;
  if (/\.[a-z0-9]+$/i.test(url)) return `/${url}`;
  return `/images/${url}.png`;
}
