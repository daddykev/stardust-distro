// cli/commands/create.js
import path from 'path';
import fs from 'fs-extra';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function processTemplate(projectPath, projectName, organizationName) {
  // Delete package-lock.json files to be regenerated
  const lockFiles = [
    path.join(projectPath, 'package-lock.json'),
    path.join(projectPath, 'functions', 'package-lock.json')
  ];
  
  lockFiles.forEach(file => {
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
    }
  });
  
  // Update main package.json
  const mainPackagePath = path.join(projectPath, 'package.json');
  if (fs.existsSync(mainPackagePath)) {
    const pkg = JSON.parse(fs.readFileSync(mainPackagePath, 'utf-8'));
    pkg.name = projectName;
    // Update docker scripts with project name
    if (pkg.scripts) {
      if (pkg.scripts['docker:build']) {
        pkg.scripts['docker:build'] = `docker build -f docker/Dockerfile -t ${projectName} .`;
      }
      if (pkg.scripts['docker:run']) {
        pkg.scripts['docker:run'] = `docker run -p 8080:8080 ${projectName}`;
      }
    }
    fs.writeFileSync(mainPackagePath, JSON.stringify(pkg, null, 2));
  }
  
  // Update functions package.json
  const functionsPackagePath = path.join(projectPath, 'functions', 'package.json');
  if (fs.existsSync(functionsPackagePath)) {
    const pkg = JSON.parse(fs.readFileSync(functionsPackagePath, 'utf-8'));
    pkg.name = `${projectName}-functions`;
    fs.writeFileSync(functionsPackagePath, JSON.stringify(pkg, null, 2));
  }
  
  // Update index.html title
  const indexHtmlPath = path.join(projectPath, 'index.html');
  if (fs.existsSync(indexHtmlPath)) {
    let html = fs.readFileSync(indexHtmlPath, 'utf-8');
    html = html.replace(
      /<title>.*?<\/title>/,
      `<title>${organizationName || projectName}</title>`
    );
    fs.writeFileSync(indexHtmlPath, html);
  }
}

