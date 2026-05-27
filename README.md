# money-accounting

Automation of personal finance tracking in Google Sheets for payments made with Apple Pay on iPhone and with MacroDroid on Android.

# How to
1. [Google sheets and Apps Script](#google-sheets-and-apps-script)
2. [iPhone automation](#iphone-automation)
3. [Android automation](#android-automation)
3. [Test](#test)


## Google sheets and Apps Script

### Clone sheet itself
1. Clone a google sheet from a template: https://docs.google.com/spreadsheets/d/1K96dyVXxUInrtllMn4a_tWEhk6XtmI3orte98v8YY6Q (file > make a copy)
2. Open your clones sheet, go to Extensions > Apps Script
3. Delete all predefined code and paste the code from [AppsScript.js](./google%20sheets/AppsScript.js)

### Configure AppsScript code
The entire transaction sheet will be filled in a single currency, and you need to select that currency. All transactions in other currencies will be converted to your main currency using an exchange service. You will need to obtain the API key for this service (free)

1. To enable currency conversion, you must register at [ExchangeRate-API](https://www.exchangerate-api.com/) and obtain a free API key. The API key must be inserted into the `const apiKey` on line 28 of the code in Apps Script.
2. You must also select the currency in which the table will be populated:
    1. If your desired currency is EUR - skip this step, as the code is configured to use EUR by default.
    2. Otherwise, update the `const mainCurrencyIsoCode` (line 25) and `const mainCurrencyAppleWalletSymbol` (line 26) with your desired currency.\
       `mainCurrencyIsoCode` must contain a three-letter currency code. Find your currency [here](https://www.exchangerate-api.com/docs/supported-currencies) and copy its Currency Code. Examples: `BYN, PLN, CZK, EUR, USD`.\
       `mainCurrencyAppleWalletSymbol` must contain a symbol for your currency from Apple Wallet. Known symbols: `for BYN paste Br, for zl paste PLN, for CZK paste CZK, for EUR paste €, for USD paste $`.
3. Transaction categories are assigned automatically in the AppsScript based on mapping of the merchant name (the store that accepts the payment) received from Apple Pay transactions. And you need to configure that mapping - adjust `const merchantToCategory` (line 172-198).\
   Each mapping uses a regex with the i flag, which makes matching case-insensitive, means the mapping is considered a match if the merchant name contains the specified text as a substring. Examples could be found in the code
4. Deploy that AppsScript:
    - In AppsScript Click "Deploy" in the upper right corner → "New deployment"
    - Select Type: "Web app"
    - Execute as: "Me"
    - Who has access: "Anyone"
    - Click "Deploy". After that step you have to authorize the access, click it. You will see a warning "Google hasn’t verified this app" - that's okay, Google warns that if you don't know the developer (yourself), you should be careful. Click Advanced and then "Go to ... (unsafe)". In the new popup select "Select all" checkbox to allow this code to manage your google sheets. "Connect to an external service" means that ExchangeRate-API, also should be selected. Click Continue.
    - After successful deployment you will see Web app URl (never changes). Copy it, you need it for the next section with phone automatization.


## iPhone automation
1. There are 2 shortcuts for your iPhone: 
    1) automated - triggered when you tap your phone against a payment terminal and pay using Apple Pay. 
    2) manual - triggered manually by you and is used for all cases where you pay without tapping your phone against a terminal (online payments via Apple Pay, money transfers in internet banking, payments via card number etc.).
2. for manual - add [shortcut](./shortcuts%20for%20iPhone/Transaction%20Input%20Sample.shortcut) (shortcuts/Transaction Input Sample.shortcut) on your iPhone in Shortcuts app.
    1. Paste URL from deployed Apps Script here in `Get contents of` (see the screenshot in the spoiler below): 
<details>
   <summary>Spoiler with screenshot</summary>

![IMG_1298.PNG](screenshots%20for%20README/IMG_1298.PNG)

</details>

3. for automated - Apple doesn't allow adding this shortcut for automation. You need to create it manually based on the screenshots below.
    1. in Shortcuts app go to `Automation` tab, click + in the right top corner
    2. search for `Wallet` option. Select which bank cards will be automated. Check all categories. Select `Run Immediately`, `Notify When Run` should be disabled.
    3. Click `Create New Shortcut`
    4. Make a shortcut based on the screenshots from the spoiler below. Don't forget to paste URL from deployed Apps Script in the same `Get contents of` field

<details>
   <summary>Spoiler with screenshots</summary>

![IMG_1299.PNG](screenshots%20for%20README/IMG_1299.PNG)
![IMG_1300.PNG](screenshots%20for%20README/IMG_1300.PNG)
![IMG_1301.PNG](screenshots%20for%20README/IMG_1301.PNG)

</details>

## Android automation
TBD

## Test
Run manual shortcut you created in the previous step. Input values. When the shortcut is complete, check the notification: if everything went well, you’ll see `Transaction call succeeded`. Congratulations, the row with transaction has been added to your Google Sheets. \
The automated shortcut can only be tested when paying with Apple Pay via a terminal.
