# Third-party notices

## Rocom-Shiny-Helper

The egg-group and attribute color mappings in `src/colors.js` are copied from:

- Egg-group colors: <https://github.com/JayeGT002/Rocom-Shiny-Helper/blob/main/pages/egg-group.html>
- Attribute colors: <https://github.com/JayeGT002/Rocom-Shiny-Helper/blob/main/js/app.js>
- Attribute icons in `public/attributes/`: <https://github.com/JayeGT002/Rocom-Shiny-Helper/tree/main/images/attrs>

Copyright (c) 2026 JayeGT002

Licensed under the MIT License:

> MIT License
>
> Copyright (c) 2026 JayeGT002
>
> Permission is hereby granted, free of charge, to any person obtaining a copy
> of this software and associated documentation files (the "Software"), to deal
> in the Software without restriction, including without limitation the rights
> to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
> copies of the Software, and to permit persons to whom the Software is
> furnished to do so, subject to the following conditions:
>
> The above copyright notice and this permission notice shall be included in all
> copies or substantial portions of the Software.
>
> THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
> IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
> FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
> AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
> LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
> OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
> SOFTWARE.

## Rocom Wiki Data and 洛克王国世界 WIKI

The `attributes` field added to `../data/pets.json` was matched by Pokédex number and title against the published [Rocom Wiki Data dataset](https://github.com/JayeGT002/rocom-wiki-data). The dataset's [`LICENSE`](https://github.com/JayeGT002/rocom-wiki-data/blob/main/LICENSE) and the current [nrc WIKI site declaration](https://wiki.biligame.com/nrc/%E6%B4%9B%E5%85%8B%E7%8E%8B%E5%9B%BD%E4%B8%96%E7%95%8C:%E7%AB%99%E7%82%B9%E5%A3%B0%E6%98%8E) state that WIKI-derived data and authorized data compilations use [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). The old-domain [rocom WIKI homepage](https://wiki.biligame.com/rocom/%E9%A6%96%E9%A1%B5) still displays CC BY-NC-SA 4.0; both domains are the same WIKI, and this app follows the current site declaration. The WIKI license excludes game and third-party media.

Attribution: 洛克王国世界 WIKI contributors; data compilation by JayeGT002 in [rocom-wiki-data](https://github.com/JayeGT002/rocom-wiki-data). The matched attribute values use CC BY-SA 4.0: attribution and share-alike; commercial use is permitted under the license terms. The source and license are in the JSON file's top-level metadata. These values are not relicensed by the application's MIT License. See [`../DATA-LICENSES.md`](../DATA-LICENSES.md) for scope details.

## rocokingdom-ui

The application uses the `rocokingdom-ui` npm package (version `0.0.1-beta.0`). Its npm package metadata declares the MIT License and credits Charles Lee. See the [upstream project](https://github.com/rookie-orange/rocokingdom-ui).

## Remix Icon

The title bar uses the `search-line`, `calculator-line`, and `settings-3-line` icons from [Remix Icon](https://remixicon.com/), version 4.9.1. The Remix Icon license permits these icons to be included in applications; attribution is optional. See the [license](https://cdn.jsdelivr.net/npm/remixicon@4.9.1/License).

## Game materials

The existing files in `public/pet-portraits/` were collected from the [official game asset page](https://rocom.qq.com/act/a20250719icreate/images.html). The 13 newly added avatars for S5 initial forms and 果实立方人 were retrieved from BWIKI `PetAvatar_*.png` file pages and are listed in [`DATA-LICENSES.md`](../DATA-LICENSES.md). BWIKI is the hosting and retrieval source, not the rights holder. Game images, animations, audio, and original game text used in this project are included only to better present game reference material. Their copyrights belong to 魔方工作室群、洛克王国世界项目组及其关联公司、组织. They are not covered by the application MIT License or the WIKI data license. Text written by WIKI contributors remains subject to the license declared by its source page. The portrait source collection details are in `source-assets/pet-illustrations/README.md`.
