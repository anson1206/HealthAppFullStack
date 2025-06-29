export function processHeartRateData(xmlDoc) {
    const xpath = "//Record[@type='HKQuantityTypeIdentifierHeartRate']";
    const results = xmlDoc.evaluate(
        xpath,
        xmlDoc,
        null,
        XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
        null
    );
    const heartRates = [];
    for (let i = 0; i < results.snapshotLength; i++) {
        const record = results.snapshotItem(i);
        heartRates.push({
            heartRate: record.getAttribute("value"),
            date: record.getAttribute("startDate"),
        });
    }
    return heartRates;
}