/**
 * SRS 原型截图 — Playwright 执行器
 *
 * 用法：
 *   npm run srs:screenshots -- --version V1.0.1-P6
 *   npm run srs:screenshots -- --version V1.0.1-P6 --req REQ-V1.0.1-P6-010
 *   npm run srs:screenshots -- --version V1.0.1-P6 --no-dev   # dev 已手动启动时
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');

function parseArgs(argv) {
  const args = { version: '', req: '', noDev: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--version' && argv[i + 1]) args.version = argv[++i];
    else if (a === '--req' && argv[i + 1]) args.req = argv[++i];
    else if (a === '--no-dev') args.noDev = true;
  }
  return args;
}

function loadYamlFile(filePath) {
  return parseYaml(fs.readFileSync(filePath, 'utf8'));
}

function substituteFixtures(text, fixtures) {
  if (typeof text !== 'string') return text;
  return text.replace(/\{fixture\.(\w+)\}/g, (_, key) => {
    if (fixtures[key] === undefined) {
      throw new Error(`fixtures.json 缺少键: ${key}`);
    }
    return String(fixtures[key]);
  });
}

function httpOk(url) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      res.resume();
      resolve(res.statusCode >= 200 && res.statusCode < 400);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(3000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function waitForServer(baseURL, readyPath, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  const url = `${baseURL.replace(/\/$/, '')}${readyPath}`;
  while (Date.now() < deadline) {
    if (await httpOk(url)) return;
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`dev 服务在 ${timeoutMs}ms 内未就绪: ${url}`);
}

function startDevServer(devCommand, cwd) {
  const isWin = process.platform === 'win32';
  const child = spawn(isWin ? 'npm.cmd' : 'npm', ['run', 'dev'], {
    cwd,
    stdio: 'pipe',
    shell: isWin,
    env: { ...process.env, FORCE_COLOR: '0' },
  });
  child.stdout?.on('data', (d) => process.stderr.write(`[dev] ${d}`));
  child.stderr?.on('data', (d) => process.stderr.write(`[dev] ${d}`));
  return child;
}

async function runStep(page, step, fixtures, config) {
  const delay = config.stepDelayMs ?? 300;

  const maybeScroll = async (locator) => {
    if (step.scrollIntoView !== false) {
      await locator.scrollIntoViewIfNeeded().catch(() => {});
    }
  };

  if (step.goto) {
    const p = substituteFixtures(step.goto, fixtures);
    await page.goto(p.startsWith('http') ? p : `${config.baseURL}${p}`, {
      waitUntil: 'networkidle',
      timeout: config.navigationTimeoutMs ?? 30000,
    });
    return;
  }
  if (step.waitMs != null) {
    await page.waitForTimeout(Number(step.waitMs));
    return;
  }
  if (step.waitForSelector) {
    await page
      .locator(substituteFixtures(step.waitForSelector, fixtures))
      .first()
      .waitFor({ state: 'visible', timeout: config.actionTimeoutMs ?? 15000 });
    return;
  }
  if (step.clickText) {
    const loc = page.getByText(substituteFixtures(step.clickText, fixtures), { exact: false }).first();
    await maybeScroll(loc);
    await loc.click({
      timeout: config.actionTimeoutMs ?? 15000,
    });
    await page.waitForTimeout(delay);
    return;
  }
  if (step.clickButton) {
    const loc = page.getByRole('button', {
      name: substituteFixtures(step.clickButton, fixtures),
      exact: step.clickButtonExact ?? false,
    }).first();
    await maybeScroll(loc);
    await loc.click({ timeout: config.actionTimeoutMs ?? 15000 });
    await page.waitForTimeout(delay);
    return;
  }
  if (step.clickTab) {
    const loc = page.getByRole('tab', { name: substituteFixtures(step.clickTab, fixtures) }).first();
    await maybeScroll(loc);
    await loc.click({ timeout: config.actionTimeoutMs ?? 15000 });
    await page.waitForTimeout(delay);
    return;
  }
  if (step.clickSelector) {
    const loc = page.locator(substituteFixtures(step.clickSelector, fixtures)).first();
    await maybeScroll(loc);
    await loc.click({
      timeout: config.actionTimeoutMs ?? 15000,
      force: step.force === true,
    });
    await page.waitForTimeout(delay);
    return;
  }
  if (step.clickSelectorFirst) {
    const loc = page.locator(substituteFixtures(step.clickSelectorFirst, fixtures)).first();
    await maybeScroll(loc);
    await loc.click({
      timeout: config.actionTimeoutMs ?? 15000,
      force: step.force === true,
    });
    await page.waitForTimeout(delay);
    return;
  }
  if (step.doubleClickSelector) {
    const loc = page.locator(substituteFixtures(step.doubleClickSelector, fixtures)).first();
    await maybeScroll(loc);
    await loc.dblclick({
      timeout: config.actionTimeoutMs ?? 15000,
      force: step.force === true,
    });
    await page.waitForTimeout(delay);
    return;
  }
  if (step.clickAriaLabel) {
    const loc = page.getByLabel(substituteFixtures(step.clickAriaLabel, fixtures)).first();
    await maybeScroll(loc);
    await loc.click({
      timeout: config.actionTimeoutMs ?? 15000,
    });
    await page.waitForTimeout(delay);
    return;
  }
  if (step.hoverText) {
    const loc = page.getByText(substituteFixtures(step.hoverText, fixtures), { exact: false }).first();
    await maybeScroll(loc);
    await loc.hover();
    await page.waitForTimeout(step.waitMs ?? 500);
    return;
  }
  if (step.clickFirstCheckbox) {
    const loc = page.locator('.ant-table-tbody .ant-checkbox-input').first();
    await maybeScroll(loc);
    await loc.click({
      timeout: config.actionTimeoutMs ?? 15000,
    });
    await page.waitForTimeout(delay);
    return;
  }
  if (step.pressKey) {
    await page.keyboard.press(substituteFixtures(step.pressKey, fixtures));
    await page.waitForTimeout(delay);
    return;
  }
  if (step.clickRole) {
    const { role, name } = step.clickRole;
    await page.getByRole(role, { name: substituteFixtures(name, fixtures) }).first().click({
      timeout: config.actionTimeoutMs ?? 15000,
    });
    await page.waitForTimeout(delay);
    return;
  }
  throw new Error(`未知 step 类型: ${JSON.stringify(step)}`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.version) {
    console.error('缺少 --version，例如: --version V1.0.1-P6');
    process.exit(1);
  }

  const config = loadYamlFile(path.join(__dirname, 'config.yaml'));
  const fixtures = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures.json'), 'utf8'));
  const versionDir = path.join(REPO_ROOT, 'docs', 'prd', args.version);
  const scenariosPath = path.join(versionDir, 'srs-screenshot-scenarios.yaml');

  if (!fs.existsSync(scenariosPath)) {
    console.error(`未找到场景文件: ${scenariosPath}`);
    process.exit(1);
  }

  const scenarios = loadYamlFile(scenariosPath);
  const outputDir = path.join(versionDir, 'assets', 'srs-screenshots');
  fs.mkdirSync(outputDir, { recursive: true });

  let devProcess = null;
  const baseURL = config.baseURL ?? 'http://localhost:5173';

  try {
    const alreadyUp = await httpOk(`${baseURL}${config.devReadyPath ?? '/'}`);
    if (!alreadyUp && !args.noDev) {
      console.error('启动 dev 服务…');
      devProcess = startDevServer(config.devCommand ?? 'npm run dev', REPO_ROOT);
      await waitForServer(baseURL, config.devReadyPath ?? '/', config.devStartupTimeoutMs ?? 90000);
    } else if (!alreadyUp && args.noDev) {
      throw new Error(`--no-dev 但 ${baseURL} 不可达`);
    }

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: config.viewport ?? { width: 1920, height: 1080 },
    });
    const page = await context.newPage();

    const manifest = {
      version: args.version,
      capturedAt: new Date().toISOString(),
      baseURL,
      outputDir: path.relative(REPO_ROOT, outputDir).replace(/\\/g, '/'),
      items: [],
      errors: [],
    };

    const reqIds = Object.keys(scenarios).filter((k) => !k.startsWith('_'));
    const filtered = args.req ? reqIds.filter((id) => id === args.req) : reqIds;

    for (const reqId of filtered) {
      const scenario = scenarios[reqId];
      if (!scenario?.shots?.length) {
        if (scenario?.ui !== false) {
          manifest.errors.push({ reqId, message: '无 shots 配置' });
        }
        continue;
      }
      if (scenario.ui === false) continue;

      const maxShots = config.maxShotsPerReq ?? 2;
      const shots = scenario.shots.slice(0, maxShots);

      for (const shot of shots) {
        const relFile = shot.file;
        const absFile = path.join(outputDir, relFile);
        try {
          for (const step of shot.steps ?? []) {
            await runStep(page, step, fixtures, { ...config, baseURL });
          }
          await page.screenshot({
            path: absFile,
            fullPage: config.screenshotMode === 'fullPage',
          });
          manifest.items.push({
            reqId,
            shotId: shot.id ?? 'main',
            file: relFile,
            markdownPath: `assets/srs-screenshots/${relFile}`,
          });
          console.error(`✓ ${reqId} → ${relFile}`);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          manifest.errors.push({ reqId, shotId: shot.id, file: relFile, message });
          console.error(`✗ ${reqId} / ${relFile}: ${message}`);
        }
      }
    }

    await browser.close();

    const manifestPath = path.join(outputDir, 'manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
    console.error(`manifest → ${path.relative(REPO_ROOT, manifestPath)}`);

    if (manifest.errors.length > 0) {
      console.error(`完成，${manifest.errors.length} 个错误`);
      process.exit(1);
    }
    console.error(`完成，${manifest.items.length} 张截图`);
  } finally {
    if (devProcess) {
      devProcess.kill('SIGTERM');
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
