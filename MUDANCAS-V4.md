# Multy Forças — v4: correções + Grupos de Ranking

## 🐛 Bug corrigido: "AdminDashboard não aparece"

**Causa raiz encontrada:** no `App.tsx`, um `useEffect` resetava a aba ativa
para "Meu Treino" toda vez que o objeto `profile` mudava de referência — e
isso acontece várias vezes em segundo plano por sessão (atualização do token
de notificação, streak, check-in...). Cada uma dessas atualizações
silenciosas te jogava de volta pro Treino, dando a impressão de que o
AdminDashboard não abria ou fechava sozinho.

**Correção:** a aba inicial agora só é definida **uma vez**, no momento do
login, usando um `ref` para não repetir. Além disso, cada cargo cai numa
aba inicial mais sensata: admin/colaborador → Alunos (dashboard),
professor → Montar Treinos, aluno → Meu Treino.

## 🎨 Tema menos escuro

Trocamos a paleta de preto puro (`#000`/`#09090b`) por um dark mode mais
claro e confortável (`#121215` como base, `#1c1c21`/`#2a2a31` para
superfícies). Como isso foi feito trocando os *tokens* de cor no
`index.css`, praticamente toda a interface herdou o ajuste automaticamente
— não precisamos editar cada tela individualmente. Só as telas de Login e
Redefinir Senha tinham um `bg-black` fixo (não usava o token) e foram
ajustadas à parte.

## 👥 Novo: Grupos de Ranking (criados pelos alunos)

Aba nova dentro de **Ranking**: alternador **Geral** (o ranking da
academia, como já era) × **Grupos** (rankings customizados).

- **Criar grupo**: qualquer aluno logado cria um grupo com nome próprio,
  escolhe **Público** (qualquer um encontra e entra com o código) ou
  **Privado** (só entra com código + senha definidos na criação).
- **Entrar em grupo**: campo de código de 6 caracteres (gerado
  automaticamente) + senha se for privado.
- **Ranking interno do grupo**: mostra só os membros daquele grupo,
  ordenados por treinos concluídos, com coroa no líder e destaque na sua
  própria posição — mesma linguagem visual do ranking geral.
- **Sair do grupo**: qualquer membro (exceto o criador) pode sair a
  qualquer momento.
- O ranking **Geral** da academia continua existindo exatamente como
  antes, incluindo o reset de temporada do admin.

### Nota de segurança sobre a "senha" dos grupos privados
É um código de sala tipo PIN entre amigos, **não uma senha no sentido de
credencial protegida** — ela fica legível no documento do Firestore por
qualquer usuário logado (as regras não escondem campos específicos dentro
de um documento, só o documento inteiro). Para o caso de uso ("time do
Instagram entrando com os amigos"), isso é aceitável; não é adequado para
proteger nada sensível. Documentado também em `types.ts` no tipo `Grupo`.

### Modelo de dados
```
grupos/{grupoId}
  nome, criadorId, criadorNome, publico, senha?, codigo, membros: [uid...], createdAt
```
Regras: qualquer logado lê; criar exige que o próprio criador seja o único
membro inicial; editar nome/visibilidade só o dono; entrar/sair só altera
o próprio uid no array `membros` (nunca o de outra pessoa).

## ✨ Mais animações e efeitos

- **Transição de página por slide** (com aceleração por GPU via
  `transform`/`opacity`) entre as abas do bottom nav, em vez do fade simples.
- **Efeito ambiente** nas luzes de fundo do login — agora "respiram"
  lentamente (`ambient-glow`), em vez de estáticas.
- **Ripple tátil** ao tocar nas abas do bottom nav (`whileTap` com spring
  no indicador deslizante, mais rápido e elástico que antes).
- Utilitário `.count-pop` no CSS pra números que atualizam (streak,
  treinos) — pronto pra usar em futuras iterações.
- Header e navegação inferior ganharam `backdrop-blur` mais forte e
  bordas mais integradas ao novo tom de cinza.

## 🧱 Correções de sobreposição (caixas/textos)

- **Header do Treino do dia**: título de ficha longo agora trunca em 2
  linhas (`line-clamp-2`) em vez de empurrar a pílula de streak pra fora
  da tela — o problema aparecia principalmente com nomes de ficha longos
  em celulares estreitos.
- **Lista de membros do AdminDashboard**: linha que espremia nome + badges
  + botões de ação numa única linha sem quebra agora usa `flex-wrap`,
  então em telas estreitas os botões descem pra uma segunda linha em vez
  de sobrepor o texto.
- **Bottom nav**: rótulos longos ("Meu Treino", "Montar Treinos") viraram
  "Treino" e "Treinos" — em 5 abas simultâneas (caso do admin), o texto
  antigo quebrava e sobrepunha o ícone vizinho.

## 📱 Experiência mobile

- **Área segura (notch/home indicator)**: header e bottom nav agora
  respeitam `env(safe-area-inset-top/bottom)` — em iPhones com notch ou
  Android com barra de gestos, o conteúdo não fica mais colado ou
  escondido atrás dessas áreas.
- **Zoom automático do iOS**: inputs de texto agora têm `font-size: 16px`
  no mobile — abaixo disso, o Safari força um zoom in ao focar o campo,
  o que já causou bastante confusão em formulários.
- **Sem scroll horizontal acidental**: `overflow-x: hidden` no `html`/`body`.
- Toques mínimos (`touch-action: manipulation`) para eliminar o pequeno
  atraso de 300ms que alguns navegadores mobile aplicam a cliques.

## O que ficou de fora desta rodada
- Ripple visual "de verdade" (círculo saindo do ponto exato do toque) —
  deixamos só a classe CSS pronta (`.tap-ripple`); implementar o JS que
  captura a posição do clique é um próximo passo pequeno, se quiser.
- Uma auditoria completa de sobreposição em **todas** as telas do
  AdminDashboard (94KB, muitas seções) — corrigimos o padrão mais comum e
  mais visível (lista de membros), mas telas específicas (ex: modal de
  montar treino) não foram revisadas uma a uma nesta rodada.

## Arquivos alterados/criados
- `src/App.tsx` — bug do tab reset corrigido, header com safe-area, transição por slide
- `src/index.css` — paleta mais clara, utilitários de animação, ajustes mobile
- `src/components/BottomNav.tsx` — safe-area, rótulos curtos, ripple no toque
- `src/pages/Ranking.tsx` — aba Geral/Grupos
- `src/pages/Grupos.tsx` — novo (criar/entrar/listar/ranking interno de grupos)
- `src/pages/Login.tsx`, `src/pages/ResetPassword.tsx` — fundo mais claro
- `src/pages/WorkoutView.tsx` — cabeçalho sem sobreposição
- `src/pages/AdminDashboard.tsx` — card de membro com flex-wrap
- `src/types.ts` — novo tipo `Grupo`
- `firestore.rules` — regras da coleção `grupos`

## Antes de publicar
1. Publicar o `firestore.rules` atualizado (nova seção `grupos`) no
   Firebase Console.
2. `git push` normal — sem mudanças de dependências desta vez, não precisa
   reinstalar nada além do que já está no `package.json`.
