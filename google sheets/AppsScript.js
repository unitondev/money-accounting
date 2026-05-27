/**
 * HOW TO DEPLOY (first time):
 * 1. In AppsScript Click "Deploy" in the upper right corner → "New deployment"
 * 2. Type: "Web app"
 * 3. Execute as: "Me"
 * 4. Who has access: "Anyone"
 * 5. Click "Deploy". After that step you have to authorize the access, click it.
 *      You will see a warning "Google hasn’t verified this app" - that's okay, Google warns that if you don't know the developer (yourself),
 *      you should be careful. Click Advanced and then "Go to ... (unsafe)". In the new popup select "Select all" checkbox to allow this code
 *      to manage your google sheets. "Connect to an external service" means that ExchangeRate-API, also should be selected. Click Continue.
 *
 * HOW TO REDEPLOY (after code changes):
 * 1. In AppsScript Click "Deploy" in the upper right corner → "Manage deployments"
 * 2. Click the pencil icon (Edit)
 * 3. Version → select "New version"
 * 4. Click "Deploy" → URL stays the same
 */


/**
 * Feel free to change your main currency. The entire transaction table will be filled in this currency.
 * All transactions in other currencies will be converted to your main currency using an exchange service. You will need to enter
 * the API key for this service yourself right below
 */
const mainCurrencyIsoCode = "EUR"
const mainCurrencyAppleWalletSymbol = "€"
// you have to create an account and receive free api key here https://www.exchangerate-api.com. Populate const apiKey with your key.
const apiKey = '<PASTE_YOUR_API_KEY>'

/**
 * Entry point for HTTP POST requests from your phone. Automatically called by Google when a POST request hits the Web App URL
 */
function doPost(e) {
    try {
        // if you wanna debug it - replace requestData on the row 47 with commented block below
        // const requestData = JSON.parse(`
        //   {
        //       "Action": "automated",
        //       "Merchant": "Lidl",
        //       "Card": "MasterCard Standard",
        //       "Amount": "3,49 €",
        //       "Date": "2027-01-01",
        //       "Name": "Lidl"
        //   }
        // `)

        const requestData = JSON.parse(e.postData.contents)

        switch (requestData.Action) {
            case "automated": {
                const category = getCategoryFromMerchant(requestData.Merchant)
                const { amount, currency } = parseMoney(requestData.Amount)
                const { convertedAmount, note } = convertToMainCurrency(amount, currency)

                appendRowInSheets(requestData.Date, category, convertedAmount, requestData.Merchant, note)
                break
            }
            case "manual": {
                const { convertedAmount, note } = convertToMainCurrency(requestData.Amount, requestData.Currency)

                appendRowInSheets(requestData.Date, requestData.CategoryId, convertedAmount, '', note)
                break
            }
            default:
                throw new Error("Unknown action: " + requestData.Action)
        }

        return ContentService.createTextOutput(JSON.stringify({ status: "ok" }))
            .setMimeType(ContentService.MimeType.JSON)

    } catch (exception) {
        return ContentService.createTextOutput(JSON.stringify({ error: true, status: "error", message: exception.message }))
            .setMimeType(ContentService.MimeType.JSON)
    }
}

/**
 * Append row with transaction data in sheets
 * @param date - YYYY-MM-DD, date of the transaction
 * @param category - a numeric representation of a category from an CATEGORY enum
 * @param convertedAmount - decimal number, transaction amount
 * @param merchant - string
 * @param note - optional, string
 */
function appendRowInSheets(date, category, convertedAmount, merchant, note) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("transactions")
    const lastFilledRow = sheet.getRange("A:A")
        .getValues()
        .filter(row => row[0] !== "")
        .length + 1

    sheet.getRange(lastFilledRow, 1).setValue(date)                             // A - date
    sheet.getRange(lastFilledRow, 2).setValue(category)                         // B - category_id
    sheet.getRange(lastFilledRow, 4).setValue(mainCurrencyAppleWalletSymbol)    // D - currency, always the main
    sheet.getRange(lastFilledRow, 5).setValue(convertedAmount)                  // E - amount, always in main currency
    sheet.getRange(lastFilledRow, 6).setValue(merchant)                         // F - merchant
    if (note) sheet.getRange(lastFilledRow, 7).setValue(note)                   // G - notes
}

/**
 * Parses string in format "<amount> <currency>", like "30,49 Br", "10 €" etc.
 * Supports decimal separators "." and "," and currency codes/symbols (EUR, USD, €, $, etc.).
 * @param input - string in format "<amount> <currency>"
 * @returns {{amount: null, currency: string}|{amount: null, currency: null}|{amount: null|number, currency: string}}
 * @remarks Output examples: "12.50 €" -> { amount: 12.5, currency: "€" }, "1 234,56 $" -> { amount: 1234.56, currency: "$" }
 */
function parseMoney(input) {
    if (!input || typeof input !== 'string') {
        return { amount: null, currency: null }
    }

    const normalized = input.replace(/\s+/g, ' ').trim()

    // extract the currency (letters or symbols)
    const currencyMatch = normalized.match(/([A-Z]{2,3}|[€$£¥₽₴₸₺zł]+)/i)
    const currency = currencyMatch ? currencyMatch[1] : null

    // extract the amount
    const numberMatch = normalized.match(/[\d\s.,]+/)
    if (!numberMatch) {
        return { amount: null, currency }
    }

    let numberStr = numberMatch[0]

    // remove spaces from the number (1,234.56)
    numberStr = numberStr.replace(/\s/g, '')

    // if both . and , are present → replace everything with . and consider . as a decimal
    if (numberStr.includes(',') && numberStr.includes('.')) {
        numberStr = numberStr.replace(/\./g, '').replace(',', '.')
    } else {
        // if it's just a comma, treat it as a decimal
        numberStr = numberStr.replace(',', '.');
    }

    const amount = Number(numberStr);

    return {
        amount: isNaN(amount) ? null : amount,
        currency,
    };
}


