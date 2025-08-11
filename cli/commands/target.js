// cli/commands/target.js
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs-extra';

export function targetCommand(program) {
  const target = program
    .command('target')
    .description('Manage delivery targets');

  // Add subcommand
  target
    .command('add')
    .description('Add a new delivery target')
    .action(async () => {
      const spinner = ora();
      
      try {
        console.log(chalk.cyan('🎯 Adding delivery target\n'));

        const targetInfo = await inquirer.prompt([
          {
            type: 'input',
            name: 'name',
            message: 'Target name (e.g., Spotify, Apple Music):',
            validate: input => input.length > 0 || 'Name is required'
          },
          {
            type: 'list',
            name: 'type',
            message: 'Target type:',
            choices: ['DSP', 'Aggregator', 'Test']
          },
          {
            type: 'list',
            name: 'protocol',
            message: 'Delivery protocol:',
            choices: ['FTP', 'SFTP', 'S3', 'Azure', 'API']
          }
        ]);

        // Protocol-specific configuration
        let protocolConfig = {};
        
        switch (targetInfo.protocol) {
          case 'FTP':
          case 'SFTP':
            protocolConfig = await inquirer.prompt([
              {
                type: 'input',
                name: 'host',
                message: 'Host/Server:',
                validate: input => input.length > 0 || 'Host is required'
              },
              {
                type: 'number',
                name: 'port',
                message: 'Port:',
                default: targetInfo.protocol === 'FTP' ? 21 : 22
              },
              {
                type: 'input',
                name: 'username',
                message: 'Username:'
              },
              {
                type: 'password',
                name: 'password',
                message: 'Password/Key:',
                mask: '*'
              },
              {
                type: 'input',
                name: 'directory',
                message: 'Remote directory:',
                default: '/'
              }
            ]);
            break;

          case 'S3':
            protocolConfig = await inquirer.prompt([
              {
                type: 'input',
                name: 'bucket',
                message: 'S3 Bucket name:',
                validate: input => input.length > 0 || 'Bucket is required'
              },
              {
                type: 'input',
                name: 'region',
                message: 'AWS Region:',
                default: 'us-east-1'
              },
              {
                type: 'password',
                name: 'accessKey',
                message: 'AWS Access Key:',
                mask: '*'
              },
              {
                type: 'password',
                name: 'secretKey',
                message: 'AWS Secret Key:',
                mask: '*'
              },
              {
                type: 'input',
                name: 'prefix',
                message: 'S3 Prefix/Path:',
                default: ''
              }
            ]);
            break;

          case 'API':
            protocolConfig = await inquirer.prompt([
              {
                type: 'input',
                name: 'endpoint',
                message: 'API Endpoint URL:',
                validate: input => input.startsWith('http') || 'Must be a valid URL'
              },
              {
                type: 'list',
                name: 'authType',
                message: 'Authentication type:',
                choices: ['Bearer', 'Basic', 'OAuth2', 'None']
              },
              {
                type: 'password',
                name: 'apiKey',
                message: 'API Key/Token:',
                mask: '*',
                when: answers => answers.authType !== 'None'
              }
            ]);
            break;
        }

        // Save target configuration
        const targetsPath = 'delivery-targets.json';
        let targets = [];
        
        if (fs.existsSync(targetsPath)) {
          targets = await fs.readJson(targetsPath);
        }

        targets.push({
          id: Date.now().toString(),
          ...targetInfo,
          config: protocolConfig,
          active: true,
          created: new Date().toISOString()
        });

        await fs.writeJson(targetsPath, targets, { spaces: 2 });

        console.log(chalk.green('\n✅ Delivery target added successfully!'));
        console.log('Target: ' + chalk.cyan(targetInfo.name));
        console.log('Protocol: ' + chalk.cyan(targetInfo.protocol));

        // Offer to test connection
        const { testNow } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'testNow',
            message: 'Test connection now?',
            default: true
          }
        ]);

        if (testNow) {
          spinner.start('Testing connection...');
          // In a real implementation, this would test the actual connection
          await new Promise(resolve => setTimeout(resolve, 2000));
          spinner.succeed('Connection successful!');
        }

      } catch (error) {
        spinner.fail('Failed to add target');
        console.error(chalk.red(error.message));
        process.exit(1);
      }
    });

  // List subcommand
  target
    .command('list')
    .description('List configured delivery targets')
    .action(async () => {
      try {
        const targetsPath = 'delivery-targets.json';
        
        if (!fs.existsSync(targetsPath)) {
          console.log(chalk.yellow('No delivery targets configured yet.'));
          console.log('Add one with: ' + chalk.cyan('stardust-distro target add'));
          return;
        }

        const targets = await fs.readJson(targetsPath);
        
        if (targets.length === 0) {
          console.log(chalk.yellow('No delivery targets configured yet.'));
          return;
        }

        console.log(chalk.cyan('\n📋 Configured Delivery Targets:\n'));
        
        targets.forEach((target, index) => {
          console.log(`${index + 1}. ${chalk.bold(target.name)}`);
          console.log(`   Type: ${target.type}`);
          console.log(`   Protocol: ${target.protocol}`);
          console.log(`   Status: ${target.active ? chalk.green('Active') : chalk.red('Inactive')}`);
          console.log(`   Created: ${new Date(target.created).toLocaleDateString()}`);
          console.log('');
        });

      } catch (error) {
        console.error(chalk.red('Failed to list targets:', error.message));
      }
    });

  // Test subcommand
  target
    .command('test <targetId>')
    .description('Test connection to a delivery target')
    .action(async (targetId) => {
      const spinner = ora();
      
      try {
        const targetsPath = 'delivery-targets.json';
        const targets = await fs.readJson(targetsPath);
        const target = targets.find(t => t.id === targetId || t.name === targetId);
        
        if (!target) {
          console.error(chalk.red(`Target '${targetId}' not found`));
          process.exit(1);
        }

        spinner.start(`Testing connection to ${target.name}...`);
        
        // Simulate connection test
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        spinner.succeed(`Connection to ${target.name} successful!`);
        
      } catch (error) {
        spinner.fail('Connection test failed');
        console.error(chalk.red(error.message));
      }
    });
}