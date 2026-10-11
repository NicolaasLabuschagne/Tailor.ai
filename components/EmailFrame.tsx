'use client';

import React, { useEffect, useRef, useState } from 'react';

const EMAIL_WIDTH = 660;

// Renders email HTML in a sandboxed iframe. With `scaleToFit`, shrinks a desktop-width render into
// its container (for thumbnails); otherwise the iframe grows to the email's full height.
export default function EmailFrame({
  html,
  scaleToFit = false,
  height,
  title = 'Email preview',
}: {
  html: string;
  scaleToFit?: boolean;
  height?: number;
  title?: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [scale, setScale] = useState(1);
  const [contentHeight, setContentHeight] = useState(height ?? 900);

  useEffect(() => {
    if (!scaleToFit || !wrapRef.current) return;
    const el = wrapRef.current;
    const observer = new ResizeObserver(() => setScale(el.clientWidth / EMAIL_WIDTH));
    observer.observe(el);
    return () => observer.disconnect();
  }, [scaleToFit]);

  // Same-origin (no scripts) lets us measure the rendered email so it never gets clipped
  const measure = () => {
    const doc = frameRef.current?.contentDocument;
    if (!doc?.body || height) return;
    // Measure the body, not the document: the document is never shorter than the iframe itself
    const style = doc.defaultView?.getComputedStyle(doc.body);
    const margins = style ? parseFloat(style.marginTop) + parseFloat(style.marginBottom) : 0;
    setContentHeight(Math.ceil(doc.body.scrollHeight + margins));
  };

  useEffect(() => {
    const timer = setTimeout(measure, 600); // web fonts and images can shift layout after load
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [html]);

  if (scaleToFit) {
    const boxHeight = height ?? 320;
    return (
      <div ref={wrapRef} className="relative w-full overflow-hidden" style={{ height: boxHeight }}>
        <iframe
          ref={frameRef}
          srcDoc={html}
          title={title}
          sandbox="allow-same-origin"
          tabIndex={-1}
          className="absolute top-0 left-0 border-0 pointer-events-none origin-top-left"
          style={{ width: EMAIL_WIDTH, height: boxHeight / scale, transform: `scale(${scale})` }}
        />
      </div>
    );
  }

  return (
    <iframe
      ref={frameRef}
      srcDoc={html}
      title={title}
      onLoad={measure}
      sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
      className="w-full border-0 block"
      style={{ height: height ?? contentHeight }}
    />
  );
}
