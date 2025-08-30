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

export function createCommand(program) {
  program
    .command('create <project-name>')
    .description('Create a new Stardust Distro project')
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
        const templatePath = path.join(__dirname, '..', 'templates', options.template);
        await fs.copy(templatePath, projectPath);

        // Update package.json with project name
        const packageJsonPath = path.join(projectPath, 'package.json');
        const packageJson = await fs.readJson(packageJsonPath);
        packageJson.name = projectName;
        await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 });

        // Create environment file
        const envContent = `
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=${projectName}.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=${projectName}
VITE_FIREBASE_STORAGE_BUCKET=${projectName}.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id_here
VITE_FIREBASE_APP_ID=your_app_id_here
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id_here

# DDEX Workbench Integration
VITE_WORKBENCH_API_KEY=your_workbench_api_key_here
VITE_WORKBENCH_API_URL=https://api.ddex-workbench.org/v1

# Edition
VITE_EDITION=${options.edition}

# Organization
VITE_ORGANIZATION_NAME="${answers.organizationName}"

# Region
VITE_FIREBASE_REGION=${answers.region}
`.trim();

        await fs.writeFile(path.join(projectPath, '.env'), envContent);
        await fs.writeFile(path.join(projectPath, '.env.example'), envContent);

        // Create Firebase configuration
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

        spinner.succeed('Project structure created');

        // Initialize git
        if (!options.skipGit) {
          spinner.start('Initializing git repository...');
          execSync('git init', { cwd: projectPath, stdio: 'ignore' });
          execSync('git add .', { cwd: projectPath, stdio: 'ignore' });
          execSync('git commit -m "Initial commit from Stardust Distro CLI"', { cwd: projectPath, stdio: 'ignore' });
          spinner.succeed('Git repository initialized');
        }

        // Install dependencies
        if (!options.skipInstall) {
          spinner.start('Installing dependencies...');
          execSync('npm install', { cwd: projectPath, stdio: 'ignore' });
          spinner.succeed('Dependencies installed');
        }

        // Success message
        console.log('\n' + chalk.green('✨ Project created successfully!'));
        console.log('\nNext steps:');
        console.log(chalk.cyan(`  cd ${projectName}`));
        if (options.skipInstall) {
          console.log(chalk.cyan('  npm install'));
        }
        console.log(chalk.cyan('  stardust-distro init      # Initialize Firebase'));
        console.log(chalk.cyan('  npm run dev           # Start development server'));
        console.log(chalk.cyan('  stardust-distro deploy    # Deploy to Firebase'));
        
        if (options.edition === 'enterprise') {
          console.log('\n' + chalk.yellow('📦 Enterprise Edition'));
          console.log('Install enterprise plugins with:');
          console.log(chalk.cyan('  stardust-distro plugin install <plugin-name>'));
        }

      } catch (error) {
        spinner.fail('Project creation failed');
        console.error(chalk.red(error.message));
        process.exit(1);
      }
    });
}