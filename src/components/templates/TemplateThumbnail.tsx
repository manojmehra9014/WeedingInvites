import React, { useEffect, useMemo, useRef, useState } from 'react';
import { TemplateDefinition } from '../../types/template';
import { WeddingData } from '../../types/wedding';
import { resolveDesign } from '../../utils/design';
import { InvitationSite } from './InvitationSite';

// Rendered at a real device width, then scaled to fit, so the thumbnail is the actual hero, not a
// mock-up. 1100 hits the desktop container breakpoints; 390 renders the true phone layout.
export const TemplateThumbnail: React.FC<{
  template: TemplateDefinition;
  weddingData: WeddingData;
  renderWidth?: number;
}> = ({ template, weddingData, renderWidth = 1100 }) => {
  const box = useRef<HTMLDivElement>(null);
  const [frame, setBox] = useState({ scale: 0.25, height: 0 });

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) =>
      setBox({ scale: entry.contentRect.width / renderWidth, height: entry.contentRect.height }),
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, [renderWidth]);

  // The couple's names with this template's own photography.
  const data = useMemo(
    () => ({ ...weddingData, couplePhotoUrl: template.previewImageUrl, coverPhotoUrl: template.previewImageUrl }),
    [weddingData, template.previewImageUrl],
  );
  const design = useMemo(() => resolveDesign(template), [template]);

  return (
    <div ref={box} className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden inert>
      {/* Min-height fills the whole box with the template's own background, never a white band. */}
      <div
        className="flex flex-col [&>*]:flex-1"
        style={{ width: renderWidth, minHeight: frame.height / frame.scale, transform: `scale(${frame.scale})`, transformOrigin: 'top left' }}
      >
        <InvitationSite weddingData={data} design={design} heroOnly />
      </div>
    </div>
  );
};
