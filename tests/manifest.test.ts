import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Office Add-in Manifest and Config Verification', () => {
  const rootDir = path.resolve(__dirname, '..');

  it('manifest.xml must exist and have correct Word Host and Taskpane configuration', () => {
    const manifestPath = path.join(rootDir, 'manifest.xml');
    expect(fs.existsSync(manifestPath), 'manifest.xml should exist').toBe(true);

    const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
    expect(manifestContent).toContain('xsi:type="TaskpaneApp"');
    expect(manifestContent).toContain('<Host Name="Document"/>');
    expect(manifestContent).toContain('https://s47user.github.io/word-gemini-addin/index.html');
    expect(manifestContent).toContain('Gemini AI Word Assistant');
  });

  it('package.json must contain up-to-date scripts and dependencies', () => {
    const pkgPath = path.join(rootDir, 'package.json');
    expect(fs.existsSync(pkgPath), 'package.json should exist').toBe(true);

    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    expect(pkg.scripts.dev).toBeDefined();
    expect(pkg.scripts.build).toBeDefined();
    expect(pkg.scripts.test).toBeDefined();
  });
});
