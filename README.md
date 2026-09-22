# Urna eletrônica · 2A & 2B

Simulador escolar em HTML, CSS e JavaScript. A página inteira representa o gabinete da urna: tela à esquerda, identificação “Justiça Eleitoral”, teclado preto e teclas BRANCO, CORRIGE e CONFIRMA. O desenho é inspirado na referência fornecida, com um emblema vetorial estilizado e sem vínculo com a Justiça Eleitoral.

## Abrir

Baixe o repositório e abra **index.html** no navegador. Não precisa instalar dependências. Opcionalmente, execute `python -m http.server 8000` na pasta e acesse http://localhost:8000. Durante uma eleição, use sempre o mesmo navegador, dispositivo e endereço, pois os votos ficam no armazenamento local dessa origem.

## Votação

- **67**: primeiro candidato (Fulano por padrão).
- **33**: segundo candidato (Bertrano por padrão).
- Digite os **dois números**, confira o nome e pressione **CONFIRMA** ou Enter.
- **BRANCO**, ou a tecla **B**, seleciona voto em branco. Confirme para registrá-lo.
- **CORRIGE**, Backspace, Delete ou Escape limpa todo o preenchimento.
- Outros números são inválidos e não podem ser confirmados. Um terceiro dígito não altera um candidato já preenchido; use CORRIGE.
- Depois do som e da mensagem **FIM**, a urna fica pronta para a próxima pessoa.

Os números podem ser clicados ou digitados no teclado do computador. Em celulares, o gabinete se adapta à largura e coloca o teclado abaixo da tela.

## Área dos mesários

Na própria urna, com o preenchimento vazio, digite **012345678901**, incluindo o **zero inicial**. A área dos mesários abre automaticamente ao completar os 12 dígitos, sem precisar confirmar. O código também funciona depois de encerrar a eleição. Não existe mais um botão externo de acesso ao mesário.

O zero inicial inicia uma entrada separada, exibida como pontos. Essa sequência nunca é contada como voto. CORRIGE cancela o código. Um código incorreto com 12 dígitos é descartado e pode ser tentado novamente.

No painel é possível:

- Alterar os nomes dos candidatos **67 e 33** antes do primeiro voto.
- Conferir votos, brancos, total, percentuais, vencedor e empate.
- Encerrar a votação, bloqueando novos votos.
- Iniciar uma nova eleição, com confirmação antes de zerar os votos.

Os brancos entram no total e nos percentuais, mas não determinam o vencedor. Empates não apagam a contagem automaticamente. Os nomes são preservados ao iniciar uma nova eleição.

O código está em `ADMIN_CODE` e os números em `CANDIDATE_NUMBERS`, no arquivo `app.js`. Os votos e nomes da versão anterior são preservados: o antigo candidato 1 corresponde ao **67**, e o antigo candidato 2 ao **33**.

## Sons

Sons gerados localmente pela Web Audio API, com bipes de tecla e uma sequência rápida seguida de um tom prolongado na confirmação. O ganho foi aumentado em relação à primeira versão e o timbre filtrado para aproximar a sonoridade de uma urna, sem arquivos externos. É uma síntese inspirada no equipamento, não uma gravação oficial. O volume final depende do navegador, do sistema e dos alto-falantes. O botão “Som ligado” permite silenciar.

## Armazenamento e limites

Os votos ficam no `localStorage` e sobrevivem a recarregamentos. Use uma única aba por eleição. Se os dados mudarem em outra aba, esta urna bloqueia a votação até recarregar. Se não for possível salvar, o voto não é confirmado. Não limpe os dados do navegador durante a eleição.

É um simulador educativo local, sem servidor, sincronização ou identificação dos eleitores. A organização da fila cabe ao mesário. O código no JavaScript é uma proteção de interface, não autenticação segura: alguém com ferramentas do navegador pode ler o código e modificar dados. Não é destinado a eleições oficiais.

Nenhuma fonte, imagem, áudio ou biblioteca externa é necessária: a aplicação funciona offline.

## Arquivos

- `index.html`: gabinete, emblema vetorial e painel do mesário.
- `style.css`: aparência física e adaptação de tamanho.
- `app.js`: teclado, votação, sons, armazenamento e apuração.
