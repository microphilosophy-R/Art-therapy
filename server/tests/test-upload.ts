import { uploadPlanImage } from './src/services/upload.service';
import fs from 'fs';
import path from 'path';

async function testUploadService() {
    console.log('--- Testing Upload Service ---');
    const dummyBuffer = Buffer.from('dummy image data');
    const testId = 'test-image-id';

    try {
        const url = await uploadPlanImage(dummyBuffer, testId);
        console.log('Upload service success! URL:', url);

        if (fs.existsSync(path.join(process.cwd(), 'debug.log'))) {
            console.log('debug.log was created.');
            const logContent = fs.readFileSync(path.join(process.cwd(), 'debug.log'), 'utf8');
            console.log('Log Content:\n', logContent);
        } else {
            console.log('debug.log was NOT created.');
        }
    } catch (err) {
        console.error('Upload service test FAILED:', err);
    }
}

testUploadService();
