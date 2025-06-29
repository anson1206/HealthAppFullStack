export function processActiveEnergyData(xmlDoc) {
    const xpath = "//Record[@type='HKQuantityTypeIdentifierActiveEnergyBurned']";
    const results = xmlDoc.evaluate(
        xpath, 
        xmlDoc, 
        null, 
        XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, 
        null
    );
    const energyData = [];
    for (let i = 0; i < results.snapshotLength; i++) {
        const record = results.snapshotItem(i);
        energyData.push({
            energy: record.getAttribute("value"),
            date: record.getAttribute("startDate")
        });
    }
    return energyData;
}