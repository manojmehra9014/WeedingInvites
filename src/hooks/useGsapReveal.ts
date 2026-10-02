import { RefObject, useLayoutEffect } from 'react';
import { gsap, ScrollTrigger, SplitText } from '../utils/gsap';

/**
 * Declarative GSAP motion. Components opt in with attributes; one hook per scope does the work:
 *
 *   data-reveal[="up|left|right|scale|fade"]  fade/slide in when scrolled into view
 *   data-stagger[="0.08"]                      children reveal one after another
 *   data-batch                                 children reveal in batches as they enter (long grids)
 *   data-split                                 heading words rise out of a line mask (SplitText)
 *   data-parallax="-0.15"                      scrubbed vertical drift, fraction of own height
 *   data-counter="1277" [data-suffix="+"]      counts up from 0 (en-IN formatting)
 *   data-draw                                  SVG strokes draw in, scrubbed to scroll
 *   data-magnetic                              element leans toward the pointer (fine pointers)
 *   data-tilt                                  3D tilt toward the pointer (fine pointers)
 *   data-spotlight                             gold light follows the pointer (CSS in index.css)
 *
 * A subtree marked `data-reveal-scope` belongs to its own hook (e.g. InvitationSite, catalog grid),
 * so outer scopes skip it and nothing animates twice. Reduced-motion users get the final state.
 */
