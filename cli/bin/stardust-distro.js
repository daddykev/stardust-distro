#!/usr/bin/env node

import { program } from 'commander';
import chalk from 'chalk';
import figlet from 'figlet';
import { createCommand } from '../commands/create.js';
import { initCommand } from '../commands/init.js';
import { deployCommand } from '../commands/deploy.js';
import { configureCommand } from '../commands/configure.js';
import { targetCommand } from '../commands/target.js';
import { devCommand } from '../commands/dev.js';

console.log(
  chalk.cyan(
    figlet.textSync('Stardust Distro', { horizontalLayout: 'full' })
  )
);

program
  .name('stardust-distro')
  .description('CLI for creating and managing Stardust Distro distribution platforms')
  .version('0.9.5');

// Register commands
createCommand(program);
initCommand(program);
deployCommand(program);
configureCommand(program);
targetCommand(program);
devCommand(program);

program.parse(process.argv);