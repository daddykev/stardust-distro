// cli/commands/dev.js
import chalk from 'chalk';
import { spawn } from 'child_process';
import fs from 'fs-extra';

export function devCommand(program) {
  program
    .command('dev')
    .description('Start development server')
    .option('--port <port>', 'Development server port', '5173')
    .option('--emulators', 'Start Firebase emulators')
    .action(async (options) => {
      try {
        if (!fs.existsSync('package.json')) {
          console.error(chalk.red('❌ Not in a Stardust Distro project directory'));
          process.exit(1);
        }

        console.log(chalk.cyan('🚀 Starting Stardust Distro development server\n'));

        // Start Firebase emulators if requested
        if (options.emulators) {
          console.log(chalk.yellow('Starting Firebase emulators...'));
          spawn('firebase', ['emulators:start'], {
            stdio: 'inherit',
            shell: true
          });
          
          // Wait a bit for emulators to start
          await new Promise(resolve => setTimeout(resolve, 3000));
        }

        // Start Vite dev server
        console.log(chalk.green(`Starting dev server on port ${options.port}...`));
        const vite = spawn('npm', ['run', 'dev', '--', '--port', options.port], {
          stdio: 'inherit',
          shell: true
        });

        vite.on('close', (code) => {
          if (code !== 0) {
            console.error(chalk.red(`Dev server exited with code ${code}`));
          }
        });

      } catch (error) {
        console.error(chalk.red('Failed to start development server:', error.message));
        process.exit(1);
      }
    });
}