/* =====================================================
   CURRENCY CONVERTER
   HTML + CSS + VANILLA JAVASCRIPT
   ===================================================== */


/* =====================================================
   1. API CONFIGURATION
===================================================== */

const EXCHANGE_API = "https://open.er-api.com/v6/latest/";


/* =====================================================
   2. DOM ELEMENTS
===================================================== */

const amountInput = document.getElementById("amount");

const fromCurrency = document.getElementById("fromCurrency");
const toCurrency = document.getElementById("toCurrency");

const fromFlag = document.getElementById("fromFlag");
const toFlag = document.getElementById("toFlag");

const fromName = document.getElementById("fromName");
const toName = document.getElementById("toName");

const fromTrigger = document.getElementById("fromTrigger");
const toTrigger = document.getElementById("toTrigger");

const result = document.getElementById("result");

const exchangeRate = document.getElementById("exchangeRate");
const lastUpdated = document.getElementById("lastUpdated");

const swapBtn = document.getElementById("swapBtn");
const convertBtn = document.getElementById("convertBtn");
const convertText = document.getElementById("convertText");

const errorMessage = document.getElementById("errorMessage");

const currencyModal = document.getElementById("currencyModal");
const closeCurrencyModal =
    document.getElementById("closeCurrencyModal");

const currencySearch = document.getElementById("currencySearch");
const currencyListElement =
    document.getElementById("currencyList");


/* =====================================================
   3. APPLICATION VARIABLES
===================================================== */

let currencyList = [];

let currencyDetails = {};

const rateCache = new Map();

let activeCurrencyTarget = null;

let requestId = 0;

let conversionTimer = null;


/* =====================================================
   4. LOCAL COUNTRY INFORMATION
   No external country API required.
===================================================== */

const localCurrencyData = {

    INR: ["🇮🇳", "India"],
    USD: ["🇺🇸", "United States"],
    EUR: ["🇪🇺", "Eurozone"],
    GBP: ["🇬🇧", "United Kingdom"],
    JPY: ["🇯🇵", "Japan"],
    AUD: ["🇦🇺", "Australia"],
    CAD: ["🇨🇦", "Canada"],
    CHF: ["🇨🇭", "Switzerland"],
    CNY: ["🇨🇳", "China"],
    SGD: ["🇸🇬", "Singapore"],
    AED: ["🇦🇪", "United Arab Emirates"],
    SAR: ["🇸🇦", "Saudi Arabia"],
    NZD: ["🇳🇿", "New Zealand"],
    KRW: ["🇰🇷", "South Korea"],
    THB: ["🇹🇭", "Thailand"],
    MYR: ["🇲🇾", "Malaysia"],
    IDR: ["🇮🇩", "Indonesia"],
    PKR: ["🇵🇰", "Pakistan"],
    BDT: ["🇧🇩", "Bangladesh"],
    LKR: ["🇱🇰", "Sri Lanka"],
    NPR: ["🇳🇵", "Nepal"],
    RUB: ["🇷🇺", "Russia"],
    ZAR: ["🇿🇦", "South Africa"],
    BRL: ["🇧🇷", "Brazil"],
    MXN: ["🇲🇽", "Mexico"],
    TRY: ["🇹🇷", "Turkey"],
    SEK: ["🇸🇪", "Sweden"],
    NOK: ["🇳🇴", "Norway"],
    DKK: ["🇩🇰", "Denmark"],
    PLN: ["🇵🇱", "Poland"],
    HKD: ["🇭🇰", "Hong Kong"],
    QAR: ["🇶🇦", "Qatar"],
    KWD: ["🇰🇼", "Kuwait"],
    BHD: ["🇧🇭", "Bahrain"],
    OMR: ["🇴🇲", "Oman"],
    EGP: ["🇪🇬", "Egypt"],
    NGN: ["🇳🇬", "Nigeria"],
    KES: ["🇰🇪", "Kenya"],
    GHS: ["🇬🇭", "Ghana"],
    PHP: ["🇵🇭", "Philippines"],
    VND: ["🇻🇳", "Vietnam"],
    TWD: ["🇹🇼", "Taiwan"],
    ARS: ["🇦🇷", "Argentina"],
    CLP: ["🇨🇱", "Chile"],
    COP: ["🇨🇴", "Colombia"],
    UAH: ["🇺🇦", "Ukraine"],
    CZK: ["🇨🇿", "Czech Republic"],
    HUF: ["🇭🇺", "Hungary"],
    RON: ["🇷🇴", "Romania"],
    ISK: ["🇮🇸", "Iceland"]

};