export function createCommand(program) {
  program
    .command('create <project-name>')
    .description('Create a new music distribution project')
    .option('-t, --template <template>', 'Project template (default, minimal, enterprise)', 'default')
    .option('-e, --edition <edition>', 'Edition (community, enterprise)', 'community')
    .option('--skip-install', 'Skip npm install')
    .option('--skip-git', 'Skip git initialization')
    .action(async (projectName, options) => {
      const spinner = ora();
      
      try {
        // Check if directory exists
        const projectPath = path.resolve(process.cwd(), projectName);
        if (fs.existsSync(projectPath)) {
          console.error(chalk.red(`❌ Directory ${projectName} already exists`));
          process.exit(1);
        }

        // Prompt for additional configuration
        const answers = await inquirer.prompt([
          {
            type: 'input',
            name: 'organizationName',
            message: 'Organization/Label name:',
            default: projectName
          },
          {
            type: 'input',
            name: 'distributorId',
            message: 'Distributor ID (for DDEX messages):',
            default: projectName.toLowerCase().replace(/[^a-z0-9]/g, '-')
          },
          {
            type: 'list',
            name: 'region',
            message: 'Default Firebase region:',
            choices: [
              { name: 'US Central (Iowa)', value: 'us-central1' },
              { name: 'US East (South Carolina)', value: 'us-east1' },
              { name: 'Europe West (Belgium)', value: 'europe-west1' },
              { name: 'Asia Northeast (Tokyo)', value: 'asia-northeast1' }
            ],
            default: 'us-central1'
          }
        ]);

        // Create project directory
        spinner.start('Creating project structure...');
        fs.ensureDirSync(projectPath);
        
        // Copy template files
        const templatePath = path.join(__dirname, '..', '..', 'template');
        
        // Check if template exists
        if (!fs.existsSync(templatePath)) {
          throw new Error(`Template not found at ${templatePath}`);
        }
        
        await fs.copy(templatePath, projectPath, {
          filter: (src) => {
            // Skip files we don't want to copy
            const basename = path.basename(src);
            if (basename === '.env' || basename === 'node_modules' || basename === 'dist') {
              return false;
            }
            return true;
          }
        });

        // Process template files (update package.json, etc.)
        processTemplate(projectPath, projectName, answers.organizationName);

        spinner.succeed('Project structure created');

        // Create environment file from template
        const envExamplePath = path.join(projectPath, '.env.example');
        const envPath = path.join(projectPath, '.env');
        
        // Create .env content with actual values
        const envContent = `
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=${projectName}.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=${projectName}
VITE_FIREBASE_STORAGE_BUCKET=${projectName}.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id_here
VITE_FIREBASE_APP_ID=your_app_id_here
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id_here

# Organization Configuration
VITE_ORGANIZATION_NAME="${answers.organizationName}"
VITE_DISTRIBUTOR_ID=${answers.distributorId}

# Firebase Functions URL
VITE_FUNCTIONS_URL=https://${answers.region}-${projectName}.cloudfunctions.net

# DDEX Workbench Integration (optional)
VITE_WORKBENCH_API_KEY=your_workbench_api_key_here
VITE_WORKBENCH_API_URL=https://api.ddex-workbench.org/v1

# Edition
VITE_EDITION=${options.edition}

# Region
VITE_FIREBASE_REGION=${answers.region}
`.trim();

        // Write .env and .env.example
        await fs.writeFile(envPath, envContent);
        
        // Create a generic .env.example if it doesn't exist
        if (!fs.existsSync(envExamplePath)) {
          const exampleContent = envContent
            .replace(projectName, 'your_project_id')
            .replace(answers.organizationName, 'Your Organization Name')
            .replace(answers.distributorId, 'your_distributor_id');
          await fs.writeFile(envExamplePath, exampleContent);
        }

        // Create/Update Firebase configuration
        const firebaseConfig = {
          hosting: {
            public: 'dist',
            ignore: ['firebase.json', '**/.*', '**/node_modules/**'],
            rewrites: [{
              source: '**',
              destination: '/index.html'
            }]
          },
          functions: [{
            source: 'functions',
            codebase: 'default',
            ignore: ['node_modules', '.git', 'firebase-debug.log', 'firebase-debug.*.log', '*.local']
          }],
          firestore: {
            rules: 'firestore.rules',
            indexes: 'firestore.indexes.json'
          },
          storage: {
            rules: 'storage.rules'
          }
        };

        await fs.writeJson(path.join(projectPath, 'firebase.json'), firebaseConfig, { spaces: 2 });

        // Initialize git
        if (!options.skipGit) {
          spinner.start('Initializing git repository...');
          execSync('git init', { cwd: projectPath, stdio: 'ignore' });
          
          // Create .gitignore if it doesn't exist
          const gitignorePath = path.join(projectPath, '.gitignore');
          if (!fs.existsSync(gitignorePath)) {
            const gitignoreContent = `
# Dependencies
node_modules/
functions/node_modules/

# Environment files
.env
.env.local
.env.*.local

# Build output
dist/
build/

# Firebase
.firebase/
firebase-debug.log
firebase-debug.*.log
firestore-debug.log
ui-debug.log

# Logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# IDE
.idea/
.vscode/
*.swp
*.swo
.DS_Store

# Testing
coverage/
`.trim();
            await fs.writeFile(gitignorePath, gitignoreContent);
          }
          
          execSync('git add .', { cwd: projectPath, stdio: 'ignore' });
          execSync('git commit -m "Initial commit from music distro CLI"', { cwd: projectPath, stdio: 'ignore' });
          spinner.succeed('Git repository initialized');
        }

        // Install dependencies
        if (!options.skipInstall) {
          spinner.start('Installing dependencies...');
          execSync('npm install', { cwd: projectPath, stdio: 'inherit' });
          
          // Install functions dependencies
          const functionsPath = path.join(projectPath, 'functions');
          if (fs.existsSync(functionsPath)) {
            spinner.start('Installing Cloud Functions dependencies...');
            execSync('npm install', { cwd: functionsPath, stdio: 'inherit' });
            spinner.succeed('Functions dependencies installed');
          }
          
          spinner.succeed('All dependencies installed');
        }

        // Success message
        console.log('\n' + chalk.green('✨ Project created successfully!'));
        console.log('\nNext steps:');
        console.log(chalk.cyan(`  cd ${projectName}`));
        if (options.skipInstall) {
          console.log(chalk.cyan('  npm install'));
          console.log(chalk.cyan('  cd functions && npm install && cd ..'));
        }
        console.log(chalk.cyan('  # Update .env with your Firebase config'));
        console.log(chalk.cyan('  firebase login'));
        console.log(chalk.cyan('  firebase use --add'));
        console.log(chalk.cyan('  npm run build'));
        console.log(chalk.cyan('  firebase deploy'));
        console.log('\nLocal development:');
        console.log(chalk.cyan('  npm run dev'));
        
        if (options.edition === 'enterprise') {
          console.log('\n' + chalk.yellow('📦 Enterprise Edition'));
          console.log('Additional enterprise features available.');
        }

        console.log('\n' + chalk.yellow('⚠️  Important: Firebase Blaze plan (pay-as-you-go) required for Cloud Functions and Storage.'));
        console.log(chalk.gray('The free tier is generous for small to medium operations.'));

      } catch (error) {
        spinner.fail('Project creation failed');
        console.error(chalk.red(error.message));
        if (error.stack) {
          console.error(chalk.gray(error.stack));
        }
        process.exit(1);
      }
    });
}