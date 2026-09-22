# Urna escolar · 2A & 2B

Uma urna eletrônica para a eleição da turma, feita com **HTML, CSS e JavaScript**, inspirada no programa Python de contagem de votos. Interface responsiva com gabinete, tela, teclado com relevo, botões BRANCO/CORRIGE/CONFIRMA e sons sintetizados semelhantes aos de uma urna.

## Abrir

Baixe este repositório e abra **index.html** no navegador. Não precisa instalar pacotes ou executar Python. Para servir em localhost, opcionalmente execute `python -m http.server 8000` nesta pasta e acesse http://localhost:8000. Use sempre a mesma forma de acesso durante a eleição: trocar a origem/endereço muda o armazenamento utilizado.

## Votar

- **1**: Fulano; **2**: Bertrano.
- **3**, tecla **B** ou botão **BRANCO**: nenhum candidato.
- **CORRIGE**, Backspace, Delete ou Escape: limpar a seleção.
- **CONFIRMA**: registrar o voto; Enter também confirma quando o foco não está em outro botão.
- Aguarde o som e a mensagem **FIM**. A urna fica pronta para a próxima pessoa automaticamente.
- Números diferentes de 1, 2 e 3 são inválidos e não podem ser confirmados. Um segundo dígito não substitui a seleção: use CORRIGE.

O áudio é gerado pela Web Audio API depois de uma interação. Use o controle “Som ligado” para silenciar ou reativar. Os sons são uma aproximação sintetizada, não uma gravação oficial.

## Mesário e apuração

Clique em **Área do mesário** e informe o código do programa original: **12345678901**. Ele pode ser alterado na constante `ADMIN_CODE` em `app.js`.

Antes do primeiro voto, personalize os nomes dos dois candidatos. Depois do início, os nomes ficam bloqueados para preservar a associação dos votos. A apuração exibe os votos por candidato, os brancos, o total e o vencedor ou empate. Os votos em branco entram no total de comparecimento, mas não definem o vencedor. Os percentuais usam todos os votos como denominador.

**Encerrar votação** bloqueia novos votos. Em um empate, o mesário pode iniciar uma nova eleição. **Iniciar nova eleição** pede confirmação antes de zerar os votos e mantém os nomes dos candidatos. Ao contrário do exemplo Python, o empate não apaga a contagem automaticamente, permitindo conferir o resultado primeiro.

## Armazenamento e escopo

Este é um simulador educativo local. Os totais ficam no `localStorage` deste navegador/dispositivo e sobrevivem à atualização da página. Não há servidor nem sincronização entre computadores. Use **uma única aba e um único dispositivo** por eleição. Se detectar alterações em outra aba, a aplicação bloqueia a votação nesta aba até recarregar. Não limpe os dados do navegador durante a eleição. Se o armazenamento falhar, o voto não é confirmado.

O código do mesário está no JavaScript e não é autenticação segura: alguém com acesso às ferramentas do navegador pode ler o código e alterar os dados locais. O simulador não identifica eleitores nem impede a mesma pessoa de votar novamente; a turma deve organizar a fila com o mesário. Não é destinado a eleições oficiais.

A fonte do Google Fonts é opcional; sem internet, fontes locais são utilizadas e a votação e os sons continuam funcionando. Não há imagens ou bibliotecas externas necessárias.

## Arquivos

- `index.html`: estrutura e painel do mesário.
- `style.css`: aparência da urna e adaptação para celulares.
- `app.js`: votos, som, armazenamento, atalhos e apuração.
