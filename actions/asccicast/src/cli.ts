#!/usr/bin/env node
import * as path from "path";
import * as fs from "fs";

const yargs = require('yargs');

const argv = yargs
    .commandDir('cmds')
    .config('c', function (configPath: string) {
        return JSON.parse(fs.readFileSync(path.resolve(configPath), 'utf-8'))
    })
    .demandCommand()
    .strictCommands(true)
    .strictOptions(false)
    .demandCommand()
    .scriptName('ascc')
    .help()
    .argv
