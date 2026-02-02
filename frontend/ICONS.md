# Icon & Image Strategy (Frontend)

Overview
- Use `lucide-react` for common UI glyphs (tree-shakeable, fast dev).
- Keep branding and complex artwork as local optimized SVG files under `src/assets/icons/`.
- Use `next/image` for photos/avatars/raster assets when applicable.

How to use
- Lucide example (pass component to `IconButton`):

```tsx
import { Settings, Plus } from 'lucide-react'
import IconButton from '@/components/IconButton'

<IconButton label="New Task" icon={Plus} endIcon={Settings} />
```

- Local SVG example (SVGR):

```tsx
import BrandLogo from '@/assets/icons/brand-logo.svg'
// or via wrapper: import BrandLogo from '@/assets/icons/BrandLogo'
<BrandLogo width={20} height={20} aria-hidden />
```

Optimization & build
- We added `svgo` + `.svgo.yml` to optimize SVGs. Run:

```bash
cd frontend
npm install
npm run optimize:icons   # runs svgo against src/assets/icons
This will run `svgo` against `src/assets/icons`.

Notes:
- Use the `ThemeToggle` component in `Header` to switch light/dark. It sets the `dark` class on `document.documentElement` to maintain Tailwind compatibility.
- Run the icon optimizer before committing large batches of SVGs.
```

- We added `@svgr/webpack` and a webpack rule in `next.config.ts` so you can import `.svg` files as React components.

Accessibility / ARIA
- Decorative icons: mark `aria-hidden` or use the `Icon` wrapper with `decorative={true}`.
- Meaningful icons in controls: provide `aria-label` on the control or `title` on the SVG.

Next steps
- Run `npm run optimize:icons` locally and start dev server to preview.
- If you want, I can convert additional inline SVGs or raster avatars to local SVGs / `next/image` automatically.
