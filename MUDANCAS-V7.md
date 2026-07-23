# Multy Forças — v7: correção de cache no celular

## O diagnóstico
As abas novas (Grupos, Evolução, Avaliações do professor) **existem no
código** desde as versões anteriores — não há nada no app que as esconda
especificamente no celular. O problema é que o **navegador do celular
guardou uma versão antiga** do site em cache e não estava buscando a mais
nova a cada visita. Isso é super comum em PWAs/sites "tipo app": o
celular tende a ser mais agressivo guardando página em cache do que o
navegador de computador.

## O que corrigi no código (pra não acontecer de novo)
1. **`vercel.json`** (novo arquivo) — diz explicitamente pra Vercel nunca
   guardar o `index.html` em cache (`no-cache, no-store, must-revalidate`).
   Isso é o arquivo mais importante de não cachear, porque é ele que aponta
   pra qual versão do JavaScript carregar — se ele ficar velho, o app
   inteiro fica velho, não importa quantas vezes você atualize o código.
   Os arquivos dentro de `/assets/` (o JS e CSS de verdade, com nome tipo
   `index-a8f3c2.js`) continuam podendo ser cacheados pra sempre — isso é
   seguro porque cada build gera nomes novos, então cache velho nunca
   conflita com versão nova.
2. **`index.html`** — reforcei com meta tags de "não cachear" direto no
   HTML, como segunda camada de proteção (alguns navegadores mobile mais
   antigos dão mais atenção a isso do que ao header HTTP sozinho).

Com isso, a partir do próximo deploy, qualquer atualização futura do app
deve aparecer automaticamente na próxima vez que alguém abrir o app no
celular — sem precisar limpar cache manualmente toda vez.

## O que fazer AGORA pra resolver o que já está preso no seu celular
Essa correção vale pra próxima vez que você publicar algo — mas o cache
que já está no seu celular **agora** precisa ser limpo manualmente uma
vez. Escolha uma opção:

### Opção A — mais simples: fechar de verdade e reabrir
1. Feche a aba/app completamente (não só minimizar — feche de verdade,
   removendo dos apps recentes).
2. Se você tem o site "adicionado à tela inicial" (ícone como app), talvez
   precise **remover o ícone e adicionar de novo** depois do próximo deploy.
3. Reabra e veja se as abas aparecem.

### Opção B — limpar o cache do site especificamente
**No Chrome Android:**
1. Abra o Chrome → três pontinhos → **Configurações** → **Privacidade e segurança** → **Limpar dados de navegação**.
2. Ou, mais cirúrgico: toque no cadeado/ícone ao lado da URL do site → **Informações do site** → **Limpar dados do site**.

**No Safari iOS:**
1. Ajustes do iPhone → Safari → **Limpar Histórico e Dados dos Sites**
   (isso limpa de todos os sites, não só o seu — é a única forma nativa
   no Safari de limpar um site específico sem app de terceiros).

### Opção C — teste rápido pra confirmar o diagnóstico
Abra o link do app numa **aba anônima/privada** no celular. Se as abas
aparecerem lá, confirma 100% que era cache — porque aba anônima nunca usa
cache guardado.

## Arquivos alterados/criados
- `vercel.json` — novo, controla cache dos arquivos
- `index.html` — meta tags de no-cache

## Antes de publicar
`npm install` (nada novo pra instalar) + `git push` de sempre. Depois de
publicar, faça a limpeza de cache no celular (Opção A, B ou C acima) só
essa vez — deploys futuros não vão precisar disso.
