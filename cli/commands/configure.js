// cli/commands/configure.js
import inquirer from 'inquirer';
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';

export function configureCommand(program) {
  program
    .command('configure')
    .description('Configure your Stardust Distro platform settings')
    .action(async () => {
      try {
        if (!fs.existsSync('firebase.json')) {
          console.error(chalk.red('❌ Not in a Stardust Distro project directory'));
          process.exit(1);
        }

        console.log(chalk.cyan('⚙️  Configuring Stardust Distro\n'));

        const config = await inquirer.prompt([
          {
            type: 'input',
            name: 'organizationName',
            message: 'Organization/Label name:',
            default: 'My Label'
          },
          {
            type: 'input',
            name: 'workbenchApiKey',
            message: 'DDEX Workbench API key (optional):',
            default: ''
          },
          {
            type: 'list',
            name: 'defaultERNVersion',
            message: 'Default ERN version:',
            choices: ['4.3', '4.2', '3.8.2'],
            default: '4.3'
          },
          {
            type: 'checkbox',
            name: 'enabledProtocols',
            message: 'Enable delivery protocols:',
            choices: [
              { name: 'FTP', value: 'ftp', checked: true },
              { name: 'SFTP', value: 'sftp', checked: true },
              { name: 'S3', value: 's3', checked: true },
              { name: 'Azure Blob Storage', value: 'azure', checked: true },
              { name: 'API', value: 'api', checked: true }
            ]
          },
          {
            type: 'confirm',
            name: 'enableAnalytics',
            message: 'Enable analytics tracking?',
            default: true
          }
        ]);

        // Update configuration file
        const configPath = path.join(process.cwd(), 'stardust-distro.config.json');
        await fs.writeJson(configPath, config, { spaces: 2 });

        // Update .env file with Workbench API key if provided
        if (config.workbenchApiKey) {
          const envPath = '.env';
          let envContent = fs.readFileSync(envPath, 'utf-8');
          const regex = /^VITE_WORKBENCH_API_KEY=.*$/m;
          if (regex.test(envContent)) {
            envContent = envContent.replace(regex, `VITE_WORKBENCH_API_KEY=${config.workbenchApiKey}`);
          } else {
            envContent += `\nVITE_WORKBENCH_API_KEY=${config.workbenchApiKey}`;
          }
          fs.writeFileSync(envPath, envContent.trim());
        }

        console.log(chalk.green('\n✅ Configuration saved!'));
        console.log('Configuration file: ' + chalk.cyan('stardust-distro.config.json'));

      } catch (error) {
        console.error(chalk.red('Configuration failed:', error.message));
        process.exit(1);
      }
    });
}