#!/usr/bin/env node
import * as path from "path";
import * as fs from "fs";

const yargs = require('yargs');

const configFile = process.env.ASCIINEMA_CONFIG_FILE || './config.sample.json'

// use default configuration from file
const defaultConfig = JSON.parse(fs.readFileSync(path.resolve(configFile), 'utf-8'))

const argv = yargs
    .commandDir('cmds')
    .config('c', function (configPath: string) {
        return JSON.parse(fs.readFileSync(path.resolve(configPath), 'utf-8'))
    })
    .config(defaultConfig)
    .demandCommand()
    .strictCommands(true)
    .strictOptions(false)
    .demandCommand()
    .scriptName('ascc')
    .help()
    .argv
