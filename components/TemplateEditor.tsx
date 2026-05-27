'use client';

import React, { useRef, useCallback, useState } from 'react';
import EmailEditor, { EditorRef } from 'react-email-editor';

const DEFAULT_TEMPLATE = {
  counters: { u_column: 1, u_row: 1, u_content_text: 3, u_content_button: 1, u_content_image: 1 },
  body: {
    rows: [
      {
        cells: [1],
        columns: [
          {
            contents: [
              {
                type: 'image',
                values: {
                  src: { url: '', width: 200, height: 'auto' },
                  textAlign: 'center',
                  containerPadding: '20px'
                }
              },
              {
                type: 'text',
                values: {
                  color: '#1a1a1a',
                  textAlign: 'center',
                  containerPadding: '10px 20px',
                  text: '<p style="font-size: 14px;"><strong>{{HEADLINE}}</strong></p>'
                }
              },
              {
                type: 'text',
                values: {
                  color: '#333333',
                  containerPadding: '10px 20px',
                  text: '<p>{{PARAGRAPH_1}}</p><p>{{PARAGRAPH_2}}</p><p>{{PARAGRAPH_3}}</p>'
                }
              },
              {
                type: 'text',
                values: {
                  color: '#444444',
                  fontStyle: 'italic',
                  containerPadding: '10px 20px',
                  text: '<p style="border-left: 3px solid #1a1a1a; padding-left: 10px;">{{PULL_QUOTE}}</p>'
                }
              },
              {
                type: 'text',
                values: {
                  color: '#333333',
                  containerPadding: '10px 20px',
                  text: '<p>{{CONNECTION}}</p>'
                }
              },
              {
                type: 'button',
                values: {
                  backgroundColor: '#1a1a1a',
                  color: '#ffffff',
                  text: '{{CTA_LABEL}}',
                  href: { url: '{{WEBSITE_URL}}' },
                  textAlign: 'center',
                  containerPadding: '20px'
                }
              },
              {
                type: 'text',
                values: {
                  color: '#aaaaaa',
                  textAlign: 'center',
                  containerPadding: '20px',
                  text: '<p style="font-size: 11px;">You are receiving this from {{BUSINESS_NAME}}. <a href="{{UNSUBSCRIBE_LINK}}">Unsubscribe</a></p>'
                }
              }
            ],
            values: { backgroundColor: '#ffffff', padding: '0px' }
          }
        ],
        values: { backgroundColor: '#f9f9f9', padding: '20px' }
      }
    ],
    values: { backgroundColor: '#ffffff', fontFamily: { label: 'Arial', value: 'Arial, sans-serif' } }
  },
  schemaVersion: 16
};

interface Props {
  initialDesign: any;
  onSave: (data: { html: string; design: any }) => void;
}

export default function TemplateEditor({ initialDesign, onSave }: Props) {
  const emailEditorRef = useRef<EditorRef>(null);

  const saveTemplate = useCallback(() => {
    if (!emailEditorRef.current?.editor) return;
    emailEditorRef.current.editor.exportHtml((data) => {
      const { design, html } = data;
      onSave({ html, design });
    });
  }, [onSave]);

  const onReady = useCallback(() => {
    if (!emailEditorRef.current?.editor) return;
    const design = initialDesign ? JSON.parse(initialDesign) : DEFAULT_TEMPLATE;
    emailEditorRef.current.editor.loadDesign(design);
  }, [initialDesign]);

  const onImageUpload = useCallback(async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/upload', { method: 'POST', body: formData });
    const data = await res.json();
    return { url: data.url };
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 min-h-[600px]">
        <EmailEditor
          ref={emailEditorRef}
          onReady={onReady}
          onLoad={() => {
             // Custom image upload handler
             if (emailEditorRef.current?.editor) {
               (emailEditorRef.current.editor as any).registerCallback('image', (file: any, done: any) => {
                  onImageUpload(file).then(data => done({ url: data.url }));
               });
             }
          }}
          options={{
            appearance: {
              theme: 'modern_light',
              panels: { tools: { dock: 'left' } }
            },
            features: {
              textEditor: { spellChecker: true, cleanPaste: true }
            },
            fonts: {
              showDefaultFonts: true,
              customFonts: [
                {
                  label: 'Inter',
                  value: "'Inter', sans-serif",
                  url: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap'
                },
                {
                  label: 'Playfair Display',
                  value: "'Playfair Display', serif",
                  url: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&display=swap'
                }
              ]
            },
            mergeTags: {
              subject: { name: 'Subject', value: '{{SUBJECT}}' },
              headline: { name: 'Headline', value: '{{HEADLINE}}' },
              paragraph1: { name: 'Paragraph 1', value: '{{PARAGRAPH_1}}' },
              paragraph2: { name: 'Paragraph 2', value: '{{PARAGRAPH_2}}' },
              paragraph3: { name: 'Paragraph 3', value: '{{PARAGRAPH_3}}' },
              pullQuote: { name: 'Pull Quote', value: '{{PULL_QUOTE}}' },
              connection: { name: 'Connection', value: '{{CONNECTION}}' },
              offerText: { name: 'Offer Text', value: '{{OFFER_TEXT}}' },
              ctaLabel: { name: 'CTA Label', value: '{{CTA_LABEL}}' },
              unsubscribeLink: { name: 'Unsubscribe', value: '{{UNSUBSCRIBE_LINK}}' },
              businessName: { name: 'Business Name', value: '{{BUSINESS_NAME}}' },
              websiteUrl: { name: 'Website URL', value: '{{WEBSITE_URL}}' },
            }
          }}
        />
      </div>
      <div className="p-4 bg-white border-t flex justify-end">
         <button
           onClick={saveTemplate}
           className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 font-medium"
         >
           Save Template
         </button>
      </div>
    </div>
  );
}
