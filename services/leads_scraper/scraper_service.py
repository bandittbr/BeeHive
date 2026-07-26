#!/usr/bin/env python3
"""
BeeHive Leads Scraper Service
=============================
Wrapper around Google Maps Scraper that integrates with BeeHive Worker.
Outputs results as JSON for the Node.js worker to consume.

Usage:
    python scraper_service.py --search "restaurantes em São Paulo" --total 20 --output json
    python scraper_service.py --search "oficinas no Rio de Janeiro" --total 50 --categories "auto,oficina" --output json

Options:
    --search       Query to search on Google Maps (required)
    --total        Number of results to scrape (default: 20)
    --categories   Comma-separated category filter (optional)
    --output       Output format: 'json' (stdout) or 'csv' (file). Default: json
    --csv-file     Path to CSV file if output=csv (default: result.csv)
    --headless     Run browser in headless mode (default: true)
"""

import argparse
import json
import os
import platform
import sys
import time
import traceback
from dataclasses import dataclass, field, asdict
from typing import Optional

# Add parent paths so we can import the original scraper
SCRAPPER_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'Google-Maps-Scrapper-main')


@dataclass
class Place:
    name: str = ''
    address: str = ''
    website: str = ''
    phone_number: str = ''
    reviews_count: Optional[int] = None
    reviews_average: Optional[float] = None
    place_type: str = ''
    opens_at: str = ''
    introduction: str = ''
    category: str = ''


def extract_text(page, xpath: str) -> str:
    """Safely extract text from a page element by XPath."""
    try:
        el = page.locator(xpath).first
        return el.inner_text() if el else ''
    except Exception:
        return ''


def extract_place(page) -> Place:
    """Extract place details from the Google Maps detail panel."""
    p = Place()
    try:
        p.name = extract_text(page, '//div[@class="TIHn2 "]//h1[@class="DUwDvf lfPIob"]')
        p.address = extract_text(page, '//button[@data-item-id="address"]//div[contains(@class, "fontBodyMedium")]')
        p.website = extract_text(page, '//a[@data-item-id="authority"]//div[contains(@class, "fontBodyMedium")]')
        p.phone_number = extract_text(page, '//button[contains(@data-item-id, "phone:tel:")]//div[contains(@class, "fontBodyMedium")]')
        p.introduction = extract_text(page, '//div[@class="WeS02d fontBodyMedium"]//div[@class="PYvSYb "]')
        p.place_type = extract_text(page, '//div[@class="LBgpqf"]//button[@class="DkEaL "]')

        # Reviews average
        try:
            avg_el = page.locator('//div[@class="TIHn2 "]//div[@class="fontBodyMedium dmRWX"]//div//span[@aria-hidden]').first
            avg_text = avg_el.inner_text() if avg_el else ''
            if avg_text:
                p.reviews_average = float(avg_text.replace(',', '.'))
        except Exception:
            pass

        # Reviews count
        try:
            count_el = page.locator('//div[@class="TIHn2 "]//div[@class="fontBodyMedium dmRWX"]//div//span//span//span[@aria-label]').first
            count_text = count_el.get_attribute('aria-label') if count_el else ''
            if count_text:
                p.reviews_count = int(''.join(filter(str.isdigit, count_text)))
        except Exception:
            pass

        # Opens at
        p.opens_at = extract_text(page, '//button[contains(@data-item-id, "oh")]//div[contains(@class, "fontBodyMedium")]')
        if not p.opens_at:
            p.opens_at = extract_text(page, '//div[@class="MkV9"]//span[@class="ZDu9vd"]//span[2]')

    except Exception as e:
        print(f"[scraper] Warning extracting place: {e}", file=sys.stderr)

    return p


