# Dazz Web Studio

Estúdio de fotografia vintage para navegador, desenvolvido a partir de uma investigação estática do pacote iOS Dazz Cam 2.17.7 com **REA 6.7.0**. Interface em português, sem servidor ou cadastro. A tela principal foi refeita usando os 329 quadros do vídeo de referência (394 × 854, 24 fps): fundo preto, visor vertical, recorte de 42 mm, fileiras de câmeras e painéis de exposição/temperatura/distância focal. Não é o aplicativo oficial nem uma recuperação do código-fonte original.

## Executar

Requisitos: Python 3 para servir; Node.js 22+ para as verificações.

```sh
git clone https://github.com/P0bloK0wan/dazzcam-web.git
cd dazzcam-web
npm start
# http://localhost:5173
```

Não há dependências de produção nem etapa de compilação. Publique a pasta `dist/` em qualquer hospedagem estática com HTTPS. Para GitHub Pages, configure **Settings → Pages → Source → GitHub Actions** e execute o workflow incluído. Abrir `index.html` diretamente por `file://` não é suportado.

## Funcionalidades implementadas

- Câmera frontal/traseira com permissão explícita; lanterna onde o dispositivo oferece suporte.
- Captura JPEG, temporizador de 3/10 segundos, grade, zoom digital e espelhamento frontal.
- Importação de fotos e vídeos; imagem de demonstração incluída.
- 15 receitas-base de câmeras: D Classic, CCD R, D Half, Inst C, Inst SQ, D Black, S 67, 135 NE, OFM, GR D, Kino, 8 mm, 16 mm, VHS e Original.
- Catálogo visual com nomes adicionais observados no vídeo (DAM, V Classic, Original V, V FunS, FXN, D Exp, FQS, Classic U, entre outros), derivados das receitas-base; não são reproduções dos algoritmos originais.
- Ajustes de exposição, contraste, saturação, temperatura, granulação, vinheta e vazamento de luz, aplicados na prévia e na imagem exportada.
- Proporções 2:3, 4:3, 3:2, 1:1, 16:9, 9:16 e original; molduras instantânea, branca e 35 mm; carimbo de data.
- Dupla exposição por duas capturas e D Half com dois quadros lado a lado.
- Gravação da imagem com efeitos via Canvas Capture + MediaRecorder; áudio do microfone quando autorizado. Vídeos importados podem ser regravados com efeitos. Exportação WebM ou MP4 conforme suporte do navegador.
- Álbum local persistente em IndexedDB: favoritos, filtros por mídia, visualização, reprodução, exclusão, exportação individual e ZIP do álbum.
- Negativos originais opcionais e nova revelação não destrutiva das fotos.
- Colagem de 2 a 6 fotos, grade/tira/lado a lado, espaçamento e cor de fundo.
- Preferências persistentes, versão instalável e cache offline após a primeira visita.

## Fidelidade e limites

**Não é uma réplica completa ou pixel a pixel.** O REA identificou recursos, ações e 35 documentos de interface do binário fornecido, mas não recuperou geometria final das telas, fórmulas dos filtros/LUTs ou comportamento executado. O vídeo posterior fornece referência visual para as telas demonstradas. A geometria principal foi reproduzida e medida, mas os efeitos continuam sendo implementações próprias. Telas não demonstradas são adaptações funcionais. Nenhum binário, shader ou fotografia do pacote iOS é redistribuído. Quatro quadros do seletor de câmeras do vídeo fornecido pelo usuário são usados como sprites; o código recorta visualmente apenas os ícones. A ilustração de demonstração foi criada para este projeto.

Não foram implementados os recursos nativos ProRAW/RAW, Live Photos, captura de profundidade/D3D, estabilização cinematográfica, controle manual real de ISO/obturador, widgets, integração com iCloud, compras/assinaturas, nem o catálogo completo e os algoritmos originais. Editor de curvas/HSL, perfis personalizados, film jitter, modo burst e fisheye permanecem fora desta implementação. Uma reprodução fiel desses recursos exige mais evidências e, em alguns casos, APIs de plataforma indisponíveis na web.

O zoom e a exposição são tratamentos digitais; não substituem controles ópticos/manuais. A simulação de grão não foi calibrada com imagens originais. O áudio de vídeos importados depende de `HTMLMediaElement.captureStream`. O navegador pode interromper vídeo/câmera em segundo plano. A gravação é em tempo real; não é transcodificação offline. Efeitos em alta resolução dependem da capacidade do dispositivo.

Leia [o relatório de investigação](docs/REFERENCE.md), [a matriz de cobertura](docs/COVERAGE.md) , [o mapa do vídeo](docs/VIDEO_REFERENCE.md) e [a verificação](docs/VALIDATION.md).

## Privacidade e dados

Fotos, vídeos e negativos ficam apenas no IndexedDB deste navegador. Não há upload de mídia ou analytics. A hospedagem recebe os acessos normais aos arquivos do site. Exporte seu álbum antes de limpar os dados do navegador ou mudar de dispositivo. O cache offline não é backup. Negativos podem conservar os metadados do arquivo importado; JPEGs revelados são gerados pelo canvas. Fontes são solicitadas ao Google Fonts, com fallback local.

## Testes

```sh
npm run check
npm test
# Testes de integração: instalar Playwright no ambiente de desenvolvimento
npm install --no-save playwright
# iniciar npm start em outro terminal
npm run test:browser
```

O teste de integração usa Chromium (`CHROMIUM_PATH` opcional) e câmera/microfone simulados, sem afirmar validação em hardware real ou Safari/iPhone.

## Estrutura

- `dist/`: aplicação pronta para servir, HTML/CSS e módulos JavaScript.
- `dist/renderer.js`: perfis, recorte e pipeline de efeitos Canvas 2D.
- `dist/storage.js`: transações IndexedDB.
- `dist/replica.js` e `dist/replica.css`: interface medida a partir do vídeo, catálogo visual e painéis.
- `dist/app.js`: câmera, vídeo, álbum, negativos, ZIP e colagens.
- `docs/`: análise REA, cobertura e resultados de testes.
- `tests/`: recorte/zoom e integração no navegador.
- `.github/workflows/`: testes e publicação estática opcional.

Marcas e nomes de terceiros pertencem aos respectivos titulares. Este projeto é independente e não tem afiliação com o aplicativo Dazz.
