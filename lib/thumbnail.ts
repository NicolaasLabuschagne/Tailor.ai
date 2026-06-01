import html2canvas from 'html2canvas';

export async function generateTemplateThumbnail(html: string): Promise<string> {
  const iframe = document.createElement('iframe');
  iframe.style.visibility = 'hidden';
  iframe.style.position = 'absolute';
  iframe.style.width = '600px';
  iframe.style.height = '1000px';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) throw new Error('Could not access iframe document');

  doc.open();
  doc.write(html);
  doc.close();

  // Wait for images to load
  await new Promise(resolve => setTimeout(resolve, 1000));

  const canvas = await html2canvas(doc.body, {
    width: 600,
    height: 420,
    scale: 0.33,
  });

  const base64 = canvas.toDataURL('image/jpeg', 0.7);
  document.body.removeChild(iframe);
  return base64;
}
