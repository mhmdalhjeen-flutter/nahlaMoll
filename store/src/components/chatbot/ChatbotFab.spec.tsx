import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ChatbotFab } from './ChatbotFab';
import { ShellUiProvider } from '@/components/layout/ShellUiContext';

function renderFab(props: { hidden?: boolean } = {}) {
  return renderToStaticMarkup(
    <ShellUiProvider>
      <ChatbotFab {...props} />
    </ShellUiProvider>,
  );
}

describe('ChatbotFab', () => {
  it('renders the assistant entry button with emoji and accessible label', () => {
    const html = renderFab();
    expect(html).toContain('data-testid="chatbot-fab"');
    expect(html).toContain('😇');
    expect(html).toContain('aria-label="اسأل نحلة مول"');
    expect(html).not.toContain('>اسأل نحلة مول</span>');
  });

  it('is visible on desktop and mobile', () => {
    const html = renderFab();
    expect(html).toContain('md:bottom-6');
    expect(html).toContain('md:right-6');
    expect(html).not.toContain('md:hidden');
  });

  it('does not auto-open a conversation shell', () => {
    const html = renderFab();
    expect(html).not.toContain('المساعد الذكي قيد الإعداد');
    expect(html).not.toContain('role="dialog"');
  });

  it('does not show a notification badge', () => {
    const html = renderFab();
    expect(html).not.toContain('rounded-full bg-primary-600 text-white text-[10px]');
  });

  it('returns null when hidden', () => {
    const html = renderFab({ hidden: true });
    expect(html).toBe('');
  });
});
