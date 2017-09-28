"use strict";
const _ = require('lodash')

const request = require('request-promise-native')

const GET_LIST_SYMBOL_PATH =  'symbols'
const GET_ORDERBOOK_PATH = 'orderbook'

/** Call hitbtc API
 *
 * @param {string} path - the path to call
 */
const callHitBtcAPI = (path) => {
    const options = {
        json: true,
        resolveWithFullResponse: true
    }

    return request(`http://api.hitbtc.com/api/1/public/${path}`, options)
        .then(response => response.body)
}

/**
 * Get all symbols available on hitbtc
 * @returns {Promise.<*>}
 */
const getListSymbols = async () => {
    const symb = await callHitBtcAPI(GET_LIST_SYMBOL_PATH)
    return symb.symbols

}

/**
 * Get orderBook for a given symbol
 * @param symbol
 * @returns {Promise.<*>}
 */
const getOrderBook = async (symbol) => {
    return await callHitBtcAPI(`${symbol}/${GET_ORDERBOOK_PATH}`)
}

const getTickers = async () => {
    return await callHitBtcAPI('ticker')
}


const getTicker = async (symbol) => {
    return await callHitBtcAPI(`${symbol}/ticker`)
}

/**
 * Get the margin order by desc order.
 * We return information about the coin too
 * The margin will be calculated in dollar, using the actual rate for conversion BTC/$/EUR
 *
 * @returns {Promise.<void>}
 */
const getBestMargin = async () => {

    const _symbols = await getListSymbols()
    const symbols = _symbols.filter(symbolInfo => symbolInfo.currency === 'ETH' || symbolInfo.currency === 'BTC')

    const references = ['ETHUSD','BTCUSD']
    const promises = references.map(symbol => {
        return getTicker(symbol)
    })

    const referencesTickers = await Promise.all(promises)

    const referencesInfo = {
        ETH: referencesTickers[0],
        BTC: referencesTickers[1],
    }

    const tickers = await getTickers()
    const result1 = symbols.map(symbolInfo => {
        symbolInfo.ticker = tickers[symbolInfo.symbol]
        symbolInfo.marginCommodity = symbolInfo.ticker.ask - symbolInfo.ticker.bid
        symbolInfo.marginDollar = symbolInfo.marginCommodity * referencesInfo[symbolInfo.currency].ask
        return {
            commodity: symbolInfo.commodity,
            marginDollar: symbolInfo.marginCommodity * referencesInfo[symbolInfo.currency].ask,
            currency: symbolInfo.currency,
            ticker: symbolInfo.ticker
        }
    })

    const resultF = _.chain(result1)
                     .filter(result => result.ticker.volume_quote > 20)
                     .orderBy(['marginDollar'], ['desc'])
                     .value()

    return resultF.slice(0,15)
}

getBestMargin()
    .then(result => {
        console.log('result', result)
    })
