// cli/commands/init.js
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { execSync } from 'child_process';
import fs from 'fs-extra';

export function initCommand(program) {
  program
    .command('init')
    .description('Initialize Firebase for your Stardust Distro project')
    .option('--project <projectId>', 'Firebase project ID')
    .action(async (options) => {
      const spinner = ora();
      
      try {
        // Check if firebase.json exists
        if (!fs.existsSync('firebase.json')) {
          console.error(chalk.red('❌ Not in a Stardust Distro project directory'));
          process.exit(1);
        }

        console.log(chalk.cyan('🔥 Initializing Firebase for Stardust Distro\n'));

        // Check if Firebase CLI is installed
        try {
          execSync('firebase --version', { stdio: 'ignore' });
        } catch {
          console.error(chalk.red('❌ Firebase CLI not found'));
          console.log('Install it with: ' + chalk.cyan('npm install -g firebase-tools'));
          process.exit(1);
        }

        // Firebase login
        console.log(chalk.yellow('📝 Please login to Firebase:'));
        execSync('firebase login', { stdio: 'inherit' });

        // Select or create project
        if (options.project) {
          execSync(`firebase use ${options.project}`, { stdio: 'inherit' });
        } else {
          const projectChoice = await inquirer.prompt([
            {
              type: 'list',
              name: 'action',
              message: 'Select Firebase project:',
              choices: [
                { name: 'Use existing project', value: 'existing' },
                { name: 'Create new project', value: 'new' }
              ]
            }
          ]);

          if (projectChoice.action === 'new') {
            const newProject = await inquirer.prompt([
              {
                type: 'input',
                name: 'id',
                message: 'Project ID (must be unique):',
                validate: (input) => /^[a-z0-9-]+$/.test(input) || 'Invalid project ID format'
              },
              {
                type: 'input',
                name: 'name',
                message: 'Project name:',
                default: 'Stardust Distro'
              }
            ]);

            spinner.start('Creating Firebase project...');
            execSync(`firebase projects:create ${newProject.id} --display-name "${newProject.name}"`, { stdio: 'ignore' });
            execSync(`firebase use ${newProject.id}`, { stdio: 'ignore' });
            spinner.succeed('Firebase project created');
          } else {
            execSync('firebase use --add', { stdio: 'inherit' });
          }
        }

        // Get project configuration
        spinner.start('Fetching Firebase configuration...');
        const projectInfo = execSync('firebase apps:list web --json', { encoding: 'utf-8' });
        const appsData = JSON.parse(projectInfo);
        const apps = appsData.result || appsData || []; // Handle different response formats

        if (!Array.isArray(apps) || apps.length === 0) {
          // Create new app
        } else {
          // Use existing app
          const appId = apps[0].appId || apps[0].name; // Handle different property names
        }
        spinner.succeed('Firebase configuration fetched');

        // Update .env file
        spinner.start('Updating environment configuration...');
        const envPath = '.env';
        let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : '';
        
        const updateEnvVar = (key, value) => {
          const regex = new RegExp(`^${key}=.*$`, 'm');
          if (regex.test(envContent)) {
            envContent = envContent.replace(regex, `${key}=${value}`);
          } else {
            envContent += `\n${key}=${value}`;
          }
        };

        updateEnvVar('VITE_FIREBASE_API_KEY', appConfig.apiKey);
        updateEnvVar('VITE_FIREBASE_AUTH_DOMAIN', appConfig.authDomain);
        updateEnvVar('VITE_FIREBASE_PROJECT_ID', appConfig.projectId);
        updateEnvVar('VITE_FIREBASE_STORAGE_BUCKET', appConfig.storageBucket);
        updateEnvVar('VITE_FIREBASE_MESSAGING_SENDER_ID', appConfig.messagingSenderId);
        updateEnvVar('VITE_FIREBASE_APP_ID', appConfig.appId);
        updateEnvVar('VITE_FIREBASE_MEASUREMENT_ID', appConfig.measurementId || '');

        fs.writeFileSync(envPath, envContent.trim());
        spinner.succeed('Environment configuration updated');

        // Initialize Firestore
        spinner.start('Setting up Firestore...');
        execSync('firebase firestore:databases:create default --location=nam5', { stdio: 'ignore' });
        spinner.succeed('Firestore database created');

        // Initialize Storage
        spinner.start('Setting up Cloud Storage...');
        execSync('firebase storage:buckets:create default', { stdio: 'ignore' });
        spinner.succeed('Cloud Storage configured');

        console.log('\n' + chalk.green('✅ Firebase initialization complete!'));
        console.log('\nYour project is ready. Next steps:');
        console.log(chalk.cyan('  npm run dev           # Start local development'));
        console.log(chalk.cyan('  stardust-distro deploy    # Deploy to Firebase'));
        console.log(chalk.cyan('  stardust-distro target add # Add delivery targets'));

      } catch (error) {
        spinner.fail('Initialization failed');
        console.error(chalk.red(error.message));
        process.exit(1);
      }
    });
}