// cli/commands/deploy.js
import chalk from 'chalk';
import ora from 'ora';
import { execSync } from 'child_process';
import fs from 'fs-extra';

export function deployCommand(program) {
  program
    .command('deploy')
    .description('Deploy your Stardust Distro platform to Firebase')
    .option('--only <targets>', 'Deploy only specific targets (hosting,functions,firestore)')
    .option('--project <projectId>', 'Firebase project to deploy to')
    .action(async (options) => {
      const spinner = ora();
      
      try {
        // Check if in project directory
        if (!fs.existsSync('firebase.json')) {
          console.error(chalk.red('❌ Not in a Stardust Distro project directory'));
          process.exit(1);
        }

        console.log(chalk.cyan('🚀 Deploying Stardust Distro to Firebase\n'));

        // Build the Vue app
        if (!options.only || options.only.includes('hosting')) {
          spinner.start('Building Vue application...');
          execSync('npm run build', { stdio: 'ignore' });
          spinner.succeed('Vue application built');
        }

        // Deploy to Firebase
        spinner.start('Deploying to Firebase...');
        let deployCommand = 'firebase deploy';
        
        if (options.only) {
          deployCommand += ` --only ${options.only}`;
        }
        
        if (options.project) {
          deployCommand += ` --project ${options.project}`;
        }

        const output = execSync(deployCommand, { encoding: 'utf-8' });
        spinner.succeed('Deployment complete');

        // Extract hosting URL from output
        const hostingUrlMatch = output.match(/Hosting URL: (https:\/\/[^\s]+)/);
        if (hostingUrlMatch) {
          console.log('\n' + chalk.green('✅ Deployment successful!'));
          console.log('\nYour Stardust Distro platform is live at:');
          console.log(chalk.cyan.bold(hostingUrlMatch[1]));
        }

        console.log('\n' + chalk.yellow('📝 Post-deployment checklist:'));
        console.log('  1. Configure delivery targets: ' + chalk.cyan('stardust-distro target add'));
        console.log('  2. Create admin user in Firebase Console');
        console.log('  3. Set up DDEX Workbench API key');
        console.log('  4. Configure custom domain (optional)');

      } catch (error) {
        spinner.fail('Deployment failed');
        console.error(chalk.red(error.message));
        process.exit(1);
      }
    });
}