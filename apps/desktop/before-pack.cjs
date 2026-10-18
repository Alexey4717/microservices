const fs = require('node:fs');
const path = require('node:path');

const packageJsonPath = path.join(__dirname, 'package.json');

let originalPackageJson = null;
let restored = false;

function restorePackageJson() {
  if (originalPackageJson == null || restored) {
    return;
  }

  fs.writeFileSync(packageJsonPath, originalPackageJson);
  restored = true;
}

function clearDependencies() {
  if (originalPackageJson != null) {
    return;
  }

  originalPackageJson = fs.readFileSync(packageJsonPath);
  process.once('exit', restorePackageJson);

  const pkg = JSON.parse(originalPackageJson.toString('utf8'));
  pkg.dependencies = {};
  fs.writeFileSync(packageJsonPath, `${JSON.stringify(pkg, null, 2)}\n`);
}

// electron-builder 26 при npmRebuild: false всё равно запускает `pnpm list`.
// В hoisted-монорепозитории это даёт EMFILE и копирует зависимости в архив,
// хотя Vite уже собрал их в out/. extraMetadata.dependencies: {} при deep merge
// не очищает ключи, поэтому на время упаковки dependencies в package.json пустые.
async function beforePack(context) {
  context.packager.info._nodeModulesHandledExternally = true;
  clearDependencies();
}

async function afterPack() {
  restorePackageJson();
}

module.exports = { beforePack, afterPack };
