import path from "node:path";
import { execSync } from "node:child_process";
import { vitePlugin as remix } from "@remix-run/dev";
import { defineConfig, type PluginOption } from "vite";
import { envOnlyMacros } from 'vite-env-only';
import { Project, SyntaxKind } from 'ts-morph';
import type * as TSM from 'ts-morph';
declare module "@remix-run/node" {
  interface Future {
    v3_singleFetch: true;
  }
}

export default defineConfig({
  plugins: [
    envOnlyMacros(),
    procedure(),
    remix({
      future: {
        v3_fetcherPersist: true,
        v3_relativeSplatPath: true,
        v3_throwAbortReason: true,
        v3_singleFetch: true,
        v3_lazyRouteDiscovery: true,
      },
    }),
  ],
});

const PROCEDURE_FN_NAME = "procedure$";
const procedureFiles = new Set<string>();
const procedures = new Map<string, string>();

function procedure(): PluginOption {
  function hasProcedureImport(sourceImports: TSM.ImportDeclaration[]) {
    return sourceImports.some(i => i.getNamedImports().some(ni => PROCEDURE_FN_NAME.includes(ni.getName())));
  }

  const rpcProject = new Project();
  const rpcSourceFile = rpcProject.addSourceFileAtPath(path.resolve(__dirname, "app/routes/rpc.$key.ts"));

  function updateHandlerSwitch() {
    const getProcedureDeclaration = rpcSourceFile.getFunctionOrThrow("getProcedure");
    const getProcedureBody = getProcedureDeclaration.getBody();
    if(!getProcedureBody) throw new Error("getProcedure function body not found");
    // Create the switch statement cases
    const cases = Array.from(procedures.entries()).map(([key]) => `
      case 'rpc.${key}': 
        return ${key};`
    ).join('\n');

    // Update the function body with new switch statement
    const newBody = `{
      switch (_key) {
        ${cases}
        default:
          throw new Error(\`Procedure handler for \${_key} not found\`);
      }
    }`;

    getProcedureBody.replaceWithText(newBody);

    // Add imports for the procedures
    const existingImports = rpcSourceFile.getImportDeclarations();
    for (const [procName, relativePath] of procedures.entries()) {
      // Check if import already exists
      const importPath = relativePath.replace(".tsx", "").replace(".ts", "");
      const hasImport = existingImports.some(imp => 
        imp.getModuleSpecifierValue() === importPath &&
        imp.getNamedImports().some(ni => ni.getName() === procName)
      );

      if (!hasImport) {
        rpcSourceFile.addImportDeclaration({
          namedImports: [procName],
          moduleSpecifier: importPath
        });
      }
    }

    // Save the changes
    rpcSourceFile.saveSync();
    // TODO: run biome format
  }

  return {
    name: "vite-plugin-procedure",
    async transform(code, id) {
      if(id.endsWith("utils/macros.ts")) return;
      if(!code.includes("procedure$") && !id.includes("handler")) return;
      if(procedureFiles.has(id)) return;
      procedureFiles.add(id);

      const project = new Project();
      const sourceFile = project.addSourceFileAtPath(id);
      const sourceImports = sourceFile.getImportDeclarations();
      if(!hasProcedureImport(sourceImports)) return;

      // Find procedure declarations
      const procedureDeclarations = sourceFile.getVariableDeclarations();
      for (const declaration of procedureDeclarations) {
        const initializer = declaration.getInitializer();
        console.info(`Checking initializer ${initializer?.getText()}`, initializer?.getKind(), declaration.getName());
        if (initializer?.getKind() === 213) {
            const procName = declaration.getName();
            const relativePath = path.relative(
              path.dirname(rpcSourceFile.getFilePath()),
              id
            ).replace(/\\/g, '/');
            
            console.info(`Found procedure declaration ${procName} with relative path ${relativePath}`);
            procedures.set(procName, relativePath);
        }
      }

      updateHandlerSwitch();
    }
  }
}