/* =====================================================
   5. LOAD LOCAL COUNTRY INFORMATION
===================================================== */

function loadCountryInformation() {

    Object.entries(localCurrencyData).forEach(
        ([code, details]) => {

            currencyDetails[code] = {
                flag: details[0],
                country: details[1]
            };

        }
    );

}


/* =====================================================
   6. CURRENCY NAME FORMATTER
===================================================== */

const currencyNames = new Intl.DisplayNames(
    ["en"],
    {
        type: "currency"
    }
);


function getCurrencyName(code) {

    try {

        return currencyNames.of(code) || code;

    } catch {

        return code;

    }

}


/* =====================================================
   7. COUNTRY FLAG HELPER
===================================================== */

function getFlag(countryCode) {

    if (!countryCode || countryCode.length !== 2) {

        return "🌐";

    }

    return countryCode
        .toUpperCase()
        .split("")
        .map(char =>
            String.fromCodePoint(
                127397 + char.charCodeAt(0)
            )
        )
        .join("");

}


function getCurrencyFlag(code) {

    return currencyDetails[code]?.flag || "🌐";

}


/* =====================================================
   8. FETCH EXCHANGE RATES
===================================================== */

async function fetchExchangeRates(baseCurrency) {

    const cached = rateCache.get(baseCurrency);

    // Cache exchange rates for 10 minutes

    if (
        cached &&
        Date.now() - cached.fetchedAt < 10 * 60 * 1000
    ) {

        return cached;

    }

    const response = await fetch(
        `${EXCHANGE_API}${encodeURIComponent(baseCurrency)}`
    );

    if (!response.ok) {

        throw new Error(
            "Unable to connect to exchange rate server."
        );

    }

    const data = await response.json();

    if (
        data.result !== "success" ||
        !data.rates
    ) {

        throw new Error(
            "Exchange rate information is unavailable."
        );

    }

    const rateData = {

        rates: data.rates,

        updatedAt: data.time_last_update_unix,

        nextUpdate: data.time_next_update_unix,

        fetchedAt: Date.now()

    };

    rateCache.set(baseCurrency, rateData);

    return rateData;

}


/* =====================================================
   9. POPULATE CURRENCY LIST
===================================================== */

function populateCurrencies() {

    const initialData = rateCache.get("INR");

    if (!initialData) {

        throw new Error(
            "Currency information could not be loaded."
        );

    }

    currencyList = [
        ...new Set([
            ...Object.keys(initialData.rates),
            "INR"
        ])
    ].sort();

    fromCurrency.value = "INR";

    toCurrency.value = currencyList.includes("USD")
        ? "USD"
        : currencyList[0];

    updateCurrencyInformation();

}


/* =====================================================
   10. UPDATE SELECTED CURRENCY INFORMATION
===================================================== */

function updateCurrencyInformation() {

    const fromCode = fromCurrency.value;

    const toCode = toCurrency.value;

    fromFlag.textContent = getCurrencyFlag(fromCode);

    toFlag.textContent = getCurrencyFlag(toCode);

    fromName.textContent = getCurrencyName(fromCode);

    toName.textContent = getCurrencyName(toCode);

    fromTrigger.innerHTML = `
        ${fromCode}
        <span>⌄</span>
    `;

    toTrigger.innerHTML = `
        ${toCode}
        <span>⌄</span>
    `;

}


/* =====================================================
   11. FORMAT CURRENCY AMOUNT
===================================================== */

function formatAmount(value, currency) {

    try {

        return new Intl.NumberFormat("en-US", {

            style: "currency",

            currency: currency,

            maximumFractionDigits: 6

        }).format(value);

    } catch {

        return `${value.toFixed(4)} ${currency}`;

    }

}


/* =====================================================
   12. FORMAT EXCHANGE RATE
===================================================== */

