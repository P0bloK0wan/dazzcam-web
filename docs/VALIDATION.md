# Verificação

Ambiente: Linux, Node.js 24.19.0 e Chromium headless. REA 6.7.0.

- `npm run check`: sintaxe dos três módulos JavaScript validada.
- `npm test`: quatro testes aprovados (recorte retrato/paisagem, zoom central, proporção original e identificação de perfis).
- Integração Playwright: imagem de demonstração, gravação em IndexedDB, favoritos, exportação JPEG, exportação ZIP, nova revelação do negativo, persistência após recarregar, colagem de duas fotos, captura de câmera simulada, vídeo com MediaRecorder, dupla exposição e seleção de câmera instantânea aprovados.
- Layout desktop 1440 px e móvel 390 px inspecionados por screenshots; largura da página móvel verificada sem overflow horizontal.

Câmera e microfone de teste são simulados pelo Chromium. Não houve teste com hardware físico, Safari/iPhone, diferentes codecs móveis, baixa memória ou álbum grande. O original iOS não foi executado; não existe validação comparativa pixel a pixel nem calibração dos filtros.

## Reproduzir a análise REA

Com o ZIP original armazenado localmente (não incluído):

```sh
npx -y rea-agents@6.7.0 inspect-artifact /caminho/dazzcam.zip --format json > artifact.json
npx -y rea-agents@6.7.0 decode-interface-builder /caminho/Payload/DazzCamera.app --format json > interface.json
```

As evidências integrais produzidas nesta sessão estão no diretório local `docs/evidence/` e são ignoradas pelo Git. `summary.json` conserva identidades, parâmetros e inventário resumido; `REFERENCE.md` descreve as conclusões e suas limitações. O código-fonte do REA não foi modificado.

## Verificação após a referência em vídeo

`npm run test:browser` passou na interface final baseada no vídeo, usando viewport 394 × 854. O teste mede o visor em x≈16, y≈86 e altura≈543 px (tolerância 2 px). Exercita os painéis EV, balanço de branco e focal; seletor em duas fileiras; captura; vídeo; dupla exposição; D Half; negativo; colagem; favoritos; exportação JPEG/ZIP; exclusão; persistência; recarga offline; e layout desktop/móvel. Nenhum erro JavaScript de página foi observado.

A inspeção visual compara estados, não estabelece igualdade de pixels: conteúdo da câmera varia, o sistema operacional e a notificação “Não Perturbe” não são parte do app web, e alguns ícones/perfis não mostrados integralmente são aproximações. O conteúdo do laptop filmado não é incluído como fundo da aplicação.
