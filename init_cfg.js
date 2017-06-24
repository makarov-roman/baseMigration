#!/bin/env node

const inquirer = require('inquirer')
const fs = require('fs')
const path = require('path')
const mysql = require('promise-mysql')

const CONFIG_FILENAME = 'db_config.js'
const CONFIG_PATH = path.resolve(__dirname, CONFIG_FILENAME)


if (!process.version.includes('v7') && !process.version.includes('v8')) {
  console.log('Required node v7 or better')
  process.abort()
}

if (fs.existsSync(CONFIG_PATH)) {
  fs.unlinkSync(CONFIG_PATH)
}

createConfig()

async function createConfig() {
  try {
    const data = await getUserData()

    console.log('Trying to connect to db')
    const connection = await mysql.createConnection(data)
    console.log('Connection successful')

    console.log('Check if users exists')
    const users = await connection.query('SELECT * FROM users LIMIT 1')
    if (users.length === 0) {
      throw new Error('Cannot find any users')
    } else {
      console.log('Users found. DB is correct')
    }

    fs.writeFileSync(CONFIG_PATH, 'module.exports=' + JSON.stringify(data))
    console.log(`Config file ${CONFIG_FILENAME} successfully created`)

    process.exit(1)
  }
  catch (e) {
    console.log(e)
    console.log('aborting')
    process.abort()
  }
}

function getUserData() {
  return inquirer.prompt([
    {type: 'input', name: 'user', message: 'User login'},
    {type: 'password', name: 'password', message: 'User password'},
    {type: 'input', name: 'database', message: 'Database name'},
    {type: 'input', name: 'host', message: 'Host'}
  ])
}