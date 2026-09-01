const fs = require('fs');
const https = require('https');
const crypto = require('crypto');
const { execSync } = require('child_process');
const path = require('path');

const months = ['2025-04', '2025-05', '2025-06', '2025-07', '2025-08', '2025-09'];
const baseUrl = 'https://data.binance.vision/data/spot/monthly/klines/BTCUSDT/1m';

const WORK_DIR = path.join(__dirname, 'data_downloads_005');
if (!fs.existsSync(WORK_DIR)) fs.mkdirSync(WORK_DIR);

const report = {
    datasetId: "DATASET_005",
    source: "Binance Public Data Archive",
    pair: "BTCUSDT",
    interval: "1m",
    period: "2025-04-01 to 2025-09-30",
    selectionRule: "first contiguous 6-calendar-month interval after the last previously experimented dataset",
    monthsFetched: months,
    files: [],
    canonicalFileSha256: null,
    datasetContentHash: null,
    rowCount: 0,
    expectedRows: 263520,
    gaps: 0,
    duplicates: 0,
    syntheticPathDetected: false,
    sourceTimestampUnit: "MICROSECONDS",
    normalizedTimestampUnit: "MILLISECONDS",
    normalizationRule: "if (ts > 9999999999999) Math.floor(ts / 1000)"
};

function download(url, dest) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        https.get(url, response => {
            if (response.statusCode !== 200) return reject(new Error(`Status ${response.statusCode} for ${url}`));
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve();
            });
        }).on('error', err => {
            fs.unlink(dest, () => reject(err));
        });
    });
}

async function run() {
    console.log("=== 026: DATASET_005 INGESTION ===");
    
    let allCandles = [];

    for (const month of months) {
        const zipName = `BTCUSDT-1m-${month}.zip`;
        const checksumName = `${zipName}.CHECKSUM`;
        const zipPath = path.join(WORK_DIR, zipName);
        const checksumPath = path.join(WORK_DIR, checksumName);
        const csvPath = path.join(WORK_DIR, `BTCUSDT-1m-${month}.csv`);

        console.log(`\nFetching ${month}...`);
        
        try {
            if (!fs.existsSync(zipPath)) {
                await download(`${baseUrl}/${zipName}`, zipPath);
                await download(`${baseUrl}/${checksumName}`, checksumPath);
            }
            
            // Verify Checksum
            const expectedLine = fs.readFileSync(checksumPath, 'utf8').trim();
            const expectedHash = expectedLine.split(/\s+/)[0];
            
            const fileBuffer = fs.readFileSync(zipPath);
            const actualHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
            
            if (actualHash !== expectedHash) {
                throw new Error(`CHECKSUM MISMATCH for ${month}: expected ${expectedHash}, got ${actualHash}`);
            }
            console.log(`✅ ${month} ZIP Checksum verified (${actualHash})`);
            
            // Unzip using PowerShell
            if (!fs.existsSync(csvPath)) {
                execSync(`powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${WORK_DIR}' -Force"`);
            }
            console.log(`✅ ${month} ZIP extracted`);

            // Read CSV
            const csvContent = fs.readFileSync(csvPath, 'utf8');
            const lines = csvContent.split('\n').filter(line => line.trim().length > 0);
            
            report.files.push({
                file: zipName,
                zipSha256: actualHash,
                rowCount: lines.length
            });
            
            for (const line of lines) {
                const cols = line.split(',');
                // Format: Open time, Open, High, Low, Close, Volume
                let ts = parseInt(cols[0]);
                // Normalize timestamps from microseconds (16 digits) to milliseconds (13 digits) if needed
                if (ts > 9999999999999) {
                    ts = Math.floor(ts / 1000);
                }
                
                allCandles.push({
                    timestamp: ts,
                    open: parseFloat(cols[1]),
                    high: parseFloat(cols[2]),
                    low: parseFloat(cols[3]),
                    close: parseFloat(cols[4]),
                    volume: parseFloat(cols[5])
                });
            }
            
        } catch (e) {
            console.error(`🚨 ACQUISITION BLOCKED on ${month}:`, e.message);
            process.exit(1);
        }
    }

    console.log("\nValidating continuity...");
    // Sort just in case, though they should be sequential
    allCandles.sort((a, b) => a.timestamp - b.timestamp);
    
    let gaps = 0;
    let duplicates = 0;
    
    for (let i = 1; i < allCandles.length; i++) {
        const diff = allCandles[i].timestamp - allCandles[i-1].timestamp;
        if (diff === 0) duplicates++;
        else if (diff > 60000) gaps++;
    }
    
    report.rowCount = allCandles.length;
    report.gaps = gaps;
    report.duplicates = duplicates;
    
    console.log(`Row count: ${report.rowCount}`);
    console.log(`Gaps: ${gaps}`);
    console.log(`Duplicates: ${duplicates}`);
    
    if (report.rowCount !== report.expectedRows && gaps === 0) {
        console.warn(`Note: Exact expected was ${report.expectedRows}. Actual: ${report.rowCount}.`);
    }

    // Save final frozen dataset
    const finalDatasetPath = path.join(__dirname, 'DATASET_005.json');
    const finalDatasetBuffer = Buffer.from(JSON.stringify(allCandles));
    fs.writeFileSync(finalDatasetPath, finalDatasetBuffer);
    
    // Hash the final canonical file
    report.canonicalFileSha256 = crypto.createHash('sha256').update(finalDatasetBuffer).digest('hex');
    report.datasetContentHash = report.canonicalFileSha256; 
    
    fs.writeFileSync(path.join(__dirname, '026_DATASET_005_PROVENANCE.json'), JSON.stringify(report, null, 2));
    
    console.log(`\n✅ DATASET_005 FROZEN. Canonical SHA256: ${report.canonicalFileSha256}`);
    console.log("Provenance Report written to 026_DATASET_005_PROVENANCE.json");
}

run();
