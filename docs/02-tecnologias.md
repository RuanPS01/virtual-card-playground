# 2. Tecnologias

## 2.1 Pilha

| Camada | Tecnologia | Versão | Para quê |
|---|---|---|---|
| Linguagem | TypeScript | 5.5 | Tudo: cliente, servidor e motor compartilhado |
| Cliente | React | 18.3 | Interface |
| Build | Vite + plugin React SWC | 5.4 | Dev server e build estático |
| Estilo | Tailwind CSS + tailwindcss-animate | 3.4 | Utilitários; o grosso do jogo está em `src/index.css` |
| Componentes base | shadcn/ui (Radix UI) | | Diálogos, menu suspenso, abas, checkbox |
| Ícones | lucide-react | 0.462 | Todos os ícones |
| Animação | framer-motion | 12.5 | Molas dos sprites, entrada e saída de cartas |
| Toasts | sonner | 1.5 | Avisos curtos |
| Fonte | @fontsource/jersey-15 | 5.x | Fonte pixel, empacotada no app (sem CDN) |
| Tempo real (servidor) | ws | 8.23 | Servidor WebSocket |
| Tempo real (sem servidor) | firebase (Realtime Database) | 11.4 | Transporte alternativo |
| Testes | vitest | 2.1 | Motor e transporte Firebase |
| Servidor em dev | tsx | 4.x | Roda `server/index.ts` com recarga |
| Empacotador do servidor | esbuild | 0.21 | Gera `dist-server/index.cjs` com `ws` embutido |
| PWA | vite-plugin-pwa + workbox-window | 0.21 / 7.4 | Manifesto, service worker com cache versionado e aviso de versão nova |

Áudio e efeitos não usam biblioteca: sons são sintetizados com a Web Audio API
([`sfx.ts`](../src/lib/sfx.ts)), a textura de tecido do feltro é desenhada uma
vez em canvas 2D ([`feltTexture.ts`](../src/lib/feltTexture.ts)) e as
partículas também são canvas 2D ([`FxLayer`](../src/components/game/effects/FxLayer.tsx)).

### Dependências removidas nesta versão

`@tanstack/react-query`, `uuid` e `@types/uuid` saíram: não eram mais usadas.
Os primitivos de `src/components/ui/` que o jogo não usa (calendário,
carrossel, gráfico...) continuam no repositório porque fazem parte do kit do
shadcn/ui, mas não entram no pacote final (o Vite descarta o que não é
importado).

## 2.2 Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | Cliente em `http://localhost:8080/virtual-card-playground/` |
| `npm run dev:server` | Servidor WebSocket em `ws://localhost:8787/ws`, recarregando a cada mudança |
| `npm run check` | Checagem de tipos do cliente e do servidor (obrigatório antes de entregar) |
| `npm test` | Testes do motor e do transporte Firebase |
| `npm run build` | Build estático do cliente em `dist/` |
| `npm run build:server` | Servidor empacotado em `dist-server/index.cjs` |
| `npm start` | Roda o servidor empacotado |
| `npm run lint` | ESLint |

Para jogar localmente com o servidor:

```bash
npm run dev:server
```

```bash
VITE_WS_URL=ws://localhost:8787 npm run dev
```

Sem `VITE_WS_URL`, o `npm run dev` usa o Firebase.

## 2.3 Variáveis de ambiente

### Cliente (tempo de build, prefixo `VITE_`)

| Variável | Padrão | Efeito |
|---|---|---|
| `VITE_WS_URL` | vazia | Endereço do servidor WebSocket. Aceita `wss://host`, `https://host` ou a URL completa com `/ws`. Vazia: usa o Firebase |

A configuração web do Firebase está em [`src/lib/firebase.ts`](../src/lib/firebase.ts).
Ela identifica o projeto e não é segredo: quem protege os dados são as regras
do Realtime Database (ver [06-banco-de-dados.md](06-banco-de-dados.md)).

### Servidor

| Variável | Padrão | Efeito |
|---|---|---|
| `PORT` | `8787` | Porta HTTP e WebSocket |
| `ALLOWED_ORIGINS` | vazia (qualquer) | Origens aceitas, separadas por vírgula. Em produção use `https://ruanps.com.br` |
| `ROOM_TTL_MIN` | `30` | Minutos que uma sala sem ninguém conectado sobrevive |
| `MAX_ROOMS` | `500` | Teto de salas simultâneas |
| `ROOMS_FILE` | vazia | Arquivo JSON para salvar as salas e sobreviver a reinício e deploy |

## 2.4 Deploy

### Cliente (GitHub Pages)

O workflow [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml)
roda em todo push na `main`: instala com `npm ci`, roda `npm run check` e
`npm test`, faz o build e publica `dist/`. Para o cliente usar o servidor
WebSocket, crie a **variável** de repositório `VITE_WS_URL` (Settings, Secrets
and variables, Actions, aba Variables) com o endereço `wss://` do servidor.

O build também gera o PWA (`manifest.webmanifest`, `sw.js` e os ícones de
`public/`). O GitHub Pages serve tudo por HTTPS, que é requisito para o
service worker e para a instalação. Depois de um deploy, quem está com a mesa
aberta vê o aviso "Há uma versão nova da mesa" e escolhe quando atualizar.

### Servidor (qualquer host de Node ou contêiner)

O [`Dockerfile`](../Dockerfile) gera uma imagem pequena só com o servidor
empacotado. Serve para Render, Railway, Fly.io, Google Cloud Run ou uma VPS:

```bash
docker build -t vcp-server .
```

```bash
docker run -p 8787:8787 -e ALLOWED_ORIGINS=https://ruanps.com.br -e ROOMS_FILE=/data/rooms.json -v vcp-data:/data vcp-server
```

Requisitos do host: suportar WebSocket (todos os citados suportam), servir por
HTTPS (o navegador bloqueia `ws://` em página `https://`) e, para usar
`ROOMS_FILE`, ter um disco persistente. Cloud Run e serviços que dormem sem
tráfego derrubam as salas em memória ao escalar para zero; nesse caso mantenha
ao menos uma instância ativa ou use `ROOMS_FILE` em volume.

Rode **uma instância só**: as salas vivem na memória do processo. Para mais de
uma instância seria preciso um armazenamento compartilhado (Redis, por exemplo)
e afinidade de sessão por sala.
