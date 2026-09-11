# Multy Forças — v8: Tema automático + Histórico e Recordes (estilo Hevy)

Essa rodada teve dois focos, escolhidos porque eram os mais concretos e
de maior impacto dentro do pedido "app completo, base Smart Fit + Hevy +
Gymrats, com tema que acompanha o celular":

## 1. Tema claro/escuro automático

O app agora **detecta o tema do celular sozinho** (`prefers-color-scheme`)
e se adapta — se seu celular está no modo claro, o app abre claro; se
está escuro, abre escuro. Também dá pra forçar manualmente: um botão novo
no cabeçalho (ícone de sol/lua/celular) alterna entre **Automático →
Claro → Escuro → Automático**. A escolha fica salva no aparelho, então
não precisa escolher de novo toda vez.

Detalhe técnico que vale explicar: como quase toda a interface usa um
punhado de "cores-base" reaproveitadas em centenas de lugares (fundo dos
cards, fundo da página, bordas), consegui fazer o tema claro clareando só
essas cores-base — a maior parte da interface se ajustou automaticamente,
sem precisar editar tela por tela. Isso incluiu Login, Treino, Ranking,
Grupos, Evolução, Histórico (novo) e Avaliações e Consultas.

### O que não recebeu polimento visual completo nessa passada
O **AdminDashboard** é a tela mais densa do app (94KB, dezenas de seções)
— ele herda a paleta clara automaticamente pelo mesmo mecanismo acima
(cores de fundo, bordas), mas eu não revisei visualmente cada uma das
suas seções específicas pra garantir que nada ficou com contraste ruim no
modo claro. Se algo aparecer estranho lá (texto difícil de ler, por
exemplo), me manda o print que eu ajusto pontualmente — é mais rápido
corrigir um caso específico do que arriscar quebrar algo reescrevendo o
arquivo inteiro.

## 2. Histórico de Treinos + Recordes Pessoais (o "Hevy" do app)

Até a v7, o app só mostrava o treino de **hoje** — não existia nenhum
jeito de olhar o que você treinou semana passada, ou qual foi sua maior
carga no supino ao longo do tempo. Agora existe.

### Nova aba "Histórico" (só para alunos)
- **Lista de todos os treinos já finalizados**, mais recente primeiro,
  cada um mostrando data, volume total movido e a sequência daquele dia.
- Tocar em qualquer treino abre os detalhes completos: cada exercício,
  quantas séries de quantas foram feitas, reps e a carga usada.
- **Aba de Recordes Pessoais**: pra cada exercício que você já fez, o app
  calcula automaticamente a **maior carga que você já usou**, ordenado do
  maior recorde pro menor, com a data em que foi batido.
- Métricas rápidas no topo: total de treinos, volume total movido (em
  toneladas) e quantidade de recordes.

### Como funciona por trás
Antes, marcar séries só alterava a ficha "ao vivo" (ia sendo sobrescrita
a cada treino novo — não tinha memória do que aconteceu ontem). Agora,
ao **finalizar** um treino, o app grava um retrato congelado daquele dia
específico numa coleção nova (`sessoes`) — isso nunca é editado ou
apagado depois, é um registro histórico de verdade. Os Recordes Pessoais
são calculados comparando todos esses retratos.

## Sobre "disputa entre alunos" (o "Gymrats" do pedido)
Isso já existe desde a v3/v4: **Ranking geral** da academia + **Grupos**
customizados que qualquer aluno cria com os amigos (público ou privado
com senha), cada um com seu próprio placar. Não mudei nada nisso agora —
já está no espírito do que você pediu. Se quiser evoluir mais essa parte
(desafios com prazo, tipo "quem treina mais essa semana ganha X"), é um
próximo passo natural, me avisa se quiser que eu construa isso também.

## Sobre "base Smart Fit"
O Smart Fit app é focado em check-in de academia e agenda de aulas — o
Multy Forças já cobre isso (check-in automático ao completar o treino,
Agenda de avaliações/consultas). Não vi um recurso específico do Smart
Fit que ainda faltasse claramente aqui; se você tinha algo específico em
mente de lá (tipo mapa de unidades — que não se aplica a uma academia
única — ou algo de "aulas coletivas"), me conta que eu avalio.

## Modelo de dados novo
```
sessoes/{id}
  studentId, studentName, treinoId?, divisao, divisaoNome
  exercicios: [ { nome, seriesFeitas, seriesTotal, reps, cargaKg } ]
  volumeTotalKg, effort, streakNoDia, date, createdAt
```
Regras: só o próprio aluno cria a sua sessão; ninguém edita ou apaga
depois (é histórico, não rascunho); professor/colaborador/admin podem
ler, pra acompanhamento.

## Arquivos alterados/criados
- `src/contexts/ThemeContext.tsx` — novo, motor do tema claro/escuro
- `src/index.css` — paleta clara completa
- `src/App.tsx` — ThemeProvider, botão de tema, rota do Histórico
- `src/pages/Historico.tsx` — novo
- `src/pages/WorkoutView.tsx` — grava a sessão ao finalizar
- `src/components/BottomNav.tsx` — aba Histórico pros alunos
- `src/types.ts` — tipo `Sessao`/`SessaoExercicio`
- `firestore.rules` — coleção `sessoes`
- `index.html` — meta `theme-color` (a barra de status do celular acompanha o tema)

## Antes de publicar
1. `npm install` — sem dependência nova dessa vez.
2. Publicar o `firestore.rules` atualizado (nova seção `sessoes`).
3. `git push` de sempre.

## Testando o tema
No celular: Ajustes → Tela → alterna entre Claro/Escuro do próprio
sistema → o app deve acompanhar sozinho sem precisar reabrir. Ou usa o
botão no cabeçalho do app pra forçar manualmente.
