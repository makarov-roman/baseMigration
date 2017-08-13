#!/usr/bin/env node

const mysql = require('promise-mysql')
const config = require('./db_config')
const moment = require('moment')
const fs = require('fs')
const Jetty = require('jetty')
const jetty = new Jetty(process.stdout)
jetty.clear()

const RESULT_FILENAME = 'result.json'

async function main() {
  const finalStructure = []
  const fresh = []
  try {
    var connection = await mysql.createConnection(config)
    const results = await getResults()
    var counter = 0
    const limit = process.argv[2] || false
    for (let result of results) {
      const parsedQuery = {
        ylinks: [],
        glinks: []
      }

      parsedQuery.rep = result.ball
      parsedQuery.stress = result.stress_ball
      const date = new Date(result.updated_at)
      parsedQuery.date = `${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}`


      const query = await getQueryByID(result.query_id)
      parsedQuery.text = query.name
      parsedQuery.color = query.color
      const owner = await getUserByID(query.user_id)
      parsedQuery.owner = owner.email

      const region = await getRegionByID(query.region_id)
      parsedQuery.region = region.id

      var ycover = 0
      var gcover = 0

      const positions = await getPositionsByID(result.id)
      for (let position of positions) {
        if (position.site_stats_id) {
          var siteStats = await getSiteStatsByID(position.site_stats_id)
        }
        const link = {
          link: position.url,
          ton: mapTons(position.tonality),
        }
        const coverage = siteStats && siteStats.visits || undefined
        if (typeof coverage !== 'undefined') {
          link.cover = coverage
        }
        if (position.system === 'ya') {
          if (coverage) {
            ycover += coverage
          }
          parsedQuery.ylinks.push(link)
        }
        if (position.system === 'google') {
          if (coverage) {
            gcover += coverage
          }
          parsedQuery.glinks.push(link)
        }
      }

      parsedQuery.ycover = ycover
      parsedQuery.gcover = gcover

      counter++
      jetty.clearLine()
      jetty.moveTo([0, 0])
      jetty.text('Work in progress - ' + (counter / results.length * 100).toFixed(2) + '%')
      if (moment(date).isSame(Date.now(), 'day')) {
        fresh.push(parsedQuery)
      } else {
        finalStructure.push(parsedQuery)
      }
      if (limit && counter >= limit) break
    }
    fs.writeFileSync(RESULT_FILENAME, JSON.stringify({
      fresh,
      old: finalStructure
    }))
    console.log('done')
    process.exit(1)
  }
  catch (e) {
    console.log(e)
    process.abort()
  }

  async function getPositionsByID(resultID) {
    return await connection.query('SELECT * FROM positions WHERE `result_id`=' + resultID)
  }

  async function getResults() {
    return await connection.query('SELECT * FROM results')
  }

  async function getQueryByID(id) {
    const result = await connection.query('SELECT * FROM queries WHERE `id`=' + id)
    return result[0]
  }

  async function getUserByID(id) {
    const result = await connection.query('SELECT * FROM users WHERE `id`=' + id)
    return result[0]
  }

  async function getRegionByID(id) {
    const result = await connection.query('SELECT * FROM regions WHERE `id`=' + id)
    return result[0]
  }

  async function getSiteStatsByID(id) {
    const result = await connection.query('SELECT * FROM site_stats WHERE `id`=' + id)
    return result[0]
  }
}

function mapTons(ton) {
  const mapper = {
    owner: 'sobst',
    neutral: 'neit',
    positive: 'pos',
    negative: 'neg'
  }
  if (!mapper.hasOwnProperty(ton)) return ton
  return mapper[ton]
}

main()
