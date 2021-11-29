#!/usr/bin/env node
const yargs = require('yargs');
const argv = yargs
    .commandDir('cmds')
    .demandCommand()
    .strictCommands(true)
    .strictOptions(false)
    .demandCommand()
    .scriptName('mta')
    .help()
    .argv
