import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

async function main() {
  console.log();
  console.log('  Browser Plugin Setup');
  console.log('  ====================');
  console.log();

  console.log('  1. Installing Chromium...');
  execSync('npx playwright install chromium', { stdio: 'inherit', cwd: process.cwd() });
  console.log('     Chromium installed');

  console.log();
  console.log('  Setup complete! Run pnpm health to verify.');
  console.log();
}

main().catch(console.error);
