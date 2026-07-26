import fs from 'fs';
import path from 'path';

const rootDir = process.cwd();
const outputFile = path.join(rootDir, 'PROJECT_MASTER_PROMPT.md');

// List of relative file paths or directories to include
const includePaths = [
  'package.json',
  'tsconfig.json',
  'next.config.ts',
  'postcss.config.mjs',
  'eslint.config.mjs',
  'README.md',
  'ADMIN_DOCUMENTATION.md',
  'AGENTS.md',
  '.github',
  'supabase',
  'src',
  'scripts/github_sync.js',
  'scripts/db-cli.ts'
];

// Helper to recursively get all files in a directory
function getFilesRecursively(dir: string): string[] {
  let results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getFilesRecursively(filePath));
    } else {
      results.push(filePath);
    }
  });
  return results;
}

// Collect all target files
let allFiles: string[] = [];
for (const p of includePaths) {
  const fullPath = path.join(rootDir, p);
  if (!fs.existsSync(fullPath)) continue;
  const stat = fs.statSync(fullPath);
  if (stat.isDirectory()) {
    allFiles = allFiles.concat(getFilesRecursively(fullPath));
  } else {
    allFiles.push(fullPath);
  }
}

// System prompt preamble for the target AI model
let markdownContent = `# SYSTEM PROMPT FOR 100% REPLICATION OF CSC-APP

> **Instructions for the AI Assistant / Code Generator Model**:
> You are an expert Full-Stack Software Engineer specializing in **Next.js 16 (App Router)**, **TypeScript**, **React 19**, **Supabase**, and **CSS Modules / Tailwind CSS**.
> 
> Your task is to reproduce the **entire application** called \`csc-app\` with **100% exact replica fidelity** based on the architecture, schemas, and source files provided in this single blueprint.
> 
> ### Instructions to Follow:
> 1. **Setup & Dependencies**: Initialize a Next.js App Router project using TypeScript. Use the exact dependencies listed in the \`package.json\` section below.
> 2. **Database & Supabase Setup**: Execute all SQL scripts provided under the \`SUPABASE DATABASE MIGRATIONS\` section in your Supabase project SQL Editor to create the required tables, RPC functions, and indexes.
> 3. **Environment Variables**: Create a \`.env.local\` file with placeholders for Supabase URL/Keys, AWS S3 buckets (for document storage), and Gemini AI API Key as detailed in the Environment Template section.
> 4. **File Creation**: Create every file at its exact relative path using the code provided in the markdown codeblocks below. Maintain all logic, CSS styles, API routes, and components without skipping any logic.

---

## 1. PROJECT FILE TREE SUMMARY
\`\`\`
csc-app/
├── package.json
├── tsconfig.json
├── next.config.ts
├── postcss.config.mjs
├── eslint.config.mjs
├── .env.example
├── supabase/
${fs.readdirSync(path.join(rootDir, 'supabase')).map(f => `│   ├── ${f}`).join('\n')}
└── src/
    ├── app/
    ├── lib/
    ├── components/
    └── test-ai-query.ts
\`\`\`

---

## 2. ENVIRONMENT VARIABLES TEMPLATE (\`.env.example\`)
\`\`\`env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-supabase-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# AWS S3 Document Storage
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_S3_BUCKET_NAME=your-s3-bucket-name

# AI Integration
GEMINI_API_KEY=your-gemini-api-key
\`\`\`

---

## 3. PROJECT SOURCE FILES

`;

// Append each file to markdown
for (const file of allFiles) {
  const relativePath = path.relative(rootDir, file);
  const ext = path.extname(file).replace('.', '') || 'txt';
  const fileContent = fs.readFileSync(file, 'utf8');

  // Skip large binary files or lockfiles if any slipped through
  if (relativePath.endsWith('package-lock.json')) continue;

  markdownContent += `### File: \`${relativePath}\`\n\n`;
  markdownContent += `\`\`\`${ext === 'tsx' || ext === 'ts' ? 'typescript' : ext === 'sql' ? 'sql' : ext === 'json' ? 'json' : ext === 'css' ? 'css' : 'text'}\n`;
  markdownContent += fileContent;
  markdownContent += `\n\`\`\`\n\n---\n\n`;
}

fs.writeFileSync(outputFile, markdownContent, 'utf8');
console.log(`Successfully generated ${outputFile}`);
