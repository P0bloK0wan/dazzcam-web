# Fluxos do estúdio

- **Câmera** aproveita o visor, ajustes, captura de foto e vídeo e álbum da versão anterior.
- **Foto e carrossel** combina imagens, textos e adesivos em até 20 páginas. A unidade de posição horizontal é a largura de um slide. Uma camada com largura de 200% pode ocupar duas páginas. Exporte JPEG ou PNG, ou um ZIP com um arquivo por página.
- **Vídeo** recebe fotos, vídeos e faixas de áudio. Os controles do clipe configuram o início e o fim no arquivo de origem. Áudios, textos e legendas usam a posição na linha do tempo. O navegador grava a composição em tempo real, em MP4 ou WebM conforme o codec disponível. Mantenha a aba aberta durante a exportação.

Os rascunhos e as mídias importadas ficam no IndexedDB. A versão 2 preserva o objeto de armazenamento do álbum e acrescenta o de projetos. Excluir do álbum uma mídia em uso oculta o item e preserva a referência do rascunho. O catálogo é carregado sob demanda.

## Proveniência e análise REA

A pasta pública fornecida para o 2Shoot tem seis pastas de partes. O catálogo contém 1.575 arquivos compatíveis enumerados diretamente nas partes: 1.353 imagens, 191 LUTs 3D, 28 áudios e 3 vídeos. O manifesto registra nome de origem, pasta, grupo, hash SHA-256 e nome numérico. O par de referência de 16 mm usa `500.png` e `500.1.mp4`. O importador está em `scripts/import-studio-media.py`.

Na amostra do pacote iOS, o REA 6.10.1 identificou `TwoShoot` como Mach-O na análise estática `inspect-artifact` (evidência `ev_102ff92acd061d6b5e75fe09a0e626de493bc21876817bf49931205ce92c2bf5`). Uma IPA de inventário, reconstruída localmente apenas com o executável, o plist e o catálogo compilado, foi reconhecida como IPA e concluiu `inventory_artifact` (evidência `ev_1d2c3398e08d5e922bb9ee4ca9adf61b2b683aa6cae817af82b220ce75ce4bab`). O comando de inspeção direta de `Assets.car` reportou formato não suportado. O catálogo web vem dos arquivos de mídia soltos e usa renderização própria. O executável, plist, catálogo compilado e outros componentes do aplicativo iOS ficam fora da distribuição web.

[Fonte do material](https://drive.google.com/drive/folders/1gaqlGsf48UUhre1qz8WJ3ESlxAQ7C1R7)