def scrape_places(search_for: str, total: int = 20, headless: bool = True):
    """
    Main scraping function.
    Returns a list of Place objects.
    """
    from playwright.sync_api import sync_playwright

    places = []
    browser = None

    try:
        with sync_playwright() as p:
            # Launch browser
            chrome_path = None
            if platform.system() == 'Windows':
                possible_paths = [
                    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
                    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
                    os.path.expanduser('~\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe'),
                ]
                for cp in possible_paths:
                    if os.path.exists(cp):
                        chrome_path = cp
                        break

            if chrome_path:
                browser = p.chromium.launch(
                    headless=headless,
                    executable_path=chrome_path,
                )
            else:
                browser = p.chromium.launch(headless=headless)

            page = browser.new_page()
            page.set_viewport_size({'width': 1920, 'height': 1080})

            # Navigate to Google Maps
            page.goto('https://www.google.com/maps/@-14.23,-51.92,4z', timeout=60000)
            page.wait_for_timeout(2000)

            # Search
            search_input = page.locator('//form[contains(@jsaction,\'searchboxFormSubmit\')]//input[@name=\'q\']')
            search_input.fill(search_for)
            page.keyboard.press('Enter')

            # Wait for results
            page.wait_for_selector('//a[contains(@href, "https://www.google.com/maps/place")]', timeout=15000)

            # Scroll to load more results
            found = -1
            max_scrolls = 50
            scroll_count = 0
            while found < total and scroll_count < max_scrolls:
                page.mouse.wheel(0, 10000)
                page.wait_for_timeout(1500)
                scroll_count += 1

                anchors = page.locator('//a[contains(@href, "https://www.google.com/maps/place")]')
                count = anchors.count()
                if count == found:
                    break  # No more results loading
                found = count
                print(f"[scraper] Found {found} results so far...", file=sys.stderr)

            # Collect results
            anchors = page.locator('//a[contains(@href, "https://www.google.com/maps/place")]')
            to_scrape = min(total, anchors.count())
            print(f"[scraper] Scraping {to_scrape} places...", file=sys.stderr)

            for i in range(to_scrape):
                try:
                    anchors.nth(i).click()
                    page.wait_for_selector('//div[@class="TIHn2 "]//h1[@class="DUwDvf lfPIob"]', timeout=10000)
                    page.wait_for_timeout(1500)

                    place = extract_place(page)
                    if place.name:
                        places.append(place)
                        print(f"[scraper] ✅ {i + 1}/{to_scrape}: {place.name}", file=sys.stderr)
                    else:
                        print(f"[scraper] ⚠️ {i + 1}/{to_scrape}: (empty name, skipped)", file=sys.stderr)

                except Exception as e:
                    print(f"[scraper] ❌ {i + 1}/{to_scrape}: Error: {e}", file=sys.stderr)
                    continue

    except Exception as e:
        print(f"[scraper] Fatal: {e}", file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
    finally:
        if browser:
            try:
                browser.close()
            except Exception:
                pass

    return places


def main():
    parser = argparse.ArgumentParser(description='BeeHive Leads Scraper Service')
    parser.add_argument('--search', '-s', type=str, required=True, help='Search query for Google Maps')
    parser.add_argument('--total', '-t', type=int, default=20, help='Number of results to scrape')
    parser.add_argument('--categories', '-c', type=str, default='', help='Comma-separated category filter')
    parser.add_argument('--output', '-o', type=str, default='json', choices=['json', 'csv'], help='Output format')
    parser.add_argument('--csv-file', type=str, default='result.csv', help='CSV output file path')
    parser.add_argument('--headless', action='store_true', default=True, help='Run headless')
    parser.add_argument('--visible', action='store_true', help='Run with visible browser (overrides headless)')

    args = parser.parse_args()
    headless = not args.visible if args.visible else args.headless

    # Run scraper
    places = scrape_places(args.search, args.total, headless=headless)

    # Filter by categories if specified
    if args.categories:
        cats = [c.strip().lower() for c in args.categories.split(',')]
        filtered = []
        for p in places:
            p_type_lower = p.place_type.lower() if p.place_type else ''
            p_name_lower = p.name.lower() if p.name else ''
            if any(c in p_type_lower or c in p_name_lower for c in cats):
                filtered.append(p)
        places = filtered
        print(f"[scraper] Filtered to {len(places)} by categories: {args.categories}", file=sys.stderr)

    # Output
    if args.output == 'json':
        result = []
        for p in places:
            d = asdict(p)
            # Clean up empty fields
            d = {k: v for k, v in d.items() if v != '' and v is not None}
            result.append(d)
        print(json.dumps(result, ensure_ascii=False, indent=2))
    else:
        import pandas as pd
        df = pd.DataFrame([asdict(p) for p in places])
        df.to_csv(args.csv_file, index=False)
        print(json.dumps({"ok": True, "file": args.csv_file, "count": len(places)}))


if __name__ == '__main__':
    main()
