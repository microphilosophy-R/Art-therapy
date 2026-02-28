/**
 * Diagnostic script — tests the deleteAsset function.
 * 
 * Run: npx tsx tests/test-deletion.ts
 */
import fs from 'fs';
import path from 'path';
import { deleteAsset } from '../src/services/upload.service';

const log = (msg: string) => console.log(`[TestDeletion] ${msg}`);

async function runTest() {
    log('Starting file deletion test...');

    const uploadsDir = path.join(process.cwd(), 'uploads', 'test-delete');
    if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filename = `test-${Date.now()}.txt`;
    const filePath = path.join(uploadsDir, filename);
    fs.writeFileSync(filePath, 'test content');
    log(`Created test file: ${filePath}`);

    if (!fs.existsSync(filePath)) {
        console.error('FAIL: Test file was not created');
        process.exit(1);
    }

    // Simulate a URL
    const serverUrl = 'http://localhost:3001';
    const url = `${serverUrl}/uploads/test-delete/${filename}`;
    log(`Deleting via URL: ${url}`);

    await deleteAsset(url);

    if (fs.existsSync(filePath)) {
        console.error('FAIL: File still exists after deletion');
        process.exit(1);
    }

    log('PASS: File successfully deleted from local storage');

    // Cleanup test folder
    try {
        fs.rmdirSync(uploadsDir);
    } catch { }
}

runTest().catch(err => {
    console.error('Test failed with error:', err);
    process.exit(1);
});