function formatRate(value) {

    return new Intl.NumberFormat("en-US", {

        maximumFractionDigits: 8

    }).format(value);

}


/* =====================================================
   13. DISPLAY LAST UPDATED TIME
===================================================== */

function displayUpdateTime(timestamp) {

    if (!timestamp) {

        lastUpdated.textContent = "Unavailable";

        return;

    }

    const date = new Date(timestamp * 1000);

    lastUpdated.textContent = date.toLocaleString(
        "en-IN",
        {

            day: "2-digit",

            month: "short",

            year: "numeric",

            hour: "2-digit",

            minute: "2-digit"

        }
    );

}


/* =====================================================
   14. ERROR HANDLING
===================================================== */

function showError(message) {

    errorMessage.textContent = message;

    errorMessage.style.display = "block";

}


function clearError() {

    errorMessage.textContent = "";

    errorMessage.style.display = "none";

}


/* =====================================================
   15. LOADING STATE
===================================================== */

function setLoading(state) {

    convertBtn.disabled = state;

    convertText.textContent = state
        ? "Converting..."
        : "Convert Currency";

}


/* =====================================================
   16. MAIN CURRENCY CONVERSION
===================================================== */

async function convertCurrency() {

    const currentRequest = ++requestId;

    clearError();

    const amountText = amountInput.value.trim();

    const amount = Number(amountText);

    const fromCode = fromCurrency.value;

    const toCode = toCurrency.value;


    // Validate amount

    if (
        amountText === "" ||
        !Number.isFinite(amount) ||
        amount < 0
    ) {

        result.textContent = "--";

        exchangeRate.textContent = "--";

        lastUpdated.textContent = "Unavailable";

        showError(
            "Please enter a valid positive amount."
        );

        setLoading(false);

        return;

    }


    setLoading(true);

    try {

        const data = await fetchExchangeRates(fromCode);

        // Ignore outdated requests

        if (currentRequest !== requestId) return;


        const rate = data.rates[toCode];


        if (
            typeof rate !== "number" ||
            !Number.isFinite(rate)
        ) {

            throw new Error(
                "This currency pair is not supported."
            );

        }


        // Calculate converted amount

        const convertedAmount = amount * rate;


        if (!Number.isFinite(convertedAmount)) {

            throw new Error(
                "Converted amount is too large."
            );

        }


        // Display conversion result

        result.textContent = formatAmount(
            convertedAmount,
            toCode
        );


        // Display exchange rate

        exchangeRate.textContent =
            `1 ${fromCode} = ${formatRate(rate)} ${toCode}`;


        // Display update timestamp

        displayUpdateTime(data.updatedAt);


        updateCurrencyInformation();


    } catch (error) {

        if (currentRequest !== requestId) return;

        result.textContent = "--";

        exchangeRate.textContent = "--";

        lastUpdated.textContent = "Unavailable";

        showError(
            error.message ||
            "Something went wrong. Please try again."
        );

    } finally {

        if (currentRequest === requestId) {

            setLoading(false);

        }

    }

}


/* =====================================================
   17. OPEN CURRENCY SELECTOR
===================================================== */

function openCurrencyModal(target) {

    activeCurrencyTarget = target;

    currencyModal.classList.add("active");

    currencyModal.setAttribute(
        "aria-hidden",
        "false"
    );

    document.body.classList.add("modal-open");

    currencySearch.value = "";

    renderCurrencyOptions();

    setTimeout(() => {

        currencySearch.focus();

    }, 50);

}


/* =====================================================
   18. CLOSE CURRENCY SELECTOR
===================================================== */

function closeModal() {

    currencyModal.classList.remove("active");

    currencyModal.setAttribute(
        "aria-hidden",
        "true"
    );

    document.body.classList.remove("modal-open");

    activeCurrencyTarget = null;

}


/* =====================================================
   19. SEARCH AND DISPLAY CURRENCIES
===================================================== */

