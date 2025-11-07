import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';

async function checkSpacesFiles() {
  console.log('🔍 Checking files in DigitalOcean Spaces...');

  const s3Client = new S3Client({
    region: 'sfo3',
    endpoint: 'https://sfo3.digitaloceanspaces.com',
    credentials: {
      accessKeyId: 'DO002UXFZ74XBDVPVJJC',
      secretAccessKey: 'GnqIjCjypNgL9ozPKe/TNwGBPtFkPTt0qq1EzJ/ttcM',
    },
    forcePathStyle: false,
  });

  try {
    const bucket = 'whatsais3';

    // List all objects in the bucket
    const command = new ListObjectsV2Command({
      Bucket: bucket,
      MaxKeys: 1000, // Limit to 1000 files for now
    });

    const response = await s3Client.send(command);

    if (!response.Contents) {
      console.log('📁 No files found in Spaces');
      return;
    }

    console.log(`📁 Found ${response.Contents.length} files in Spaces:`);
    console.log('─'.repeat(80));

    // Group files by type and show details
    const filesByType: Record<string, any[]> = {};

    for (const obj of response.Contents) {
      if (!obj.Key) continue;

      const key = obj.Key;
      const size = obj.Size || 0;
      const lastModified = obj.LastModified;

      // Extract file type from path
      const pathParts = key.split('/');
      const fileType = pathParts[0]; // 'incoming', 'conversations', etc.

      if (!filesByType[fileType]) {
        filesByType[fileType] = [];
      }

      filesByType[fileType].push({
        key,
        size,
        lastModified,
        extension: key.split('.').pop()?.toLowerCase() || 'no-ext'
      });
    }

    // Display summary by type
    for (const [type, files] of Object.entries(filesByType)) {
      console.log(`\n📂 ${type.toUpperCase()} (${files.length} files):`);

      // Show first 10 files as examples
      const sampleFiles = files.slice(0, 10);
      for (const file of sampleFiles) {
        const sizeKB = (file.size / 1024).toFixed(1);
        console.log(`  📄 ${file.key} (${sizeKB}KB, .${file.extension})`);
      }

      if (files.length > 10) {
        console.log(`  ... and ${files.length - 10} more files`);
      }

      // Show extension distribution
      const extensions = files.reduce((acc: { [key: string]: number }, file) => {
        acc[file.extension] = (acc[file.extension] || 0) + 1;
        return acc;
      }, {});

      console.log(`  📊 Extensions: ${Object.entries(extensions).map(([ext, count]) => `${ext}: ${count}`).join(', ')}`);
    }

    console.log('\n─'.repeat(80));
    console.log('✅ Spaces check completed');

  } catch (error) {
    console.error('❌ Error checking Spaces files:', error);
    process.exit(1);
  }
}

checkSpacesFiles();