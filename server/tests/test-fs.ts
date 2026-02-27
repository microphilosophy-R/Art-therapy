import fs from 'fs';
import path from 'path';

async function testFileSystem() {
    console.log('--- Testing File System ---');
    const base = path.join(process.cwd(), 'uploads');
    const sub = 'plan-images';
    const dir = path.join(base, sub);

    try {
        if (!fs.existsSync(dir)) {
            console.log('Creating directory:', dir);
            fs.mkdirSync(dir, { recursive: true });
        }

        const testFile = path.join(dir, 'test-write.txt');
        console.log('Attempting to write:', testFile);
        await fs.promises.writeFile(testFile, 'test content');
        console.log('Successfully wrote test file.');

        const content = await fs.promises.readFile(testFile, 'utf8');
        console.log('Read back content:', content);

        // Clean up
        fs.unlinkSync(testFile);
        console.log('Successfully cleaned up test file.');
    } catch (err) {
        console.error('File system test FAILED:', err);
    }
}

testFileSystem();