function renderCurrencyOptions() {

    const query = currencySearch.value
        .trim()
        .toLowerCase();


    const filteredCurrencies = currencyList.filter(code => {

        const name = getCurrencyName(code).toLowerCase();

        const country = (
            currencyDetails[code]?.country || ""
        ).toLowerCase();

        return (

            code.toLowerCase().includes(query) ||

            name.includes(query) ||

            country.includes(query)

        );

    });


    currencyListElement.innerHTML = "";


    if (filteredCurrencies.length === 0) {

        const emptyMessage = document.createElement("div");

        emptyMessage.className = "no-currency";

        emptyMessage.textContent =
            "No matching currency found.";

        currencyListElement.appendChild(emptyMessage);

        return;

    }


    const fragment = document.createDocumentFragment();


    filteredCurrencies.forEach(code => {

        const button = document.createElement("button");

        button.type = "button";

        button.className = "currency-option";


        // Country flag

        const flag = document.createElement("span");

        flag.className = "option-flag";

        flag.textContent = getCurrencyFlag(code);


        // Currency information

        const details = document.createElement("span");

        details.className = "option-details";


        const name = document.createElement("span");

        name.className = "option-name";

        name.textContent = getCurrencyName(code);


        const country = document.createElement("span");

        country.className = "option-country";

        country.textContent =
            currencyDetails[code]?.country ||
            "Multiple countries / territories";


        // Currency code

        const currencyCode = document.createElement("span");

        currencyCode.className = "option-code";

        currencyCode.textContent = code;


        details.append(name, country);

        button.append(flag, details, currencyCode);


        // Select currency

        button.addEventListener("click", () => {

            selectCurrency(code);

        });


        fragment.appendChild(button);

    });


    currencyListElement.appendChild(fragment);

}


/* =====================================================
   20. SELECT CURRENCY
===================================================== */

function selectCurrency(code) {

    if (activeCurrencyTarget === "from") {

        fromCurrency.value = code;

    }

    else if (activeCurrencyTarget === "to") {

        toCurrency.value = code;

    }


    updateCurrencyInformation();

    closeModal();

    convertCurrency();

}


/* =====================================================
   21. CURRENCY SELECTOR EVENTS
===================================================== */

fromTrigger.addEventListener("click", () => {

    openCurrencyModal("from");

});


toTrigger.addEventListener("click", () => {

    openCurrencyModal("to");

});


currencySearch.addEventListener("input", () => {

    renderCurrencyOptions();

});


closeCurrencyModal.addEventListener("click", () => {

    closeModal();

});


currencyModal.addEventListener("click", event => {

    if (event.target === currencyModal) {

        closeModal();

    }

});


document.addEventListener("keydown", event => {

    if (
        event.key === "Escape" &&
        currencyModal.classList.contains("active")
    ) {

        closeModal();

    }

});


/* =====================================================
   22. SWAP CURRENCIES
===================================================== */

swapBtn.addEventListener("click", () => {

    const previousFrom = fromCurrency.value;

    const previousTo = toCurrency.value;


    fromCurrency.value = previousTo;

    toCurrency.value = previousFrom;


    updateCurrencyInformation();

    convertCurrency();

});


/* =====================================================
   23. AUTOMATIC CONVERSION
===================================================== */

amountInput.addEventListener("input", () => {

    clearTimeout(conversionTimer);

    conversionTimer = setTimeout(() => {

        convertCurrency();

    }, 350);

});


/* =====================================================
   24. CONVERT BUTTON EVENT
===================================================== */

convertBtn.addEventListener("click", () => {

    clearTimeout(conversionTimer);

    convertCurrency();

});


/* =====================================================
   25. INITIALIZE APPLICATION
===================================================== */

async function initializeConverter() {

    try {

        setLoading(true);

        lastUpdated.textContent = "Loading...";


        // Load local country information

        loadCountryInformation();


        // Fetch initial exchange rates

        await fetchExchangeRates("INR");


        // Populate available currencies

        populateCurrencies();


        // Perform initial conversion

        await convertCurrency();


    } catch (error) {

        result.textContent = "--";

        exchangeRate.textContent = "--";

        lastUpdated.textContent = "Unavailable";

        showError(

            "Unable to load currencies. Please check your internet connection and refresh the page."

        );

    } finally {

        setLoading(false);

    }

}


/* =====================================================
   26. START APPLICATION
===================================================== */

initializeConverter();