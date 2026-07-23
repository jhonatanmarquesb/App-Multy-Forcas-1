# Multy Forças — v6: Aluno vê o conteúdo completo da avaliação

## O que mudou

A aba **Evolução** ganhou uma seção nova: **Histórico de avaliações**,
logo abaixo dos cards de medidas. Antes, o aluno só via um resumo da
**última** avaliação (data + nome do professor + comentário, se tivesse).
Agora:

- **Lista de todas as avaliações já registradas**, mais recente primeiro,
  cada uma mostrando data, quem avaliou, o peso do dia, e um indicador
  "tem comentário" quando o professor escreveu alguma observação.
- **Tocar em qualquer avaliação abre uma folha com todos os detalhes**
  daquele dia específico:
  - Peso, altura e % de gordura registrados
  - Todas as medidas (braço, peito, cintura, quadril, coxa) — só mostra
    os campos que realmente foram preenchidos naquela avaliação
  - O **comentário completo do professor**, em destaque dourado
  - Se não tiver comentário, mostra isso claramente em vez de esconder a
    seção
  - Se a avaliação veio de um PDF (fluxo novo da v5), mostra o nome do
    arquivo original como referência

Assim o aluno consegue acompanhar **o que foi avaliado e o que o
professor observou** em cada visita, não só o número mais recente.

## Uma limitação importante pra você saber
O PDF original **não fica salvo em nenhum lugar** — no fluxo de upload
(v5), o app só lê o texto do PDF pra preencher os campos automaticamente,
e depois disso o arquivo é descartado (só o *nome* dele fica registrado,
como referência). Ou seja: o aluno vê o nome do arquivo, mas não pode
baixar ou abrir o PDF original pelo app, porque ele nunca foi armazenado.

Se quiser que o PDF fique disponível pra download depois (não só os dados
extraídos dele), é um passo a mais: subir o arquivo pro Firebase Storage
no momento do upload e salvar a URL na avaliação. Não implementei isso
agora porque muda o fluxo de custo/armazenamento do projeto (Storage tem
cobrança própria) — me avise se quiser que eu faça essa parte também.

## Segurança
Nenhuma mudança nas regras do Firestore foi necessária — o aluno já podia
ler os próprios documentos de `avaliacoes` desde a v3 (`resource.data.studentId == request.auth.uid`).
Essa era só uma limitação de **interface**, não de permissão: os dados já
estavam acessíveis, só não apareciam todos na tela.

## Arquivo alterado
- `src/pages/Evolucao.tsx`

## Antes de publicar
Só o de sempre: `npm install` (sem dependência nova dessa vez) e o
`git push`. **Não precisa mexer no `firestore.rules`** — não mudou nada
nessa rodada.
