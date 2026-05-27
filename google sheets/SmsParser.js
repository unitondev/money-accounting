/**
 * Parses raw bank SMS text and extracts transaction data. This parser must be implemented manually because every bank sends SMS messages
 * in a different format. Adjust the parsing logic according to your bank SMS structure
 * @param smsBody
 * @returns {{amount: number, currency: *, date: *, merchant: string}}
 * @remarks Expected return format:
 * Example:
 * {
 *  amount: 2.15,
 *  currency: "EUR",
 *  date: "16/03/2026",
 *  merchant: "Lidl"
 * }
 */
function parseSmsBody(smsBody) {
    const amount = ''
    const currency = ''
    const dateParsed = ''
    const merchant = ''

    return { amount, currency, date: dateParsed, merchant }
}