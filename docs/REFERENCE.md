# Referência e análise REA

Referência fornecida: `DazzCam_Correto - Copia.zip`, Google Drive ID
`1SlZLbqP_xjwSwcgkzAWsr1rzvV29ySPR`. O pacote contém o aplicativo iOS
`DazzCamera.app`, versão **2.17.7 (4)**, identificador
`dazz.camera.vintagecamera`, mínimo iOS 16.0. Esses metadados foram lidos
diretamente de `Info.plist`; não são resultado de execução do app.

## Evidências preservadas

Análise estática com **REA 6.7.0**, pelo CLI oficial `rea-agents`:

| Evidência | Arquivo / identificador |
| --- | --- |
| Inspeção do ZIP | [artifact.json](evidence/artifact.json), `ev_640390a4af5cbccd30fa44963d68517f850551f48b4d62c77d6ef80eb2132a97` |
| Inventário dentro da inspeção | `ev_25fa7d88533d95bdf7cb48a137ea4b9f72f4d1719de1537adc20307d863940c0` |
| Interface Builder | [interface.json](evidence/interface.json), `ev_a219a10f20e2a2805f97c6ad8fb9ea3bbf66eca4ca38ee2eea5a1148fcd356a0` |
| SHA-256 do ZIP | `a0551ef30fff9a75e0824849997f38312d9d6ab57abcd1837f483af141cd583f` |
| SHA-256 do executável | `1f5a72b8d33634503badd3213e61f880a83bc899884845c7b8e900367a57ca6a` |

O inventário identifica 848 nós de conteúdo e 937 ocorrências (incluindo a
raiz). A decodificação cobre os 35 documentos Interface Builder encontrados,
sem truncamento declarado. Os binários, fotografias, texturas e shaders do
pacote original não integram esta reconstrução.

## Mapa de funcionalidades

| Área | Observação verificável | Limite / implicação para a web |
| --- | --- | --- |
| Captura | `Base.lproj/Main.storyboardc` contém `takePhotoButton`, `toolsView`, `btnCameraProduct` e ação `clickCameraProduct:`. | Confirma controles declarados, não o pipeline nativo de captura. |
| Importação e vídeo | `MainImportController.nib`, `onClickedImport:`, `onGeneralVideo:`, `imageCollectionView`, `btnRemoveAll`. | Fluxo declarado; codecs e efeitos finais não foram observados em execução. |
| Galeria | `Album.storyboardc/album_gallery.nib` usa `DAlbumViewController` e `showCollectionView`. | A web usa armazenamento local do navegador, não Photos/iCloud. |
| Colagem | `CollageViewController`, `CollagePreviewController`, `onGeneralCollage:`, `onRandomizeClick:`, `onSaveClick:`; texto “Import multiple photos to create an Inst slideshow.” | Composição e exportação precisam de implementação web própria. |
| Negativos | `DarkroomController.nib`; texto “Redevelop the Film Negatives after shooting to adjust exposure or color.” | Guardar imagem original e ajustes permite edição não destrutiva; não equivale a RAW do sensor. |
| Lentes | Ações `onClickFisheyeModeNormal:` e `onClickFisheyeModeCicle:`. | A distorção exata não foi recuperada. |
| Câmeras e perfis | NIBs apresentam explicitamente `FXN,GRD,CCD`, `OFM` e atualização `FXN2`. | Nomes observados; parâmetros matemáticos de cor permanecem desconhecidos. |
| Ajustes | `en.lproj/Localizable.strings` declara exposição, ISO/obturador, temperatura, HSL, curvas, granulação, realces, proporção, moldura, perfurações, FPS e resolução. | A presença de tradução não prova disponibilidade em todas as câmeras. |
| Temporizador e sequência | Traduções `TIMER` e `Burst_Mode` (“Automatically take a photo every few seconds.”). | Tempos e restrições originais não estabelecidos. |
| Dupla exposição | Tradução `Negative_Film_With_Lens` menciona incompatibilidade de negativos com lentes adicionais e dupla exposição. | Confirma referência ao recurso, não sua fórmula de composição. |
| Compras | `BuyPro.storyboardc` declara compra anual, compra única e restauração. | Cobranças Apple não são transferíveis à versão web; não simular compras válidas. |

O inventário contém arquivos de exemplo com prefixos `vhs`, `8mm`, `16mm`,
`kino`, `s67`, `135ne`, `135sr`, `dexp`, `dblack`, `instc`, `instsq`, `instss`,
`dslide`, `sclassic`, `OFM`, `FXNR`, `grdr`, `DAM`, entre outros. Isso fornece
pistas de famílias de efeitos, **não um catálogo completo validado** nem os
nomes comerciais exatos de todas as câmeras.

## Fidelidade e cobertura

- Identidade do pacote e presença dos recursos: **respondidas estaticamente**.
- Controles, telas e funcionalidades declaradas: **parcialmente respondidas**.
- Geometria exata, animações, visibilidade em tempo de execução e navegação:
  **não verificadas**. O REA declara `archive_hierarchy_not_decoded` para as
  hierarquias; decodificar objetos não recupera a posição final em pixels.
- Fórmulas dos filtros, LUTs, algoritmos Metal e equivalência das imagens:
  **não recuperadas**. Efeitos web são reimplementações aproximadas.
- ProRAW, dados de profundidade/D3D, Live Photos nativas, log de câmera e
  seleção de lentes/ISO/obturador: dependem de APIs e hardware Apple;
  não presumir equivalência com `getUserMedia`.
- Nenhuma execução do original em iPhone, gravação de comportamento ou
  comparação visual lado a lado foi realizada. Testes da implementação web
  não demonstram igualdade com o aplicativo original.

Comandos reproduzíveis, após obter o mesmo pacote e extrair com segurança:

```sh
npx -y rea-agents@6.7.0 inspect-artifact /caminho/dazzcam.zip --format json
npx -y rea-agents@6.7.0 decode-interface-builder /caminho/Payload/DazzCamera.app --format json
```

As decisões de interface responsiva, armazenamento e processamento web são
decisões da reconstrução. Este documento não atesta reprodução integral ou
pixel a pixel do Dazz Cam.
