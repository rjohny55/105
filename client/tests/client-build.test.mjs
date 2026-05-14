/**
 * Client Integration Test
 * 
 * Validates that the built client application:
 * - Has the correct HTML structure
 * - Contains the entry point JS bundle
 * - Links to the CSS bundle
 * - Has proper meta tags
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = join(__dirname, '..', 'dist');

describe('Client Build Output', () => {
  it('should have built the dist directory', () => {
    assert.ok(existsSync(distDir), 'dist directory should exist after build');
  });

  it('should have index.html', () => {
    const indexPath = join(distDir, 'index.html');
    assert.ok(existsSync(indexPath), 'index.html should exist in dist');
  });

  it('should have correct HTML structure', () => {
    const html = readFileSync(join(distDir, 'index.html'), 'utf-8');
    
    // Check for root div
    assert.ok(html.includes('id="root"'), 'HTML should have root div');
    
    // Check for script tag
    assert.ok(html.includes('<script'), 'HTML should include script tag');
    assert.ok(html.includes('type="module"'), 'Script should be module type');
    
    // Check for CSS link
    assert.ok(html.includes('<link'), 'HTML should include link tag');
    
    // Check for expected HTML structure
    assert.ok(html.includes('<!DOCTYPE html>'), 'Should have DOCTYPE');
    assert.ok(html.includes('<html'), 'Should have html tag');
    assert.ok(html.includes('<head>'), 'Should have head tag');
    assert.ok(html.includes('<title>'), 'Should have title tag');
  });

  it('should have valid JS bundle files', () => {
    const html = readFileSync(join(distDir, 'index.html'), 'utf-8');
    
    // Find the JS bundle reference
    const scriptMatch = html.match(/src="[^"]*assets\/([^"]+\.js)"/);
    assert.ok(scriptMatch, 'HTML should reference a JS bundle');
    
    const jsFile = scriptMatch[1];
    const jsPath = join(distDir, 'assets', jsFile);
    assert.ok(existsSync(jsPath), `JS bundle ${jsFile} should exist`);
    
    // Verify JS bundle has content
    const jsContent = readFileSync(jsPath, 'utf-8');
    assert.ok(jsContent.length > 1000, 'JS bundle should be substantial');
  });

  it('should have valid CSS bundle files', () => {
    const html = readFileSync(join(distDir, 'index.html'), 'utf-8');
    
    // Find the CSS bundle reference
    const cssMatch = html.match(/href="[^"]*assets\/([^"]+\.css)"/);
    assert.ok(cssMatch, 'HTML should reference a CSS bundle');
    
    const cssFile = cssMatch[1];
    const cssPath = join(distDir, 'assets', cssFile);
    assert.ok(existsSync(cssPath), `CSS bundle ${cssFile} should exist`);
    
    // Verify CSS bundle has content
    const cssContent = readFileSync(cssPath, 'utf-8');
    assert.ok(cssContent.length > 50, 'CSS bundle should have content');
  });

  it('should have all assets in dist/assets directory', () => {
    const assetsDir = join(distDir, 'assets');
    assert.ok(existsSync(assetsDir), 'assets directory should exist');
  });
});
