const { TsJestTransformer } = require('ts-jest');

class ImportMetaTransformer extends TsJestTransformer {
  process(sourceText, sourcePath, transformOptions) {
    let patched = sourceText;
    // Remove ESM __dirname polyfill (CJS already provides __dirname)
    patched = patched.replace(
      /const __dirname\s*=\s*path\.dirname\(fileURLToPath\(import\.meta\.url\)\);?/g,
      '/* __dirname provided by CJS */',
    );
    // Replace any remaining import.meta.url references
    patched = patched.replace(/import\.meta\.url/g, "'file:///' + __filename");
    return super.process(patched, sourcePath, transformOptions);
  }
}

module.exports = new ImportMetaTransformer({ tsconfig: 'tsconfig.json' });