/**
 * MODULE TRANSACTION CATEGORIES
 */

const CATEGORY = {
    other: 0,
    renting: 1,
    communication: 2,
    food: 3,
    travel: 4,
    subscriptions: 5,
    health: 6,
    clothes: 7,
    hobby: 8,
    eatingOut: 9,
    transport: 10,
    toiletry: 11,
    entertainment: 12,
    house: 13,
}

/**
    Each mapping uses a regex with the i flag (case-insensitive), means the mapping is considered a match if the merchant name contains the specified text as a substring.
    Example: /bolt/i matches: Bolt and BOLT.EU and Bolt Food.
    Feel free to modify/delete predefined mappings below and add your own rows with { match: /<YOUR_KNOWN_MERCHANT>/i, category: CATEGORY.<DESIRED_CATEGORY> }
 */
const merchantToCategory = [
    { match: /radost/i, category: CATEGORY.communication },

    { match: /tesco/i, category: CATEGORY.food },
    { match: /yeme/i, category: CATEGORY.food },
    { match: /lidl/i, category: CATEGORY.food },
    { match: /carrefour/i, category: CATEGORY.food },
    { match: /billa/i, category: CATEGORY.food },
    { match: /Żabka/i, category: CATEGORY.food },
    { match: /dionis/i, category: CATEGORY.food },
    { match: /shop n 7 vesta/i, category: CATEGORY.food },
    { match: /evroopt/i, category: CATEGORY.food },
    { match: /sosedi/i, category: CATEGORY.food },

    { match: /bolt/i, category: CATEGORY.transport },
    { match: /flixbus/i, category: CATEGORY.transport },

    { match: /booking/i, category: CATEGORY.travel },
    { match: /ryanair/i, category: CATEGORY.travel },
    { match: /wizz air/i, category: CATEGORY.travel },

    { match: /Bershka/i, category: CATEGORY.clothes },
    { match: /PRIMARK/i, category: CATEGORY.clothes },
    { match: /hm/i, category: CATEGORY.clothes },
    { match: /zara/i, category: CATEGORY.clothes },
    { match: /reserved/i, category: CATEGORY.clothes },
]

/**
 * Parses merchantText to numeric representation of a category from an CATEGORY enum
 * @param merchantText
 * @returns {number|number}
 */
function getCategoryFromMerchant(merchantText) {
    if (!merchantText) {
        return CATEGORY.other
    }

    for (const { match, category } of merchantToCategory) {
        if (match.test(merchantText)) {
            return category
        }
    }

    return CATEGORY.other
}

/**
 * MODULE CURRENCY CONVERTER.
 * Uses free https://www.exchangerate-api.com. Docs: https://www.exchangerate-api.com/docs.
 */

/**
 * Parses currency from Apple Wallet to ISO representation
 * @param currencyFromAppleWallet - string from Apple Wallet
 * @returns {*|string} - ISO currency representation
 */
function getCurrencyISOCode(currencyFromAppleWallet) {
    const map = {
        "€": "EUR",
        "$": "USD",
        "£": "GBP",
        "Br": "BYN",
        "PLN": "PLN",
        "CZK": "CZK",
        "CHF": "CHF",
        "HUF": "HUF"
    }
    return map[currencyFromAppleWallet.trim()] || currencyFromAppleWallet.trim()
}

/**
 * Converts an amount from the provided currency to the main currency using ExchangeRate API. If the currency is already the main currency, returns the original amount without conversion.
 * @param transactionAmount - decimal number, transaction amount
 * @param currencyFromAppleWallet - string from Apple Wallet
 * @returns {{convertedAmount: number, note: string}|{convertedAmount: *, note: null}}
 * @remarks Output examples: convertToMainCurrency(10, "$") -> { convertedAmount: 8.74, note: "10 USD (rate: 1 USD = 0.87 EUR)" }
 */
function convertToMainCurrency(transactionAmount, currencyFromAppleWallet) {
    const currencyIsoCode = getCurrencyISOCode(currencyFromAppleWallet)

    if (currencyIsoCode === mainCurrencyIsoCode){
        return { convertedAmount: transactionAmount, note: null }
    }

    const exchangerUrl = `https://v6.exchangerate-api.com/v6/${apiKey}/pair/${currencyIsoCode}/${mainCurrencyIsoCode}/${transactionAmount}`
    const response = UrlFetchApp.fetch(exchangerUrl)
    const exchangerResponse = JSON.parse(response.getContentText())

    if (exchangerResponse.result !== "success") {
        throw new Error(`Exchange rate API error: ${exchangerResponse["error-type"] || "unknown"}`)
    }

    const convertedAmount = Math.round(exchangerResponse.conversion_result * 100) / 100
    return {
        convertedAmount,
        note: `${transactionAmount} ${currencyFromAppleWallet} (rate: 1 ${currencyIsoCode} = ${exchangerResponse.conversion_rate.toFixed(2)} ${mainCurrencyIsoCode})`
    }
}

