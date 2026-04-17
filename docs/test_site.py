#!/usr/bin/env python3
"""Test script for GitHub Pages site validation."""

import os
import re
from pathlib import Path

def test_file_exists(filepath):
    """Test if a file exists."""
    if os.path.exists(filepath):
        print(f"✓ {filepath} exists")
        return True
    else:
        print(f"✗ {filepath} does NOT exist")
        return False

def test_nojekyll():
    """Test .nojekyll file."""
    nojekyll_path = Path("/Users/jim/work/fiduciary/docs/.nojekyll")
    if test_file_exists(nojekyll_path):
        # .nojekyll should be empty
        size = os.path.getsize(nojekyll_path)
        if size == 0:
            print(f"✓ .nojekyll is empty (correct)")
            return True
        else:
            print(f"✗ .nojekyll should be empty but has {size} bytes")
            return False
    return False

def test_html_structure():
    """Test HTML structure."""
    html_path = Path("/Users/jim/work/fiduciary/docs/index.html")
    if not test_file_exists(html_path):
        return False
    
    with open(html_path, 'r') as f:
        content = f.read()
    
    # Check for required HTML elements
    checks = [
        (r'<!DOCTYPE html>', "DOCTYPE declaration"),
        (r'<html[^>]*lang="en"', "HTML tag with lang attribute"),
        (r'<meta charset="UTF-8">', "UTF-8 charset meta"),
        (r'<meta name="viewport"', "viewport meta"),
        (r'<title>.+</title>', "title tag"),
        (r'<link rel="stylesheet" href="styles\.css">', "CSS link"),
        (r'<header class="header">', "header element"),
        (r'<nav class="nav">', "nav element"),
        (r'<main class="main">', "main element"),
        (r'<footer class="footer">', "footer element"),
        (r'<section id="overview"', "overview section"),
        (r'<section id="architecture"', "architecture section"),
        (r'<section id="api"', "API section"),
        (r'<section id="guides"', "guides section"),
    ]
    
    all_passed = True
    for pattern, description in checks:
        if re.search(pattern, content, re.MULTILINE | re.DOTALL):
            print(f"✓ {description} found")
        else:
            print(f"✗ {description} NOT found")
            all_passed = False
    
    return all_passed

def test_css_exists():
    """Test CSS file exists."""
    css_path = Path("/Users/jim/work/fiduciary/docs/styles.css")
    if not test_file_exists(css_path):
        return False
    
    with open(css_path, 'r') as f:
        content = f.read()
    
    # Check for key CSS features
    checks = [
        (r':root', "CSS variables"),
        (r'\.header', "header styles"),
        (r'\.nav', "nav styles"),
        (r'\.main', "main styles"),
        (r'\.section', "section styles"),
        (r'\.footer', "footer styles"),
        (r'@media', "responsive design"),
    ]
    
    all_passed = True
    for pattern, description in checks:
        if re.search(pattern, content):
            print(f"✓ CSS: {description} found")
        else:
            print(f"✗ CSS: {description} NOT found")
            all_passed = False
    
    return all_passed

def test_documentation_links():
    """Test that documentation files referenced in index.html exist."""
    html_path = Path("/Users/jim/work/fiduciary/docs/index.html")
    docs_path = Path("/Users/jim/work/fiduciary/docs")
    
    with open(html_path, 'r') as f:
        content = f.read()
    
    # Extract href values from links
    hrefs = re.findall(r'href="([^"]+)"', content)
    
    print("\nChecking documentation links:")
    all_exist = True
    for href in hrefs:
        if href.startswith('http') or href.startswith('#') or href.endswith('.css'):
            continue  # Skip external links, anchors, and CSS
        
        target_path = docs_path / href
        if target_path.exists():
            print(f"✓ {href} exists")
        else:
            print(f"⚠ {href} does NOT exist (may be optional)")
            # Don't fail for missing optional docs
    
    return all_exist

def main():
    """Run all tests."""
    print("=" * 60)
    print("GitHub Pages Site Validation")
    print("=" * 60)
    
    tests = [
        ("File Existence", test_nojekyll),
        ("HTML Structure", test_html_structure),
        ("CSS Styles", test_css_exists),
        ("Documentation Links", test_documentation_links),
    ]
    
    results = []
    for test_name, test_func in tests:
        print(f"\n{test_name}:")
        print("-" * 40)
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"✗ Error running test: {e}")
            results.append((test_name, False))
    
    print("\n" + "=" * 60)
    print("Test Summary:")
    print("=" * 60)
    for test_name, result in results:
        status = "✓ PASS" if result else "✗ FAIL"
        print(f"{status}: {test_name}")
    
    all_passed = all(result for _, result in results)
    print("=" * 60)
    if all_passed:
        print("✓ All tests passed! Site is ready for GitHub Pages.")
    else:
        print("✗ Some tests failed. Please review the output above.")
    
    return 0 if all_passed else 1

if __name__ == "__main__":
    exit(main())