export function useGsapReveal(scope: RefObject<HTMLElement | null>, deps: unknown[] = []) {
  useLayoutEffect(() => {
    const root = scope.current;
    if (!root) return;
    root.setAttribute('data-reveal-scope', '');

    const own = (el: Element) => el.parentElement?.closest('[data-reveal-scope]') === root;
    const all = <T extends HTMLElement = HTMLElement>(sel: string) =>
      Array.from(root.querySelectorAll<T>(sel)).filter(own);

    const mm = gsap.matchMedia();
    mm.add(
      { motion: '(prefers-reduced-motion: no-preference)', fine: '(pointer: fine)' },
      (ctx) => {
        const { motion, fine } = ctx.conditions as { motion: boolean; fine: boolean };
        const cleanups: (() => void)[] = [];
        const onView = (trigger: Element) => ({ trigger, start: 'top 88%', once: true });
        // Always fromTo with explicit end values: a from() records its end state from the element at
        // creation, and after StrictMode's double-run or a refresh that state can be the hidden one,
        // leaving the element animating from invisible to invisible.
        const SHOWN = { autoAlpha: 1, x: 0, y: 0, scale: 1 };

        if (motion) {
          all('[data-reveal]').forEach((el) => {
            const kind = el.dataset.reveal || 'up';
            gsap.fromTo(
              el,
              {
                autoAlpha: 0,
                y: kind === 'up' ? 48 : 0,
                x: kind === 'left' ? -64 : kind === 'right' ? 64 : 0,
                scale: kind === 'scale' ? 0.9 : 1,
              },
              { ...SHOWN, duration: 1.2, scrollTrigger: onView(el) },
            );
          });

          all('[data-stagger]').forEach((parent) => {
            gsap.fromTo(
              parent.children,
              { autoAlpha: 0, y: 40 },
              { ...SHOWN, duration: 1, stagger: Number(parent.dataset.stagger) || 0.09, scrollTrigger: onView(parent) },
            );
          });

          all('[data-batch]').forEach((parent) => {
            const items = Array.from(parent.children);
            gsap.set(items, { autoAlpha: 0, y: 40 });
            ScrollTrigger.batch(items, {
              start: 'top 92%',
              once: true,
              onEnter: (batch) => gsap.to(batch, { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.07, overwrite: true }),
            });
          });

          all('[data-split]').forEach((el) => {
            SplitText.create(el, {
              type: 'lines,words',
              mask: 'lines',
              autoSplit: true,
              onSplit: (self) =>
                gsap.fromTo(
                  self.words,
                  { yPercent: 115 },
                  { yPercent: 0, duration: 1.2, stagger: 0.04, scrollTrigger: onView(el) },
                ),
            });
          });

          all('[data-parallax]').forEach((el) => {
            gsap.to(el, {
              yPercent: Number(el.dataset.parallax) * 100,
              ease: 'none',
              scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true },
            });
          });

          all('[data-counter]').forEach((el) => {
            const target = Number(el.dataset.counter);
            const suffix = el.dataset.suffix ?? '';
            // Write into React's own text node; replacing it would detach React and freeze later updates.
            // The last frame writes exactly `target`, so there is no "restore" step to get wrong.
            const node = el.firstChild?.nodeType === Node.TEXT_NODE ? el.firstChild : el;
            const obj = { v: 0 };
            gsap.to(obj, {
              v: target,
              duration: 2.2,
              ease: 'power3.out',
              scrollTrigger: onView(el),
              onUpdate: () => (node.textContent = `${Math.round(obj.v).toLocaleString('en-IN')}${suffix}`),
            });
          });

          all<SVGElement & HTMLElement>('[data-draw]').forEach((el) => {
            gsap.from(el, {
              drawSVG: 0,
              ease: 'none',
              scrollTrigger: { trigger: el, start: 'top 75%', end: 'bottom 45%', scrub: 0.6 },
            });
          });
        }

        if (motion && fine) {
          // Pointer effects set themselves up on first hover, so they never touch an element's
          // transform while its reveal is still pending.
          all('[data-magnetic]').forEach((el) => {
            let x: gsap.QuickToFunc | undefined;
            let y: gsap.QuickToFunc | undefined;
            const move = (e: PointerEvent) => {
              x ??= gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3.out' });
              y ??= gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3.out' });
              const r = el.getBoundingClientRect();
              x((e.clientX - r.left - r.width / 2) * 0.25);
              y((e.clientY - r.top - r.height / 2) * 0.35);
            };
            const leave = () => gsap.to(el, { x: 0, y: 0, duration: 0.9, ease: 'elastic.out(1, 0.4)' });
            el.addEventListener('pointermove', move);
            el.addEventListener('pointerleave', leave);
            cleanups.push(() => {
              el.removeEventListener('pointermove', move);
              el.removeEventListener('pointerleave', leave);
            });
          });

          all('[data-tilt]').forEach((el) => {
            let rx: gsap.QuickToFunc | undefined;
            let ry: gsap.QuickToFunc | undefined;
            const move = (e: PointerEvent) => {
              if (!rx || !ry) {
                gsap.set(el, { transformPerspective: 1000 });
                rx = gsap.quickTo(el, 'rotationX', { duration: 0.6, ease: 'power3.out' });
                ry = gsap.quickTo(el, 'rotationY', { duration: 0.6, ease: 'power3.out' });
              }
              const r = el.getBoundingClientRect();
              ry(((e.clientX - r.left) / r.width - 0.5) * 8);
              rx(-((e.clientY - r.top) / r.height - 0.5) * 8);
            };
            const leave = () => {
              rx?.(0);
              ry?.(0);
            };
            el.addEventListener('pointermove', move);
            el.addEventListener('pointerleave', leave);
            cleanups.push(() => {
              el.removeEventListener('pointermove', move);
              el.removeEventListener('pointerleave', leave);
            });
          });
        }

        // Spotlight is CSS-driven; only the pointer position comes from JS.
        all('[data-spotlight]').forEach((el) => {
          const move = (e: PointerEvent) => {
            const r = el.getBoundingClientRect();
            el.style.setProperty('--mx', `${e.clientX - r.left}px`);
            el.style.setProperty('--my', `${e.clientY - r.top}px`);
          };
          el.addEventListener('pointermove', move);
          cleanups.push(() => el.removeEventListener('pointermove', move));
        });

        return () => cleanups.forEach((fn) => fn());
      },
      root,
    );

    // Late webfonts, images and lazily rendered thumbnails change the page height after mount, which
    // leaves every trigger below them stale. Re-measure (debounced) whenever the scope's height changes.
    let t = 0;
    let lastHeight = root.offsetHeight;
    const ro = new ResizeObserver(() => {
      if (root.offsetHeight === lastHeight) return;
      lastHeight = root.offsetHeight;
      window.clearTimeout(t);
      t = window.setTimeout(() => ScrollTrigger.refresh(), 200);
    });
    ro.observe(root);

    return () => {
      window.clearTimeout(t);
      ro.disconnect();
      mm.revert();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
