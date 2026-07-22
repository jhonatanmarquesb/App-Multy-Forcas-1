# Multy Forças — v5: Professor responsável, aba do professor e leitura de PDF

## 1. Professor responsável obrigatório ao agendar

No formulário de "Agendar Consulta" (dentro de Alunos → aba Agenda, ou
onde quer que ele seja aberto no AdminDashboard), agora existe um bloco
**"Professor Responsável"** com a lista de todos os usuários cadastrados
com o cargo `professor`, em botões clicáveis — igual ao seletor de tipo de
serviço que já existia.

- **Obrigatório**: não dá pra salvar o agendamento sem escolher um
  professor. Se tentar, aparece um toast pedindo pra escolher.
- Se ainda não existe nenhum professor cadastrado no sistema, aparece um
  aviso explicando isso, em vez de uma lista vazia sem explicação.
- Ao editar um agendamento existente, o professor já atribuído vem
  pré-selecionado.

## 2. Nova aba para o professor: "Avaliações e Consultas"

O professor agora tem uma aba própria no menu inferior (ícone de
calendário, rótulo "Avaliações") que mostra **só os agendamentos
atribuídos a ele** — nunca os de outros professores. A lista é dividida
em:
- **Pendentes**: ainda sem avaliação registrada.
- **Concluídas**: já têm uma avaliação vinculada (badge dourado
  "Registrada").

Isso é filtrado tanto na consulta ao Firestore (`where('professorId', '==', uid)`)
quanto reforçado nas regras de segurança — mesmo que alguém tente ler
agendamentos de outro professor via API direta, a regra bloqueia.

## 3. Upload e leitura automática de PDF

Dentro de cada agendamento pendente, o botão **"Registrar"** abre um
formulário onde o professor pode:

1. **Anexar um PDF** da avaliação física (de balança de bioimpedância,
   planilha exportada, etc.).
2. Clicar em **"Ler PDF automaticamente"** — o app extrai o texto do PDF
   inteiramente no navegador (sem enviar pra nenhum servidor externo) e
   tenta reconhecer peso, altura, % de gordura, e as medidas de braço,
   peito, cintura, quadril e coxa, usando os termos mais comuns em
   português.
3. **Revisar os campos preenchidos** — o formulário sempre fica editável,
   mesmo depois da leitura automática. Nada é salvo sem o professor
   confirmar.
4. **Salvar** — cria o registro em `avaliacoes` (o mesmo que já alimenta a
   aba **Evolução** do aluno) e marca o agendamento como concluído.

### Limitação importante e honesta
A leitura automática funciona bem em **PDFs com texto selecionável**
(gerados digitalmente). Se o PDF for uma **foto/scan** (sem texto, só
imagem), não tem o que extrair — os campos ficam em branco e o app avisa
isso claramente, pedindo pra preencher manualmente. Isso não é OCR de
imagem; é extração de texto real do PDF. Adicionar OCR de verdade (pra
ler avaliações escaneadas) é um próximo passo possível, mas exige uma
biblioteca bem mais pesada ou um serviço externo — avisem se quiserem
essa evolução.

### Dependência nova
Adicionei `pdfjs-dist` ao `package.json` — é a biblioteca padrão da
Mozilla pra ler PDFs no navegador, mesma usada pelo visualizador de PDF
do Firefox. Ela só é carregada (dinamicamente) no momento em que alguém
clica em anexar um PDF — não pesa no carregamento inicial do app pros
outros usuários.

⚠️ **Atenção ao publicar**: essa é a primeira vez que usamos essa
biblioteca no projeto. Ela integra com o Vite de um jeito específico (o
worker do PDF é carregado via URL). Se o build falhar mencionando
`pdf.worker` ou `pdfjs-dist`, me avisa o erro exato que ajusto na hora —
esse é o tipo de coisa que só aparece com certeza depois de rodar num
ambiente real de build.

## Modelo de dados

```
agendamentos/{id}
  ...campos que já existiam...
  professorId: string        ← NOVO, obrigatório
  professorName: string      ← NOVO
  avaliacaoId?: string        ← NOVO, preenchido quando a avaliação é registrada

avaliacoes/{id}
  ...campos que já existiam...
  pdfNome?: string             ← NOVO, nome do arquivo original
  agendamentoId?: string       ← NOVO, vincula de volta ao agendamento
```

## Regras do Firestore atualizadas
- `agendamentos`: professor só lê os que têm `professorId == seu uid`.
  Professor pode atualizar **apenas** o campo `avaliacaoId` (pra vincular
  a avaliação que acabou de registrar) — não pode alterar mais nada do
  agendamento (isso continua exclusivo de admin/colaborador).
- `agendamentos`: criar/editar agora **exige** `professorId` preenchido —
  um agendamento sem professor é rejeitado pelo banco, não só pela
  interface.
- `avaliacoes`: validação estendida pros campos novos (`pdfNome`,
  `agendamentoId`).

## Arquivos alterados/criados
- `src/types.ts` — tipo `Agendamento` formal; `Avaliacao` ganha `pdfNome`/`agendamentoId`
- `src/pages/AdminDashboard.tsx` — seletor de professor obrigatório no agendamento
- `src/pages/AvaliacoesConsultas.tsx` — novo, tela do professor
- `src/lib/pdfEvaluation.ts` — novo, extração de texto + reconhecimento de campos
- `src/components/BottomNav.tsx` — aba "Avaliações" pro professor
- `src/App.tsx` — roteamento da nova aba
- `firestore.rules` — regras de `agendamentos` e `avaliacoes` atualizadas
- `package.json` — `pdfjs-dist`

## Antes de publicar
1. `npm install` — pega o `pdfjs-dist` novo.
2. Publicar o `firestore.rules` atualizado no Firebase Console.
3. Se ainda não tem nenhum professor cadastrado no sistema, cadastre um
   em Alunos → Adicionar → cargo "Professor" antes de tentar agendar,
   senão o seletor vai aparecer vazio com o aviso explicativo.
