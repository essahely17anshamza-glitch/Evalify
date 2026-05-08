import archiver from 'archiver';
import fs from 'fs';
import path from 'path';

export const createTestZip = () => {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream('valid-test.zip');
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', function() {
      console.log(archive.pointer() + ' total bytes');
      console.log('archiver has been finalized and the output file descriptor has closed.');
      resolve();
    });

    archive.on('error', function(err) {
      reject(err);
    });

    archive.pipe(output);

    // append a string
    archive.append('function test() { console.log("hello"); }', { name: 'test.js' });
    archive.finalize();
  });
};
