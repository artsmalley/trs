/**
 * Critical test: Do images work in File Search Stores?
 * Documentation says NO, but Files API supports images (undocumented)
 * Let's test if File Search Store also supports images (undocumented)
 */

import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

import { GoogleGenAI } from '@google/genai';
import { getOrCreateStore, uploadToStore, getStoreName } from '../lib/file-search-store';
import fs from 'fs';
import { createCanvas } from 'canvas';

async function testImageInStore() {
  console.log('='.repeat(60));
  console.log('TEST: Image Support in File Search Store');
  console.log('='.repeat(60));

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_AI_API_KEY! });

    // Step 1: Create a simple test image with text
    console.log('\n1. Creating test image with text...');

    // Create a simple image with Canvas (300x200 with text)
    const canvas = createCanvas(300, 200);
    const ctx = canvas.getContext('2d');

    // White background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, 300, 200);

    // Add text
    ctx.fillStyle = 'black';
    ctx.font = 'bold 24px Arial';
    ctx.fillText('Toyota Kaizen', 50, 60);
    ctx.font = '16px Arial';
    ctx.fillText('Continuous Improvement', 50, 90);
    ctx.fillText('改善 (Kaizen)', 50, 120);
    ctx.fillText('Quality First', 50, 150);

    const imageBuffer = canvas.toBuffer('image/png');
    console.log(`✓ Test image created (${imageBuffer.length} bytes)`);

    // Step 2: Try to upload image to File Search Store
    console.log('\n2. Attempting to upload image to File Search Store...');
    console.log('   (Documentation says images NOT supported, but testing anyway)');

    try {
      const doc = await uploadToStore(
        imageBuffer,
        'test-kaizen.png',
        'image/png',
        'Test Kaizen Image'
      );

      console.log('✅ IMAGE UPLOAD SUCCEEDED! (Undocumented feature!)');
      console.log(`   Document: ${doc.name}`);

      // Step 3: Try to query the image
      console.log('\n3. Testing query against image...');
      const storeName = await getStoreName();

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: 'What text is visible in the uploaded image?',
        config: {
          tools: [{
            fileSearch: {
              fileSearchStoreNames: [storeName],
            },
          }],
        },
      });

      console.log('\nQuery: "What text is visible in the uploaded image?"');
      console.log('\nResponse:');
      console.log(response.text);

      const grounding = response.candidates?.[0]?.groundingMetadata;
      if (grounding) {
        console.log('\n✓ Grounding metadata:');
        console.log(JSON.stringify(grounding, null, 2));
      }

      console.log('\n' + '='.repeat(60));
      console.log('✅ IMAGES WORK IN FILE SEARCH STORE! (Undocumented)');
      console.log('='.repeat(60));

    } catch (uploadError: any) {
      console.log('\n❌ Image upload FAILED');
      console.log('   Error:', uploadError.message);
      console.log('\n' + '='.repeat(60));
      console.log('CONCLUSION: Images NOT supported in File Search Store');
      console.log('='.repeat(60));
      console.log('\nStrategy: Use hybrid approach');
      console.log('  - Documents → File Search Store (semantic RAG)');
      console.log('  - Images → Files API (direct grounding, 48-hour expiry)');
    }

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    throw error;
  }
}

testImageInStore()
  .then(() => {
    console.log('\nTest completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nTest failed:', error);
    process.exit(1);
  });
