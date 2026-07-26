#!/usr/bin/env python3
"""
BeeHive Screenshot Service
==========================
Converte um arquivo HTML em uma imagem PNG usando Playwright.
Ideal para gerar previews de sites de amostra para leads.

Usage:
    python screenshot.py <input_html> <output_png> [--width 1280] [--height 900] [--full-page]
"""

import argparse
import json
import os
import sys


def html_to_png(html_path: str, output_path: str, width: int = 1280, height: int = 900, full_page: bool = True):
    """
    Abre o HTML no Playwright, tira um screenshot e salva como PNG.
    """
    from playwright.sync_api import sync_playwright

    if not os.path.exists(html_path):
        print(f"[screenshot] Erro: arquivo não encontrado: {html_path}", file=sys.stderr)
        sys.exit(1)

    os.makedirs(os.path.dirname(output_path) or '.', exist_ok=True)

    html_abs = os.path.abspath(html_path)
    file_url = f'file://{html_abs.replace(os.sep, "/")}'

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page(viewport={'width': width, 'height': height})

            page.goto(file_url, wait_until='networkidle', timeout=30000)
            page.wait_for_timeout(1000)  # Wait for fonts/images to render

            if full_page:
                page.screenshot(path=output_path, full_page=True)
            else:
                page.screenshot(path=output_path)

            browser.close()

        file_size = os.path.getsize(output_path)
        print(f"[screenshot] ✅ PNG salvo: {output_path} ({file_size / 1024:.1f} KB)", file=sys.stderr)
        print(json.dumps({"ok": True, "file": output_path, "size_bytes": file_size}))

    except Exception as e:
        print(f"[screenshot] ❌ Erro: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(description='BeeHive HTML to PNG Screenshot Service')
    parser.add_argument('input', help='Caminho do arquivo HTML de entrada')
    parser.add_argument('output', help='Caminho do arquivo PNG de saída')
    parser.add_argument('--width', type=int, default=1280, help='Largura do viewport (default: 1280)')
    parser.add_argument('--height', type=int, default=900, help='Altura do viewport (default: 900)')
    parser.add_argument('--no-full-page', action='store_true', help='Não capturar página completa (só viewport)')

    args = parser.parse_args()

    html_to_png(
        html_path=args.input,
        output_path=args.output,
        width=args.width,
        height=args.height,
        full_page=not args.no_full_page,
    )


if __name__ == '__main__':
    main()
