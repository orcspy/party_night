# Party Night — Third-Party Notices

This file applies to **Party Night v0.2.0**.

Party Night's original source code, project documentation, and original project
assets are **not** licensed under the third-party licenses reproduced below.
They are governed by the repository's root `LICENSE`.

The notices below are retained for third-party software distributed with, linked
into, bundled into, or vendored by the current Party Night runtime dependency
stack.

## 1. Runtime dependency baseline

The Party Night v0.2.0 `package-lock.json` records the following non-development
npm packages:

| Component | Version | License |
|---|---:|---|
| React | 19.0.0 | MIT |
| React DOM | 19.0.0 | MIT |
| Scheduler | 0.25.0 | MIT |
| Phaser | 3.90.0 | MIT |
| EventEmitter3 | 5.0.4 | MIT |

Phaser 3.90.0 also distributes or vendors third-party code used by the framework.
For completeness, this notice includes:

| Vendored / embedded component | Version | License |
|---|---:|---|
| Matter.js | 0.20.0 | MIT |
| poly-decomp.js | 0.3.0 | MIT |
| Earcut | 2.2.4 | ISC |

Including a notice here does not imply that Party Night directly calls every
feature of the listed component. The purpose of this file is to preserve the
applicable notices for the dependency distribution used to build the game.

---

## 2. React / React DOM / Scheduler

Components used by Party Night:

- React 19.0.0
- React DOM 19.0.0
- Scheduler 0.25.0

License: MIT

Copyright (c) Meta Platforms, Inc. and affiliates.

### MIT License

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

Upstream project:
https://github.com/facebook/react

License source used for this audit:
https://github.com/facebook/react/blob/v19.0.0/LICENSE

---

## 3. Phaser

Component used by Party Night:

- Phaser 3.90.0

License: MIT

Copyright (c) 2024 Richard Davey, Phaser Studio Inc.

### MIT License

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

Upstream project:
https://github.com/phaserjs/phaser

License source used for this audit:
https://github.com/phaserjs/phaser/blob/v3.90.0/LICENSE.md

---

## 4. EventEmitter3

Component resolved by the Party Night v0.2.0 runtime dependency graph:

- EventEmitter3 5.0.4

License: MIT

Copyright (c) 2014 Arnout Kazemier

### MIT License

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

Upstream project:
https://github.com/primus/eventemitter3

---

## 5. Matter.js

Phaser 3.90.0 contains its Matter.js integration/source distribution. Phaser
updated its bundled Matter.js line to version 0.20.0 before the 3.90.0 release.

Component:

- Matter.js 0.20.0

License: MIT

Copyright (c) Liam Brummitt and contributors.

### MIT License

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

Upstream project:
https://github.com/liabru/matter-js

License source used for this audit:
https://github.com/liabru/matter-js/blob/0.20.0/LICENSE

---

## 6. poly-decomp.js

Phaser's Matter.js source tree contains `poly-decomp`, whose vendored source
identifies itself as version 0.3.0.

Component:

- poly-decomp.js 0.3.0

License: MIT

Copyright (c) 2013 Stefan Hedman

### MIT License

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

Upstream project:
https://github.com/schteppe/poly-decomp.js

---

## 7. Earcut

Phaser uses Earcut internally for polygon triangulation. The Phaser 3.x line
used by Party Night contains the 2.2.4 update.

Component:

- Earcut 2.2.4

License: ISC

Copyright (c) 2016, Mapbox

### ISC License

Permission to use, copy, modify, and/or distribute this software for any purpose
with or without fee is hereby granted, provided that the above copyright notice
and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND
FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS
OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER
TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF
THIS SOFTWARE.

Upstream project:
https://github.com/mapbox/earcut

License source used for this audit:
https://github.com/mapbox/earcut/blob/v2.2.4/LICENSE

---

## 8. Development-only direct dependencies

The following direct dependencies are used for development, type checking,
building, or testing. They are not recorded as production dependencies in the
Party Night v0.2.0 lockfile.

| Component | Version | License |
|---|---:|---|
| @types/react | 19.0.8 | MIT |
| @types/react-dom | 19.0.3 | MIT |
| @vitejs/plugin-react | 4.3.4 | MIT |
| TypeScript | 5.7.3 | Apache-2.0 |
| Vite | 6.4.3 | MIT |
| Vitest | 3.2.7 | MIT |

These packages and their transitive development dependencies remain subject to
their respective upstream licenses when installed or used.

The Party Night repository does not intentionally redistribute `node_modules`.
If a future source or binary distribution starts bundling the development
toolchain itself, the third-party notice set should be regenerated for that
distribution.

---

## 9. Project assets

The v0.2.0 asset audit found no third-party image, font, BGM, SFX, SVG, JPEG,
WebP, or externally hosted media asset requiring an additional third-party
asset notice.

The active game asset set is generated by project-owned procedural Node scripts.
Historical unused terrain PNGs also have project-local generation history.

Accordingly, this file contains **no third-party media-asset license entries**
for Party Night v0.2.0.

---

## 10. Maintenance rule

Re-run the third-party license audit before release if any of the following
changes:

- `package.json`
- `package-lock.json`
- Phaser version
- externally sourced images, icons, fonts, music, sound effects, or other media
- CDN-hosted runtime libraries or assets
- copied or vendored third-party source code

This notice was prepared against the Party Night **v0.2.0** source/archive and
its current lockfile.
