# 2026-11-17: feltro verde e vinho

## Motivo

Pedido de deixar duas opções de fundo, verde e vinho, imitando a mesa clássica
de baralho: superfície de tecido, no tom das mesas de jogo tradicionais.

## O que mudou

- O fundo animado em WebGL (tinta em redemoinho) saiu. No lugar entrou o
  feltro (`FeltBackground`): cor do pano, luz de luminária no centro, bordas
  escurecidas e uma textura de tecido gerada uma vez em canvas
  (`src/lib/feltTexture.ts`), com grão, manchas e fibras.
- Duas cores, verde (`150 52% 22%`) e vinho (`349 55% 23%`), trocadas pelo
  atributo `data-felt` em `<html>` (`src/lib/felt.ts`). A escolha é de cada
  jogador, fica no navegador e aparece no menu da mesa e na tela de entrada.
- A área de jogo ganhou uma linha "impressa" no pano no lugar do contorno
  tracejado.
- As linhas de varredura de monitor saíram: riscavam o feltro em faixas e
  tiravam a sensação de tecido. A vinheta das bordas ficou.
- A barra do navegador no celular acompanha a cor da borda da mesa.
- Os itens do menu suspenso ganharam espaço entre ícone e texto (estavam
  colados).
- `tokenRgb` saiu de `src/lib/tokens.ts` (só o shader removido usava).
- As capturas de `docs/assets/` foram refeitas com o feltro e passaram para
  WebP (a textura de tecido não comprime bem em PNG).

## Efeito colateral positivo

O fundo deixou de ser redesenhado a cada quadro. Antes o shader rodava a 30
quadros por segundo; agora o fundo é parado, o que poupa bateria no celular.

## Validação

Roteiros com Playwright repetidos depois da mudança: três jogadores em
desktop, celular em pé e deitado (29 verificações), visibilidade das cartas em
360x640, 640x360, 768x1024 e 1440x900, e arrasto ao vivo. Capturas das duas
cores conferidas na mesa, no menu e na tela de entrada.
