// The host step for scripted widgets (one generic step, never a widget's own code).
//
// A page of the cut names a widget with one paragraph: a link whose target is /widgets/<id>/widget.js
// (the builder writes it; the folder public/widgets/<id>/ holds widget.js, widget.json and a list file,
// all checked before the cut is published). For each such paragraph this step
//   - reads public/widgets/<id>/widget.json at build time and puts it on a <figure> as a data attribute, so the
//     page needs no request to get it (the page policy refuses every request a script could make),
//   - replaces the paragraph with that <figure>, which says "needs JavaScript" until the widget mounts into it,
//   - adds one <script type="module"> for /widgets/<id>/widget.js, once per widget on the page.
// It loads nothing else: no other path, no URL, no code of its own for any widget.
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

export default function rehypeWidgets({ base = '/', publicDir }) {
  const prefix = base.replace(/\/$/, '');
  const LINK = /^\/widgets\/([\w-]+)\/widget\.js$/;
  const target = (n) => {
    if (n.type !== 'element' || n.tagName !== 'p') return null;
    const kids = (n.children ?? []).filter((c) => !(c.type === 'text' && c.value.trim() === ''));
    if (kids.length !== 1 || kids[0].type !== 'element' || kids[0].tagName !== 'a') return null;
    const m = LINK.exec(String(kids[0].properties?.href ?? ''));
    return m ? m[1] : null;
  };
  const walk = (node, seen) => {
    const out = [];
    for (const c of node.children ?? []) {
      const id = target(c);
      const file = id ? path.join(publicDir, 'widgets', id, 'widget.json') : null;
      if (id && file && existsSync(file)) {
        const data = JSON.parse(readFileSync(file, 'utf8'));
        out.push({
          type: 'element',
          tagName: 'figure',
          properties: {
            className: ['widget-host'],
            'data-widget-id': id,
            'data-widget-name': String(data.name),
            'data-widget-data': JSON.stringify(data),
          },
          children: [
            {
              type: 'element',
              tagName: 'figcaption',
              properties: {},
              children: [{ type: 'text', value: 'Interactive version: needs JavaScript.' }],
            },
          ],
        });
        if (!seen.has(id)) {
          seen.add(id);
          out.push({
            type: 'element',
            tagName: 'script',
            properties: { type: 'module', src: `${prefix}/widgets/${id}/widget.js` },
            children: [],
          });
        }
      } else {
        walk(c, seen);
        out.push(c);
      }
    }
    node.children = out;
  };
  return (tree) => walk(tree, new Set());
}
